"use client";

import { ChangeEvent, DragEvent, FormEvent, useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, CalendarClock, ImagePlus, Send, Trash2, Upload, Video } from "lucide-react";
import { InstagramPreview, type PreviewMedia } from "@/components/instagram-preview";
import { useCreatePost } from "@/hooks/usePosts";
import { formatToWIB } from "@/lib/timezone";
import { DateTimePicker } from "@/components/ui/date-time-picker";

type MediaType = "IMAGE" | "CAROUSEL" | "REELS";
type PublishMode = "NOW" | "SCHEDULE";

type SelectedMedia = {
  id: string;
  file: File;
  previewUrl: string;
  duration?: number;
  width?: number;
  height?: number;
  aspectRatio?: number;
  validationError?: string;
};

const modes: Array<{ value: MediaType; label: string; description: string }> = [
  { value: "IMAGE", label: "Single Image", description: "1 gambar" },
  { value: "CAROUSEL", label: "Carousel", description: "2-10 gambar" },
  { value: "REELS", label: "Reels", description: "1 video MP4/MOV" }
];

const MIN_IMAGE_ASPECT_RATIO = 4 / 5;
const MAX_IMAGE_ASPECT_RATIO = 1.91;

type Props = {
  defaultScheduledAt?: string;
  defaultCaption?: string;
  defaultMediaType?: MediaType;
  onSuccess?: () => void;
  onDirtyChange?: (dirty: boolean) => void;
};

function revokePreviews(items: SelectedMedia[]) {
  items.forEach((item) => URL.revokeObjectURL(item.previewUrl));
}

