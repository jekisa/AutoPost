"use client";

import {
  ColumnDef,
  SortingState,
  flexRender,
  getCoreRowModel,
  useReactTable
} from "@tanstack/react-table";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  CalendarClock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  ExternalLink,
  FileImage,
  Images,
  Plus,
  RefreshCcw,
  Rocket,
  Send,
  Sparkles
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { PostListItem, PostStatus, usePosts, useRetryPost } from "@/hooks/usePosts";

const statuses: Array<{ value?: PostStatus; label: string }> = [
  { label: "ALL" },
  { value: "DRAFT", label: "DRAFT" },
  { value: "PUBLISHING", label: "PUBLISHING" },
  { value: "PUBLISHED", label: "PUBLISHED" },
  { value: "FAILED", label: "FAILED" },
  { value: "SCHEDULED", label: "SCHEDULED" }
];

const statusStyles: Record<PostStatus, string> = {
  DRAFT: "bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:ring-slate-700",
  SCHEDULED: "bg-sky-100 text-sky-800 ring-sky-200 dark:bg-sky-950 dark:text-sky-200 dark:ring-sky-800",
  PUBLISHING: "animate-pulse bg-amber-100 text-amber-900 ring-amber-200 dark:bg-amber-950 dark:text-amber-200 dark:ring-amber-800",
  PUBLISHED: "bg-emerald-100 text-emerald-800 ring-emerald-200 dark:bg-emerald-950 dark:text-emerald-200 dark:ring-emerald-800",
  FAILED: "bg-rose-100 text-rose-800 ring-rose-200 dark:bg-rose-950 dark:text-rose-200 dark:ring-rose-800"
};

function relativeTime(value: string) {
  const diffMs = new Date(value).getTime() - Date.now();
  const absolute = Math.abs(diffMs);
  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ["year", 365 * 24 * 60 * 60 * 1000],
    ["month", 30 * 24 * 60 * 60 * 1000],
    ["day", 24 * 60 * 60 * 1000],
    ["hour", 60 * 60 * 1000],
    ["minute", 60 * 1000]
  ];
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  const [unit, ms] = units.find(([, size]) => absolute >= size) ?? ["second", 1000];
  return formatter.format(Math.round(diffMs / ms), unit);
}

