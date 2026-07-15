"use client";

import { ChevronLeft, ChevronRight, MoreHorizontal, Play, Plus } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ComposeModal } from "@/components/compose-modal";
import { useCalendarPosts } from "@/hooks/useCalendarPosts";
import type { PostListItem, PostStatus } from "@/hooks/usePosts";

const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const monthFormatter = new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" });

const statusBorder: Record<PostStatus, string> = {
  DRAFT: "border-slate-400",
  SCHEDULED: "border-sky-500",
  PUBLISHING: "border-amber-500 animate-pulse",
  PUBLISHED: "border-emerald-500",
  FAILED: "border-rose-500"
};

const statusDot: Record<PostStatus, string> = {
  DRAFT: "bg-slate-400",
  SCHEDULED: "bg-sky-500",
  PUBLISHING: "bg-amber-500 animate-pulse",
  PUBLISHED: "bg-emerald-500",
  FAILED: "bg-rose-500"
};

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function startOfCalendar(month: Date) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const day = (first.getDay() + 6) % 7;
  const start = new Date(first);
  start.setDate(first.getDate() - day);
  return start;
}

function buildDays(month: Date) {
  const start = startOfCalendar(month);
  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    return day;
  });
}

function toLocalInputValue(date: Date) {
  const next = new Date(date);
  next.setHours(9, 0, 0, 0);
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}-${String(next.getDate()).padStart(2, "0")}T${String(next.getHours()).padStart(2, "0")}:${String(next.getMinutes()).padStart(2, "0")}`;
}

function postDateKey(post: PostListItem) {
  const value = post.scheduledAt ?? post.publishedAt ?? post.createdAt;
  return dateKey(new Date(value));
}

function MiniPost({ post, onClick }: { post: PostListItem; onClick: () => void }) {
  const first = post.mediaAssets[0];
  return (
    <button type="button" onClick={onClick} className={`relative h-10 w-10 overflow-hidden rounded-xl border-2 bg-slate-100 shadow-sm transition-transform hover:scale-105 ${statusBorder[post.status]}`}>
      {first ? (
        first.type === "VIDEO" ? (
          <video src={first.url} className="h-full w-full object-cover" muted />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={first.url} alt={post.caption} className="h-full w-full object-cover" />
        )
      ) : null}
      {post.mediaType === "REELS" ? (
        <span className="absolute inset-0 flex items-center justify-center bg-black/25 text-white">
          <Play size={13} fill="currentColor" />
        </span>
      ) : null}
      {post.mediaType === "CAROUSEL" ? (
        <span className="absolute bottom-0.5 right-0.5 rounded-full bg-black/75 px-1 text-[10px] font-bold text-white">
          {post.mediaAssets.length}
        </span>
      ) : null}
    </button>
  );
}

function MiniPostFrame({ post }: { post: PostListItem }) {
  const first = post.mediaAssets[0];
  return (
    <span className={`relative block h-10 w-10 shrink-0 overflow-hidden rounded-xl border-2 bg-slate-100 shadow-sm ${statusBorder[post.status]}`}>
      {first ? (
        first.type === "VIDEO" ? (
          <video src={first.url} className="h-full w-full object-cover" muted />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={first.url} alt="" className="h-full w-full object-cover" />
        )
      ) : null}
      {post.mediaType === "REELS" ? (
        <span className="absolute inset-0 flex items-center justify-center bg-black/25 text-white">
          <Play size={13} fill="currentColor" />
        </span>
      ) : null}
    </span>
  );
}

export function ComposeCalendar() {
  const today = useMemo(() => new Date(), []);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [month, setMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [modal, setModal] = useState<{ mode: "create"; scheduledAt: string } | { mode: "view"; post: PostListItem } | null>(() =>
    searchParams.get("new") === "1" ? { mode: "create", scheduledAt: toLocalInputValue(today) } : null
  );
  const [selectedMobileDay, setSelectedMobileDay] = useState<Date | null>(null);
  const queryClient = useQueryClient();
  const query = useCalendarPosts(month.getFullYear(), month.getMonth());
  const days = useMemo(() => buildDays(month), [month]);
  const postsByDay = useMemo(() => {
    const map = new Map<string, PostListItem[]>();
    for (const post of query.data ?? []) {
      const key = postDateKey(post);
      map.set(key, [...(map.get(key) ?? []), post]);
    }
    return map;
  }, [query.data]);

  useEffect(() => {
    if (searchParams.get("new") === "1") {
      router.replace("/compose");
    }
  }, [router, searchParams]);

  function openCreate(date: Date) {
    setModal({ mode: "create", scheduledAt: toLocalInputValue(date) });
  }

  async function refreshCalendar() {
    await queryClient.invalidateQueries({ queryKey: ["calendar-posts"] });
    await queryClient.invalidateQueries({ queryKey: ["posts"] });
  }

  function moveMonth(offset: number) {
    setMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1));
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#F97362]">Content Calendar</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl dark:text-white">Compose Calendar</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">
            Pilih tanggal, jadwalkan konten, dan pantau thumbnail post dalam tampilan kalender bulanan.
          </p>
        </div>
        <button
          type="button"
          onClick={() => openCreate(today)}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#F97362] to-[#7C3AED] px-5 py-3 text-sm font-black text-white shadow-lg shadow-violet-500/20"
        >
          <Plus size={17} /> New Post
        </button>
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 border-b border-slate-200 p-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => moveMonth(-1)} className="rounded-full border border-slate-200 p-2 dark:border-slate-700">
              <ChevronLeft size={18} />
            </button>
            <button type="button" onClick={() => moveMonth(1)} className="rounded-full border border-slate-200 p-2 dark:border-slate-700">
              <ChevronRight size={18} />
            </button>
            <button
              type="button"
              onClick={() => setMonth(new Date(today.getFullYear(), today.getMonth(), 1))}
              className="rounded-full border border-slate-200 px-4 py-2 text-sm font-bold dark:border-slate-700"
            >
              Today
            </button>
          </div>
          <h2 className="text-center text-xl font-black capitalize text-slate-950 dark:text-white">{monthFormatter.format(month)}</h2>
          <div className="hidden w-44 sm:block" />
        </div>

        <div className="grid grid-cols-7 border-b border-slate-200 text-center text-xs font-black uppercase tracking-wide text-slate-500 dark:border-slate-800">
          {weekdays.map((day) => (
            <div key={day} className="px-2 py-3">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {query.isLoading
            ? Array.from({ length: 42 }).map((_, index) => (
                <div key={index} className="min-h-28 border-b border-r border-slate-100 p-2 dark:border-slate-800">
                  <div className="shimmer h-4 w-12 rounded-full bg-slate-200 dark:bg-slate-800" />
                  <div className="mt-5 grid grid-cols-3 gap-1">
                    <div className="shimmer h-8 rounded-lg bg-slate-200 dark:bg-slate-800" />
                    <div className="shimmer h-8 rounded-lg bg-slate-200 dark:bg-slate-800" />
                  </div>
                </div>
              ))
            : days.map((day) => {
                const key = dateKey(day);
                const posts = postsByDay.get(key) ?? [];
                const inMonth = day.getMonth() === month.getMonth();
                const isToday = key === dateKey(today);
                const visible = posts.slice(0, 3);
                return (
                  <div
                    key={key}
                    className={`group relative min-h-24 border-b border-r border-slate-100 p-1.5 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50 sm:min-h-36 sm:p-2 ${
                      inMonth ? "bg-white dark:bg-slate-900" : "bg-slate-50/70 text-slate-400 dark:bg-slate-950/50"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedMobileDay(day)}
                      className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-black sm:pointer-events-none ${
                        isToday ? "bg-gradient-to-r from-[#F97362] to-[#7C3AED] text-white" : "text-slate-700 dark:text-slate-200"
                      }`}
                    >
                      {day.getDate()}
                    </button>
                    <button
                      type="button"
                      onClick={() => openCreate(day)}
                      className="absolute right-1.5 top-1.5 inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-950 text-white opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 dark:bg-white dark:text-slate-950"
                      aria-label={`Create post on ${day.toLocaleDateString()}`}
                    >
                      <Plus size={14} />
                    </button>
                    <div className="mt-2 hidden flex-wrap gap-1.5 sm:flex">
                      {visible.map((post) => (
                        <MiniPost key={post.id} post={post} onClick={() => setModal({ mode: "view", post })} />
                      ))}
                      {posts.length > visible.length ? (
                        <button type="button" onClick={() => setSelectedMobileDay(day)} className="flex h-10 items-center rounded-xl bg-slate-100 px-2 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                          +{posts.length - visible.length} lagi
                        </button>
                      ) : null}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1 sm:hidden">
                      {posts.slice(0, 5).map((post) => (
                        <span key={post.id} className={`h-2 w-2 rounded-full ${statusDot[post.status]}`} />
                      ))}
                    </div>
                  </div>
                );
              })}
        </div>
      </section>

      {selectedMobileDay ? (
        <div className="fixed inset-x-0 bottom-0 z-50 rounded-t-[2rem] border border-slate-200 bg-white p-4 shadow-2xl dark:border-slate-800 dark:bg-slate-900 md:left-auto md:right-6 md:w-96 md:rounded-[2rem]">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-slate-950 dark:text-white">{selectedMobileDay.toLocaleDateString("id-ID", { dateStyle: "full" })}</h3>
            <button type="button" onClick={() => setSelectedMobileDay(null)} className="rounded-full p-2 hover:bg-slate-100 dark:hover:bg-slate-800">
              <MoreHorizontal size={18} />
            </button>
          </div>
          <div className="mt-4 space-y-2">
            {(postsByDay.get(dateKey(selectedMobileDay)) ?? []).map((post) => (
              <button key={post.id} type="button" onClick={() => setModal({ mode: "view", post })} className="flex w-full items-center gap-3 rounded-2xl bg-slate-100 p-3 text-left dark:bg-slate-800">
                <MiniPostFrame post={post} />
                <span className="line-clamp-2 text-sm font-bold text-slate-800 dark:text-slate-100">{post.caption}</span>
              </button>
            ))}
            <button type="button" onClick={() => openCreate(selectedMobileDay)} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#F97362] to-[#7C3AED] px-4 py-3 text-sm font-black text-white">
              <Plus size={16} /> Create Post
            </button>
          </div>
        </div>
      ) : null}

      <ComposeModal
        open={Boolean(modal)}
        mode={modal?.mode ?? "create"}
        scheduledAt={modal?.mode === "create" ? modal.scheduledAt : undefined}
        post={modal?.mode === "view" ? modal.post : null}
        onClose={() => setModal(null)}
        onSuccess={refreshCalendar}
      />
    </div>
  );
}
