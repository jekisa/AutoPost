"use client";

import {
  ColumnDef,
  SortingState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable
} from "@tanstack/react-table";
import { AlertTriangle, Bookmark, ExternalLink, Eye, Heart, MessageCircle, RefreshCw, TrendingUp } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { EngagementPost, useEngagementDashboard } from "@/hooks/useEngagementDashboard";

const compact = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });
const percent = new Intl.NumberFormat("en", { style: "percent", maximumFractionDigits: 2 });

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleDateString("id-ID", { day: "2-digit", month: "short" }) : "-";
}

function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`shimmer rounded-2xl bg-slate-200 dark:bg-slate-800 ${className}`} />;
}

function Thumbnail({ post }: { post: EngagementPost }) {
  if (!post.thumbnailUrl) {
    return <div className="h-12 w-12 rounded-xl bg-slate-100 dark:bg-slate-800" />;
  }

  return (
    <div className="relative h-12 w-12 overflow-hidden rounded-xl bg-slate-100 ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
      {post.mediaType === "REELS" ? (
        <video src={post.thumbnailUrl} className="h-full w-full object-cover" muted />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={post.thumbnailUrl} alt={post.caption} className="h-full w-full object-cover" />
      )}
      {post.mediaCount > 1 ? (
        <span className="absolute bottom-1 right-1 rounded-full bg-black/75 px-1 text-[10px] font-bold text-white">
          {post.mediaCount}
        </span>
      ) : null}
    </div>
  );
}

