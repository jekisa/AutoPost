"use client";

import { Bookmark, Heart, Image as ImageIcon, MessageCircle, MoreHorizontal, Play, Send } from "lucide-react";
import { useState } from "react";

export type PreviewMedia = {
  previewUrl: string;
  type: "IMAGE" | "VIDEO";
};

type Props = {
  media: PreviewMedia[];
  caption: string;
  mediaType: "IMAGE" | "CAROUSEL" | "REELS";
  username?: string | null;
};

const fallbackUsername = "autopost_user";

export function InstagramPreview({ media, caption, mediaType, username }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);
  const displayUsername = username?.trim() || fallbackUsername;
  const safeIndex = Math.min(activeIndex, Math.max(media.length - 1, 0));
  const activeMedia = media[safeIndex];

  return (
    <aside className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#F97362]">Live Preview</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Tampilan draft sebelum dipublish</p>
        </div>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-slate-500 dark:bg-slate-800 dark:text-slate-400">{mediaType}</span>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-950">
        <div className="flex items-center gap-3 border-b border-slate-100 px-3 py-3 dark:border-slate-800">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#F97362] to-[#7C3AED] text-xs font-black text-white">
            {displayUsername.slice(0, 1).toUpperCase()}
          </div>
          <span className="min-w-0 flex-1 truncate text-sm font-black text-slate-900 dark:text-white">@{displayUsername.replace(/^@/, "")}</span>
          <MoreHorizontal size={18} className="text-slate-500" />
        </div>

        <div className="relative aspect-square w-full bg-slate-100 dark:bg-slate-800">
          {activeMedia ? (
            activeMedia.type === "VIDEO" ? (
              <video src={activeMedia.previewUrl} className="h-full w-full object-cover" controls playsInline />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={activeMedia.previewUrl} alt="Preview media post" className="h-full w-full object-cover" />
            )
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 px-8 text-center text-slate-400 dark:text-slate-500">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-[#7C3AED] shadow-sm dark:bg-slate-900">
                <ImageIcon size={27} />
              </div>
              <p className="text-sm font-semibold">Preview akan muncul di sini setelah upload media</p>
            </div>
          )}
          {mediaType === "REELS" && activeMedia ? (
            <span className="pointer-events-none absolute left-3 top-3 rounded-full bg-black/65 p-2 text-white"><Play size={14} fill="currentColor" /></span>
          ) : null}
        </div>

        {mediaType === "CAROUSEL" && media.length > 1 ? (
          <div className="flex justify-center gap-1.5 border-b border-slate-100 py-2 dark:border-slate-800" aria-label="Pilih slide carousel">
            {media.map((item, index) => (
              <button
                key={`${item.previewUrl}-${index}`}
                type="button"
                aria-label={`Tampilkan slide ${index + 1}`}
                aria-pressed={safeIndex === index}
                onClick={() => setActiveIndex(index)}
                className={`h-1.5 rounded-full transition-all ${safeIndex === index ? "w-5 bg-[#7C3AED]" : "w-1.5 bg-slate-300 dark:bg-slate-600"}`}
              />
            ))}
          </div>
        ) : null}

        <div className="p-3">
          <div className="flex items-center gap-4 text-slate-700 dark:text-slate-300">
            <Heart size={19} strokeWidth={1.8} />
            <MessageCircle size={19} strokeWidth={1.8} />
            <Send size={19} strokeWidth={1.8} />
            <Bookmark size={19} strokeWidth={1.8} className="ml-auto" />
          </div>
          <p className="mt-3 break-words text-sm leading-5 text-slate-800 dark:text-slate-200">
            <span className="font-black text-slate-950 dark:text-white">@{displayUsername.replace(/^@/, "")}</span>{" "}
            {caption ? caption : <span className="text-slate-400">Caption akan tampil di sini...</span>}
          </p>
          {caption.length > 220 ? <p className="mt-1 text-xs font-semibold text-slate-400">Lihat selengkapnya</p> : null}
        </div>
      </div>
    </aside>
  );
}
