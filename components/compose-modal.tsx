"use client";

import { X, ExternalLink, RefreshCcw, Play, CalendarClock, Image as ImageIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { ComposeForm } from "@/components/compose-form";
import type { PostListItem } from "@/hooks/usePosts";
import { useRetryPost } from "@/hooks/usePosts";
import { formatToWIB } from "@/lib/timezone";

type Props = {
  open: boolean;
  mode: "create" | "view";
  scheduledAt?: string;
  post?: PostListItem | null;
  onClose: () => void;
  onSuccess: () => void;
};

const statusColor = {
  DRAFT: "bg-slate-100 text-slate-700",
  SCHEDULED: "bg-sky-100 text-sky-800",
  PUBLISHING: "bg-amber-100 text-amber-900",
  PUBLISHED: "bg-emerald-100 text-emerald-800",
  FAILED: "bg-rose-100 text-rose-800"
};

export function ComposeModal({ open, mode, scheduledAt, post, onClose, onSuccess }: Props) {
  const [dirty, setDirty] = useState(false);
  const retryPost = useRetryPost();

  function requestClose() {
    if (dirty && !window.confirm("Ada perubahan yang belum disimpan. Tutup modal?")) return;
    setDirty(false);
    onClose();
  }

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") requestClose();
    }
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  });

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] bg-slate-950/60 backdrop-blur-md md:p-6"
      role="dialog"
      aria-modal="true"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) requestClose();
      }}
    >
      <div className="flex min-h-full items-stretch justify-center md:items-center">
        <div className="relative h-dvh w-full overflow-y-auto bg-slate-50 shadow-2xl dark:bg-slate-950 md:h-auto md:max-h-[92vh] md:max-w-5xl md:rounded-[2rem]">
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-slate-50/95 px-4 py-4 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95 sm:px-6">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#F97362]">
                {mode === "create" ? "Create scheduled content" : "Post detail"}
              </p>
              <h2 className="mt-1 text-xl font-black text-slate-950 dark:text-white">
                {mode === "create" ? "Compose Post" : post?.caption.slice(0, 48) || "Post"}
              </h2>
            </div>
            <button
              type="button"
              onClick={requestClose}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition-colors hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-[#7C3AED] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              aria-label="Close modal"
            >
              <X size={18} />
            </button>
          </div>

          <div className="p-4 sm:p-6">
            {mode === "create" ? (
              <ComposeForm
                key={scheduledAt ?? "create"}
                defaultScheduledAt={scheduledAt}
                onDirtyChange={setDirty}
                onSuccess={() => {
                  setDirty(false);
                  onSuccess();
                  onClose();
                }}
              />
            ) : post ? (
              <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {post.mediaAssets.map((asset, index) => (
                      <div key={asset.id} className="relative aspect-square overflow-hidden rounded-2xl bg-slate-100 dark:bg-slate-800">
                        {asset.type === "VIDEO" ? (
                          <video src={asset.url} className="h-full w-full object-cover" muted controls />
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={asset.url} alt={`Media ${index + 1}`} className="h-full w-full object-cover" />
                        )}
                        {asset.type === "VIDEO" ? (
                          <span className="absolute left-2 top-2 rounded-full bg-black/70 p-1 text-white">
                            <Play size={14} />
                          </span>
                        ) : null}
                        {post.mediaType === "CAROUSEL" && index === 0 ? (
                          <span className="absolute right-2 top-2 rounded-full bg-black/70 px-2 py-1 text-xs font-bold text-white">
                            {post.mediaAssets.length}
                          </span>
                        ) : null}
                      </div>
                    ))}
                    {!post.mediaAssets.length ? (
                      <div className="flex aspect-square items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800">
                        <ImageIcon size={24} />
                      </div>
                    ) : null}
                  </div>
                  <p className="mt-5 whitespace-pre-wrap text-sm leading-6 text-slate-700 dark:text-slate-300">{post.caption}</p>
                </div>
                <aside className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                  <span className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${statusColor[post.status]}`}>
                    {post.status}
                  </span>
                  <dl className="mt-5 space-y-4 text-sm">
                    <div>
                      <dt className="font-bold text-slate-500">Type</dt>
                      <dd className="mt-1 text-slate-950 dark:text-white">{post.mediaType}</dd>
                    </div>
                    <div>
                      <dt className="font-bold text-slate-500">Schedule</dt>
                      <dd className="mt-1 text-slate-950 dark:text-white">
                        {formatToWIB(post.scheduledAt)}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-bold text-slate-500">Published</dt>
                      <dd className="mt-1 text-slate-950 dark:text-white">
                        {formatToWIB(post.publishedAt)}
                      </dd>
                    </div>
                  </dl>
                  <div className="mt-6 flex flex-col gap-2">
                    {post.status === "FAILED" ? (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            retryPost.reset();
                            retryPost.mutate(post.id, { onSuccess });
                          }}
                          disabled={retryPost.isPending}
                          className="inline-flex items-center justify-center gap-2 rounded-full bg-rose-600 px-4 py-3 text-sm font-black text-white transition-colors hover:bg-rose-700 disabled:opacity-60"
                        >
                          <RefreshCcw size={16} /> {retryPost.isPending ? "Retrying..." : "Retry"}
                        </button>
                        {retryPost.error ? (
                          <p className="rounded-2xl bg-rose-50 p-3 text-xs leading-5 text-rose-800 dark:bg-rose-950/50 dark:text-rose-200">
                            {retryPost.error instanceof Error ? retryPost.error.message : "Retry gagal. Periksa koneksi Meta dan access token di Settings."}
                          </p>
                        ) : null}
                      </>
                    ) : null}
                    {post.status === "DRAFT" || post.status === "SCHEDULED" ? (
                      <div className="rounded-2xl bg-sky-50 p-3 text-sm text-sky-800 dark:bg-sky-950 dark:text-sky-200">
                        Edit mode siap untuk status ini, tetapi endpoint update belum tersedia.
                      </div>
                    ) : null}
                    {post.instagramPermalink ? (
                      <a
                        href={post.instagramPermalink}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 px-4 py-3 text-sm font-black text-slate-700 dark:border-slate-700 dark:text-slate-200"
                      >
                        Open Live Post <ExternalLink size={16} />
                      </a>
                    ) : null}
                  </div>
                </aside>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