export function EngagementDashboard() {
  const query = useEngagementDashboard();
  const [sorting, setSorting] = useState<SortingState>([{ id: "engagementRate", desc: true }]);
  const posts = useMemo(() => query.data?.posts ?? [], [query.data?.posts]);
  const summary = query.data?.summary ?? {
    likes: 0,
    comments: 0,
    saves: 0,
    reach: 0,
    plays: 0,
    averageEngagementRate: 0
  };
  const summaryCards = [
    { label: "Total Likes", value: compact.format(summary.likes), icon: Heart, color: "text-rose-600" },
    { label: "Comments", value: compact.format(summary.comments), icon: MessageCircle, color: "text-sky-600" },
    { label: "Saves", value: compact.format(summary.saves), icon: Bookmark, color: "text-violet-600" },
    { label: "Reach", value: compact.format(summary.reach), icon: Eye, color: "text-emerald-600" },
    { label: "Total Plays", value: compact.format(summary.plays), icon: TrendingUp, color: "text-orange-600" },
    { label: "Avg. Engagement", value: percent.format(summary.averageEngagementRate), icon: TrendingUp, color: "text-teal-600" }
  ];

  const chartData = useMemo(
    () =>
      posts
        .filter((post) => !post.error)
        .slice()
        .sort((a, b) => new Date(a.publishedAt ?? 0).getTime() - new Date(b.publishedAt ?? 0).getTime())
        .map((post, index) => ({
          name: post.publishedAt ? formatDate(post.publishedAt) : `Post ${index + 1}`,
          engagement: post.metrics.engagement,
          likes: post.metrics.likes,
          comments: post.metrics.comments,
          saves: post.metrics.saves,
          caption: post.caption.slice(0, 42)
        })),
    [posts]
  );

  const columns = useMemo<ColumnDef<EngagementPost>[]>(
    () => [
      {
        header: "Post",
        accessorKey: "caption",
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <Thumbnail post={row.original} />
            <div className="min-w-0">
              <p className="line-clamp-2 max-w-xs text-sm font-bold text-slate-900 dark:text-slate-100">{row.original.caption}</p>
              <p className="mt-1 text-xs text-slate-500">{formatDate(row.original.publishedAt)}</p>
            </div>
          </div>
        )
      },
      { header: "Likes", accessorFn: (row) => row.metrics.likes, id: "likes" },
      { header: "Comments", accessorFn: (row) => row.metrics.comments, id: "comments" },
      { header: "Saves", accessorFn: (row) => row.metrics.saves, id: "saves" },
      { header: "Reach", accessorFn: (row) => row.metrics.reach, id: "reach" },
      { header: "Plays", accessorFn: (row) => row.metrics.plays, id: "plays" },
      {
        header: "Eng. Rate",
        accessorFn: (row) => row.metrics.engagementRate,
        id: "engagementRate",
        cell: ({ row }) => percent.format(row.original.metrics.engagementRate)
      }
    ],
    []
  );
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: posts,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel()
  });

  if (query.isLoading) {
    return (
      <div className="space-y-6">
        <SkeletonBlock className="h-24" />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">{Array.from({ length: 6 }).map((_, i) => <SkeletonBlock key={i} className="h-28" />)}</div>
        <SkeletonBlock className="h-80" />
      </div>
    );
  }

  const noPublishedPosts = !query.data?.posts.length && !query.data?.warnings.length;

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#F97362]">Real-time Instagram Insights</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl dark:text-white">Engagement Dashboard</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">
            Data dibaca langsung dari Meta Graph API saat dashboard dibuka, tanpa disimpan berkala ke database.
          </p>
        </div>
        <button
          type="button"
          onClick={() => query.refetch()}
          disabled={query.isFetching}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#F97362] to-[#7C3AED] px-5 py-3 text-sm font-black text-white shadow-lg shadow-violet-500/20 disabled:opacity-60"
        >
          <RefreshCw size={16} className={query.isFetching ? "animate-spin" : ""} /> Refresh
        </button>
      </section>

      {query.data?.warnings.length || query.data?.error ? (
        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">
          <div className="flex gap-3">
            <AlertTriangle className="mt-0.5 shrink-0" size={18} />
            <div>
              <p className="font-black">Data engagement tidak dapat dimuat sebagian.</p>
              <p className="mt-1">
                Pastikan permission `instagram_manage_insights` sudah ditambahkan di Settings.{" "}
                <Link className="font-black underline" href="/settings">Buka Settings</Link>
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {[...(query.data?.error ? [query.data.error] : []), ...(query.data?.warnings ?? [])].slice(0, 4).map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      ) : null}

      {query.data?.unavailableCount ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-4 text-sm text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
          {query.data.unavailableCount} post tidak dapat dimuat datanya karena memakai ID media data uji/demo.
        </div>
      ) : null}

      {noPublishedPosts ? (
        <div className="rounded-[2rem] border border-slate-200 bg-white p-10 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <Eye className="mx-auto text-slate-400" size={36} />
          <h2 className="mt-4 text-xl font-black text-slate-950 dark:text-white">Belum ada post published</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-500 dark:text-slate-400">
            Publish konten terlebih dahulu agar data engagement Instagram bisa ditampilkan di sini.
          </p>
          <Link href="/compose?new=1" className="mt-5 inline-flex rounded-full bg-teal-600 px-5 py-3 text-sm font-black text-white">
            Create Post
          </Link>
        </div>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {summaryCards.map((card) => (
          <div key={card.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <p className="text-xs font-black uppercase tracking-wide text-slate-500">{card.label}</p>
              <card.icon size={18} className={card.color} />
            </div>
            <p className="mt-4 text-3xl font-black text-slate-950 dark:text-white">{card.value}</p>
          </div>
        ))}
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-lg font-black text-slate-950 dark:text-white">Engagement Trend</h2>
        <div className="mt-4 h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={(value) => compact.format(Number(value))} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value, name) => [compact.format(Number(value)), name]} labelFormatter={(_, payload) => payload?.[0]?.payload?.caption ?? ""} />
              <Bar dataKey="engagement" fill="#7C3AED" radius={[10, 10, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-black text-slate-950 dark:text-white">Top Performing Posts</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {(query.data?.topPosts ?? []).map((post) => (
            <article key={post.id} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <Thumbnail post={post} />
              <p className="mt-3 line-clamp-3 text-sm font-bold text-slate-900 dark:text-slate-100">{post.caption}</p>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                <div className="rounded-2xl bg-rose-50 p-2 text-rose-700 dark:bg-rose-950 dark:text-rose-200">
                  <strong className="block text-base">{compact.format(post.metrics.likes)}</strong> Likes
                </div>
                <div className="rounded-2xl bg-sky-50 p-2 text-sky-700 dark:bg-sky-950 dark:text-sky-200">
                  <strong className="block text-base">{compact.format(post.metrics.comments)}</strong> Com.
                </div>
                <div className="rounded-2xl bg-violet-50 p-2 text-violet-700 dark:bg-violet-950 dark:text-violet-200">
                  <strong className="block text-base">{percent.format(post.metrics.engagementRate)}</strong> ER
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-[2rem] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[980px] text-left">
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id} className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800">
                  {headerGroup.headers.map((header) => (
                    <th key={header.id} className="px-5 py-4">
                      <button type="button" onClick={header.column.getToggleSortingHandler()} className="font-black">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                      </button>
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="border-b border-slate-100 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/60">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-5 py-4 text-sm">
                      {typeof cell.getValue() === "number"
                        ? cell.column.id === "engagementRate"
                          ? flexRender(cell.column.columnDef.cell, cell.getContext())
                          : compact.format(cell.getValue() as number)
                        : flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="grid gap-3 p-4 md:hidden">
          {posts.map((post) => (
            <article key={post.id} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
              <div className="flex gap-3">
                <Thumbnail post={post} />
                <div className="min-w-0">
                  <p className="line-clamp-2 text-sm font-bold text-slate-900 dark:text-slate-100">{post.caption}</p>
                  <p className="mt-1 text-xs text-slate-500">{formatDate(post.publishedAt)}</p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                <span className="rounded-xl bg-slate-100 p-2 dark:bg-slate-800">Likes<br /><strong>{compact.format(post.metrics.likes)}</strong></span>
                <span className="rounded-xl bg-slate-100 p-2 dark:bg-slate-800">Comments<br /><strong>{compact.format(post.metrics.comments)}</strong></span>
                <span className="rounded-xl bg-slate-100 p-2 dark:bg-slate-800">ER<br /><strong>{percent.format(post.metrics.engagementRate)}</strong></span>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