export function ComposeForm({ defaultScheduledAt, defaultCaption = "", defaultMediaType = "IMAGE", onSuccess, onDirtyChange }: Props = {}) {
  const [mediaType, setMediaType] = useState<MediaType>(defaultMediaType);
  const [caption, setCaption] = useState(defaultCaption);
  const [publishMode, setPublishMode] = useState<PublishMode>(defaultScheduledAt ? "SCHEDULE" : "NOW");
  const [scheduledAt, setScheduledAt] = useState(defaultScheduledAt ?? "");
  const [message, setMessage] = useState("");
  const [media, setMedia] = useState<SelectedMedia[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [instagramUsername, setInstagramUsername] = useState<string | null>(null);
  const createPost = useCreatePost();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRef = useRef<SelectedMedia[]>([]);

  useEffect(() => {
    mediaRef.current = media;
  }, [media]);

  useEffect(() => {
    onDirtyChange?.(Boolean(caption || media.length || scheduledAt !== (defaultScheduledAt ?? "")));
  }, [caption, defaultScheduledAt, media.length, onDirtyChange, scheduledAt]);

  useEffect(() => {
    return () => revokePreviews(mediaRef.current);
  }, []);

  useEffect(() => {
    let active = true;
    fetch("/api/settings")
      .then((response) => response.ok ? response.json() : null)
      .then((data: { username?: string | null } | null) => {
        if (active) setInstagramUsername(data?.username ?? null);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  function resetMedia(nextType: MediaType) {
    revokePreviews(media);
    setMedia([]);
    setMessage("");
    setMediaType(nextType);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function readVideoDuration(file: File) {
    return new Promise<number>((resolve) => {
      const url = URL.createObjectURL(file);
      const video = document.createElement("video");
      video.preload = "metadata";
      video.onloadedmetadata = () => {
        URL.revokeObjectURL(url);
        resolve(video.duration);
      };
      video.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(0);
      };
      video.src = url;
    });
  }

  async function readImageDimensions(file: File) {
    return new Promise<{ width: number; height: number }>((resolve) => {
      const url = URL.createObjectURL(file);
      const image = new Image();
      image.onload = () => {
        URL.revokeObjectURL(url);
        resolve({ width: image.naturalWidth, height: image.naturalHeight });
      };
      image.onerror = () => {
        URL.revokeObjectURL(url);
        resolve({ width: 0, height: 0 });
      };
      image.src = url;
    });
  }

  async function createImageMedia(file: File): Promise<SelectedMedia> {
    const dimensions = await readImageDimensions(file);
    const aspectRatio = dimensions.height ? dimensions.width / dimensions.height : 0;
    const validationError =
      !aspectRatio || aspectRatio < MIN_IMAGE_ASPECT_RATIO || aspectRatio > MAX_IMAGE_ASPECT_RATIO
        ? "Aspect ratio gambar harus 4:5 sampai 1.91:1."
        : undefined;

    return {
      id: crypto.randomUUID(),
      file,
      previewUrl: URL.createObjectURL(file),
      width: dimensions.width,
      height: dimensions.height,
      aspectRatio,
      validationError
    };
  }

  async function addFiles(selectedFiles: File[]) {
    const files = selectedFiles.filter((file) => file.size > 0);
    setMessage("");

    if (!files.length) return;

    if (mediaType === "IMAGE") {
      const file = files[0];
      if (!file.type.startsWith("image/")) {
        setMessage("Single image hanya menerima file gambar.");
        return;
      }
      const nextItem = await createImageMedia(file);
      revokePreviews(media);
      setMedia([nextItem]);
      if (nextItem.validationError) setMessage(nextItem.validationError);
      return;
    }

    if (mediaType === "CAROUSEL") {
      if (files.some((file) => !file.type.startsWith("image/"))) {
        setMessage("Carousel v1 hanya menerima gambar.");
        return;
      }
      const imageItems = await Promise.all(files.map(createImageMedia));
      const next = [
        ...media,
        ...imageItems
      ].slice(0, 10);
      imageItems.slice(Math.max(0, 10 - media.length)).forEach((item) => URL.revokeObjectURL(item.previewUrl));
      setMedia(next);
      const firstValidationError = next.find((item) => item.validationError)?.validationError;
      if (firstValidationError) {
        setMessage(firstValidationError);
      } else if (media.length + files.length > 10) {
        setMessage("Carousel maksimal 10 gambar. File tambahan diabaikan.");
      }
      return;
    }

    const file = files[0];
    if (!["video/mp4", "video/quicktime"].includes(file.type)) {
      setMessage("Reels hanya menerima MP4 atau MOV.");
      return;
    }

    const duration = await readVideoDuration(file);
    if (duration && (duration < 3 || duration > 900)) {
      setMessage("Durasi video dasar untuk Reels harus 3 detik sampai 15 menit.");
      return;
    }

    revokePreviews(media);
    setMedia([{ id: crypto.randomUUID(), file, previewUrl: URL.createObjectURL(file), duration }]);
  }

  async function onFilesSelected(event: ChangeEvent<HTMLInputElement>) {
    await addFiles(Array.from(event.target.files ?? []));
  }

  function onDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(true);
  }

  function onDragLeave(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);
  }

  async function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);
    await addFiles(Array.from(event.dataTransfer.files));
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= media.length) return;
    setMedia((items) => {
      const next = [...items];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function remove(id: string) {
    setMedia((items) => {
      const removed = items.find((item) => item.id === id);
      if (removed) URL.revokeObjectURL(removed.previewUrl);
      return items.filter((item) => item.id !== id);
    });
  }

  function validateBeforeSubmit() {
    const invalidMedia = media.find((item) => item.validationError);
    if (invalidMedia?.validationError) return invalidMedia.validationError;
    if (mediaType === "IMAGE") return media.length === 1 ? "" : "Pilih tepat 1 gambar.";
    if (mediaType === "CAROUSEL") return media.length >= 2 && media.length <= 10 ? "" : "Carousel membutuhkan 2 sampai 10 gambar.";
    return media.length === 1 ? "" : "Pilih tepat 1 video untuk Reels.";
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const validationError = validateBeforeSubmit();
    if (validationError) {
      setMessage(validationError);
      return;
    }
    if (publishMode === "SCHEDULE" && !scheduledAt) {
      setMessage("Pilih tanggal dan jam schedule.");
      return;
    }

    setMessage("");

    const formData = new FormData();
    formData.set("caption", caption);
    formData.set("mediaType", mediaType);
    formData.set("publishMode", publishMode);
    if (publishMode === "SCHEDULE") formData.set("scheduledAt", scheduledAt);
    media.forEach((item) => formData.append("media", item.file, item.file.name));

    createPost.mutate(formData, {
      onSuccess: (data) => {
        setMessage(
          publishMode === "SCHEDULE"
            ? `Scheduled ${data.mediaType} untuk ${formatToWIB(data.scheduledAt)}.`
            : `Published ${data.mediaType}. IG Media ID: ${data.igMediaId}`
        );
        onSuccess?.();
      },
      onError: (error) => {
        setMessage(error instanceof Error ? error.message : "Gagal menyimpan post.");
      }
    });
  }

  const accept = mediaType === "REELS" ? "video/mp4,video/quicktime" : "image/jpeg,image/png,image/webp";
  const previewMedia: PreviewMedia[] = media.map((item) => ({
    previewUrl: item.previewUrl,
    type: mediaType === "REELS" ? "VIDEO" : "IMAGE"
  }));

  return (
    <form onSubmit={submit} className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <div className="space-y-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
        <div className="grid gap-2 sm:grid-cols-3">
          {modes.map((mode) => (
            <button
              key={mode.value}
              type="button"
              onClick={() => resetMedia(mode.value)}
              className={`rounded-2xl border px-4 py-3 text-left text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                mediaType === mode.value ? "border-teal-600 bg-teal-600 text-white" : "border-slate-200 bg-white text-slate-800 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <span className="block font-medium">{mode.label}</span>
              <span className={mediaType === mode.value ? "text-white/80" : "text-slate-500 dark:text-slate-400"}>{mode.description}</span>
            </button>
          ))}
        </div>

        <label className="block space-y-2 text-sm font-medium">
          Media
          <div
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            className={`flex min-h-44 items-center justify-center rounded-3xl border border-dashed bg-slate-50 transition-colors dark:bg-slate-950 ${
              dragActive ? "border-teal-500 bg-teal-50 dark:bg-teal-950" : "border-slate-300 dark:border-slate-700"
            }`}
          >
            {media.length ? (
              <div className="grid w-full gap-3 p-3 sm:grid-cols-2 lg:grid-cols-3">
                {media.map((item, index) => (
                  <div
                    key={item.id}
                    className={`rounded-2xl border bg-white p-2 dark:bg-slate-900 ${
                      item.validationError ? "border-red-300" : "border-slate-200 dark:border-slate-700"
                    }`}
                  >
                    <div className="relative aspect-square overflow-hidden rounded bg-stone-100">
                      {mediaType === "REELS" ? (
                        <video src={item.previewUrl} className="h-full w-full object-cover" muted controls />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.previewUrl} alt="" className="h-full w-full object-cover" />
                      )}
                      <span className="absolute left-2 top-2 rounded bg-black/70 px-2 py-1 text-xs text-white">
                        #{index + 1}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span className="truncate text-xs font-normal text-stone-600">{item.file.name}</span>
                      <div className="flex shrink-0 gap-1">
                        {mediaType === "CAROUSEL" ? (
                          <>
                            <button type="button" onClick={() => move(index, -1)} className="rounded border p-1" aria-label="Move up">
                              <ArrowUp size={14} />
                            </button>
                            <button type="button" onClick={() => move(index, 1)} className="rounded border p-1" aria-label="Move down">
                              <ArrowDown size={14} />
                            </button>
                          </>
                        ) : null}
                        <button type="button" onClick={() => remove(item.id)} className="rounded border p-1 text-red-700" aria-label="Remove">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    {item.duration ? <p className="mt-1 text-xs font-normal text-stone-500">{Math.round(item.duration)} detik</p> : null}
                    {item.width && item.height ? (
                      <p className="mt-1 text-xs font-normal text-stone-500">
                        {item.width}x{item.height}
                        {item.aspectRatio ? ` (${item.aspectRatio.toFixed(2)}:1)` : ""}
                      </p>
                    ) : null}
                    {item.validationError ? <p className="mt-1 text-xs font-normal text-red-700">{item.validationError}</p> : null}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 text-center text-stone-500">
                <div className="flex items-center gap-2">
                  {dragActive ? <Upload size={20} /> : mediaType === "REELS" ? <Video size={20} /> : <ImagePlus size={20} />}
                  {dragActive
                    ? "Lepas file di sini"
                    : mediaType === "CAROUSEL"
                      ? "Drag & drop 2-10 gambar"
                      : mediaType === "REELS"
                        ? "Drag & drop video MP4/MOV"
                        : "Drag & drop 1 gambar"}
                </div>
                {mediaType !== "REELS" ? (
                  <span className="text-xs font-normal text-stone-500">Aspect ratio valid: 4:5 sampai 1.91:1</span>
                ) : null}
              </div>
            )}
          </div>
          <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-950 sm:flex-row sm:items-center">
            <input
              ref={fileInputRef}
              id="media-upload"
              name="media"
              type="file"
              accept={accept}
              multiple={mediaType === "CAROUSEL"}
              required
              onChange={onFilesSelected}
              className="sr-only"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#F97362] to-[#7C3AED] px-5 py-3 text-sm font-black text-white shadow-lg shadow-violet-500/20 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-violet-200 dark:focus:ring-violet-950"
            >
              <Upload size={16} />
              Choose {mediaType === "REELS" ? "Video" : mediaType === "CAROUSEL" ? "Images" : "Image"}
            </button>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-700 dark:text-slate-200">
                {media.length
                  ? mediaType === "CAROUSEL"
                    ? `${media.length} images selected`
                    : media[0].file.name
                  : "No file selected"}
              </p>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                {mediaType === "REELS" ? "MP4 atau MOV, maksimal 100MB." : "JPG, PNG, atau WebP, maksimal 8MB per file."}
              </p>
            </div>
          </div>
        </label>

        <label className="block space-y-2 text-sm font-medium">
          Caption
          <textarea
            name="caption"
            maxLength={2200}
            required
            rows={9}
            value={caption}
            onChange={(event) => setCaption(event.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 font-normal focus:outline-none focus:ring-2 focus:ring-teal-500 dark:border-slate-700 dark:bg-slate-950"
          />
        </label>
        <div className="space-y-3 rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
          <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setPublishMode("NOW")}
              className={`inline-flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-medium ${
                publishMode === "NOW" ? "border-teal-600 bg-teal-600 text-white" : "border-slate-200 bg-white text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              }`}
            >
              <Send size={16} /> Publish Now
            </button>
            <button
              type="button"
              onClick={() => setPublishMode("SCHEDULE")}
              className={`inline-flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-medium ${
                publishMode === "SCHEDULE" ? "border-sky-600 bg-sky-600 text-white" : "border-slate-200 bg-white text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              }`}
            >
              <CalendarClock size={16} /> Schedule
            </button>
          </div>
          {publishMode === "SCHEDULE" ? (
            <DateTimePicker value={scheduledAt} onChange={setScheduledAt} required />
          ) : null}
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-stone-500">{caption.length}/2200</span>
          <button disabled={createPost.isPending} className="inline-flex items-center gap-2 rounded-full bg-teal-600 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-60">
            {publishMode === "SCHEDULE" ? <CalendarClock size={16} /> : <Send size={16} />}
            {createPost.isPending ? "Saving..." : publishMode === "SCHEDULE" ? "Save Schedule" : "Publish Now"}
          </button>
        </div>
        {message ? <p className="text-sm text-stone-700">{message}</p> : null}
      </div>
      <div className="order-first lg:order-last">
        <InstagramPreview media={previewMedia} caption={caption} mediaType={mediaType} username={instagramUsername} />
      </div>
    </form>
  );
}