function StatusBadge({ status }: { status: PostStatus }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${statusStyles[status]}`}>
      {status}
    </span>
  );
}

function MediaPreview({ post }: { post: PostListItem }) {
  const first = post.mediaAssets[0];
  if (!first) {
    return (
      <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-slate-100 text-slate-400 dark:bg-slate-800">
        <FileImage size={18} />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <div className="relative h-14 w-14 overflow-hidden rounded-xl bg-slate-100 shadow-sm ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
        {first.type === "VIDEO" ? (
          <video src={first.url} className="h-full w-full object-cover" muted aria-label={`${post.mediaType} preview`} />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={first.url} alt={`${post.mediaType} preview`} className="h-full w-full object-cover" />
        )}
        {post.mediaAssets.length > 1 ? (
          <span className="absolute bottom-1 right-1 rounded-full bg-slate-950/80 px-1.5 py-0.5 text-[10px] font-bold text-white">
            +{post.mediaAssets.length - 1}
          </span>
        ) : null}
      </div>
      <span className="hidden rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600 lg:inline-flex dark:bg-slate-800 dark:text-slate-300">
        {post.mediaType}
      </span>
    </div>
  );
}

function SkeletonRows() {
  return Array.from({ length: 6 }).map((_, index) => (
    <tr key={index} className="border-t border-slate-100 dark:border-slate-800">
      {Array.from({ length: 5 }).map((__, cellIndex) => (
        <td key={cellIndex} className="px-5 py-4">
          <div className="shimmer h-5 rounded-full bg-slate-200 dark:bg-slate-800" />
        </td>
      ))}
    </tr>
  ));
}

export function PostHistoryDashboard() {
  const [status, setStatus] = useState<PostStatus | undefined>();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sorting, setSorting] = useState<SortingState>([{ id: "createdAt", desc: true }]);
  const retryPost = useRetryPost();
  const sort = sorting[0];
  const query = usePosts({
    status,
    page,
    pageSize,
    sortBy: sort?.id === "status" ? "status" : "createdAt",
    sortDirection: sort?.desc === false ? "asc" : "desc"
  });
  const posts = query.data?.data ?? [];
  const totalCount = query.data?.totalCount ?? 0;
  const pageCount = query.data?.pageCount ?? 1;
  const showingStart = totalCount ? (page - 1) * pageSize + 1 : 0;
  const showingEnd = Math.min(page * pageSize, totalCount);

  const columns = useMemo<ColumnDef<PostListItem>[]>(
    () => [
      {
        header: "Media",
        accessorKey: "mediaAssets",
        cell: ({ row }) => <MediaPreview post={row.original} />
      },
      {
        header: "Caption",
        accessorKey: "caption",
        cell: ({ row }) => (
          <div className="max-w-md">
            <p className="line-clamp-2 text-sm font-medium text-slate-900 transition-all hover:line-clamp-none dark:text-slate-100">
              {row.original.caption}
            </p>
            {row.original.errorMessage ? (
              <p className="mt-1 line-clamp-2 text-xs text-rose-600 dark:text-rose-300">{row.original.errorMessage}</p>
            ) : null}
          </div>
        )
      },
      {
        header: "Status",
        accessorKey: "status",
        enableSorting: true,
        cell: ({ row }) => <StatusBadge status={row.original.status} />
      },
      {
        header: "Live Instagram",
        accessorKey: "instagramPermalink",
        cell: ({ row }) => {
          if (row.original.status === "FAILED") {
            return (
              <button
                type="button"
                onClick={() => retryPost.mutate(row.original.id)}
                disabled={retryPost.isPending}
                className="inline-flex items-center gap-1.5 rounded-full bg-rose-600 px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-500 disabled:opacity-50"
              >
                <RefreshCcw size={13} /> Retry
              </button>
            );
          }

          return row.original.instagramPermalink ? (
            <a
              href={row.original.instagramPermalink}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 transition-colors hover:border-teal-300 hover:text-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              Open <ExternalLink size={13} />
            </a>
          ) : row.original.igMediaId ? (
            <span className="block max-w-32 truncate text-xs text-slate-500" title={row.original.igMediaId}>
              ID: {row.original.igMediaId}
            </span>
          ) : (
            <span className="text-xs text-slate-400">-</span>
          );
        }
      },
      {
        header: "Created",
        accessorKey: "createdAt",
        enableSorting: true,
        cell: ({ row }) => (
          <span title={new Date(row.original.createdAt).toLocaleString()} className="text-sm text-slate-500 dark:text-slate-400">
            {relativeTime(row.original.createdAt)}
          </span>
        )
      }
    ],
    [retryPost]
  );

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: posts,
    columns,
    state: { sorting },
    manualSorting: true,
    pageCount,
    onSortingChange: (updater) => {
      setSorting(updater);
      setPage(1);
    },
    getCoreRowModel: getCoreRowModel()
  });

  const summary = query.data?.summary ?? { total: 0, publishedToday: 0, scheduledUpcoming: 0, failed: 0 };
  const summaryCards = [
    { label: "Total Posts", value: summary.total, icon: Images, color: "text-slate-700 dark:text-slate-200" },
    { label: "Published Today", value: summary.publishedToday, icon: CheckCircle2, color: "text-emerald-600" },
    { label: "Scheduled", value: summary.scheduledUpcoming, icon: CalendarClock, color: "text-sky-600" },
    { label: "Needs Retry", value: summary.failed, icon: AlertTriangle, color: "text-rose-600" }
  ];

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-bold text-teal-800 dark:border-teal-800 dark:bg-teal-950 dark:text-teal-200">
            <Sparkles size={14} /> Publishing command center
          </div>
          <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl dark:text-white">Post History</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">
            Pantau publish Instagram, jadwal, retry, dan status live post dalam satu dashboard.
          </p>
        </div>
        <Link
          href="/compose?new=1"
          className="inline-flex items-center justify-center gap-2 rounded-full bg-teal-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 dark:focus:ring-offset-slate-950"
        >
          <Plus size={17} /> New Post
        </Link>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((item) => (
          <div key={item.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">{item.label}</p>
              <item.icon size={19} className={item.color} />
            </div>
            <p className="mt-3 text-3xl font-black text-slate-950 dark:text-white">{item.value}</p>
          </div>
        ))}
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 border-b border-slate-200 p-4 dark:border-slate-800 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {statuses.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => {
                  setStatus(item.value);
                  setPage(1);
                }}
                className={`shrink-0 rounded-full px-3 py-2 text-xs font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                  status === item.value
                    ? "bg-slate-950 text-white dark:bg-white dark:text-slate-950"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
            Rows
            <select
              value={pageSize}
              onChange={(event) => {
                setPageSize(Number(event.target.value));
                setPage(1);
              }}
              className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 dark:border-slate-700 dark:bg-slate-950"
            >
              {[10, 25, 50].map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[860px] text-left">
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id} className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:text-slate-400">
                  {headerGroup.headers.map((header) => (
                    <th key={header.id} className="px-5 py-4 font-bold">
                      {header.column.getCanSort() ? (
                        <button
                          type="button"
                          onClick={header.column.getToggleSortingHandler()}
                          className="inline-flex items-center gap-1 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500"
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {header.column.getIsSorted() === "asc" ? <ArrowUp size={13} /> : header.column.getIsSorted() === "desc" ? <ArrowDown size={13} /> : null}
                        </button>
                      ) : (
                        flexRender(header.column.columnDef.header, header.getContext())
                      )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {query.isLoading ? (
                <SkeletonRows />
              ) : posts.length ? (
                table.getRowModel().rows.map((row) => (
                  <tr key={row.id} className="border-b border-slate-100 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/60">
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-5 py-4 align-middle">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              ) : null}
            </tbody>
          </table>
        </div>

        <div className="grid gap-3 p-4 md:hidden">
          {query.isLoading ? (
            Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                <div className="shimmer h-28 rounded-xl bg-slate-200 dark:bg-slate-800" />
                <div className="shimmer mt-4 h-5 rounded-full bg-slate-200 dark:bg-slate-800" />
              </div>
            ))
          ) : posts.length ? (
            posts.map((post) => (
              <article key={post.id} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
                <div className="flex gap-3">
                  <MediaPreview post={post} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <StatusBadge status={post.status} />
                      <span className="text-xs text-slate-500">{relativeTime(post.createdAt)}</span>
                    </div>
                    <p className="mt-2 line-clamp-3 text-sm font-semibold text-slate-900 dark:text-slate-100">{post.caption}</p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {post.instagramPermalink ? (
                    <a href={post.instagramPermalink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full border px-3 py-2 text-xs font-bold">
                      Open <ExternalLink size={13} />
                    </a>
                  ) : null}
                  {post.status === "FAILED" ? (
                    <button
                      type="button"
                      onClick={() => retryPost.mutate(post.id)}
                      className="inline-flex items-center gap-1 rounded-full bg-rose-600 px-3 py-2 text-xs font-bold text-white"
                    >
                      <RefreshCcw size={13} /> Retry
                    </button>
                  ) : null}
                </div>
              </article>
            ))
          ) : null}
        </div>

        {!query.isLoading && !posts.length ? (
          <div className="px-5 py-14 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-200">
              <Rocket size={24} />
            </div>
            <h2 className="mt-4 text-lg font-black text-slate-950 dark:text-white">Belum ada post di filter ini</h2>
            <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500 dark:text-slate-400">
              Buat post baru atau ubah filter status untuk melihat riwayat publish.
            </p>
            <Link href="/compose?new=1" className="mt-5 inline-flex items-center gap-2 rounded-full bg-teal-600 px-4 py-2 text-sm font-bold text-white">
              <Plus size={16} /> New Post
            </Link>
          </div>
        ) : null}

        <div className="flex flex-col gap-3 border-t border-slate-200 p-4 text-sm text-slate-600 dark:border-slate-800 dark:text-slate-300 sm:flex-row sm:items-center sm:justify-between">
          <span>
            Showing <strong>{showingStart}</strong>-<strong>{showingEnd}</strong> of <strong>{totalCount}</strong> results
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1 || query.isFetching}
              onClick={() => setPage((value) => Math.max(1, value - 1))}
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-2 font-bold disabled:opacity-40 dark:border-slate-700"
            >
              <ChevronLeft size={15} /> Previous
            </button>
            <span className="rounded-full bg-slate-100 px-3 py-2 font-bold dark:bg-slate-800">
              {page} / {pageCount}
            </span>
            <button
              type="button"
              disabled={page >= pageCount || query.isFetching}
              onClick={() => setPage((value) => Math.min(pageCount, value + 1))}
              className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-2 font-bold disabled:opacity-40 dark:border-slate-700"
            >
              Next <ChevronRight size={15} />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
