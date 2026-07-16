"use client";

import { jsPDF } from "jspdf";
import { BarChart3, Bookmark, CalendarDays, Eye, FileDown, Heart, Info, MessageCircle, MessageSquare, RefreshCw, Users, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ComposeModal } from "@/components/compose-modal";
import { TrendBadge } from "@/components/ui/trend-badge";
import { type AnalyticsPost, useAnalytics, type AnalyticsResponse } from "@/hooks/useAnalytics";
import { formatToWIB } from "@/lib/timezone";

const compact = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });
const percent = new Intl.NumberFormat("en", { style: "percent", maximumFractionDigits: 2 });
const ranges: Array<{ value: AnalyticsResponse["range"]; label: string }> = [
  { value: "7d", label: "7 Days" },
  { value: "30d", label: "30 Days" },
  { value: "mtd", label: "Month to Date" }
];

function Trend({ value }: { value: number | null }) {
  return <TrendBadge value={value} />;
}

function PostThumbnail({ post }: { post: AnalyticsPost }) {
  return post.thumbnailUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={post.thumbnailUrl} alt="" className="h-20 w-20 shrink-0 rounded-2xl object-cover" />
  ) : <div className="h-20 w-20 shrink-0 rounded-2xl bg-slate-100 dark:bg-slate-800" />;
}

function mediaLabel(type: AnalyticsPost["mediaType"]) {
  return type === "IMAGE" ? "Single Image" : type === "CAROUSEL" ? "Carousel" : "Reels";
}

async function imageToDataUrl(url: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error("Thumbnail unavailable");
  const blob = await response.blob();
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("Invalid image"));
    reader.onerror = () => reject(reader.error ?? new Error("Image read failed"));
    reader.readAsDataURL(blob);
  });
}

function SummaryCard({ label, value, change, icon: Icon, note, showTrend = true }: { label: string; value: string; change: number | null; icon: typeof Heart; note?: string; showTrend?: boolean }) {
  return <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-4">
    <div className="flex items-start justify-between gap-2"><p className="text-[10px] font-black uppercase tracking-wide text-slate-500 sm:text-xs">{label}</p><Icon size={17} className="shrink-0 text-violet-600" /></div>
    <p className="mt-3 text-2xl font-black text-slate-950 dark:text-white sm:text-3xl">{value}</p>
    <div className="mt-2 flex min-h-4 items-center justify-between">{showTrend ? <Trend value={change} /> : <span />}{note ? <span className="text-[10px] font-semibold text-slate-400">{note}</span> : null}</div>
  </div>;
}

export function AnalyticsDashboard() {
  const [range, setRange] = useState<AnalyticsResponse["range"]>("7d");
  const [sortBy, setSortBy] = useState<"reactions" | "comments">("reactions");
  const [chartMode, setChartMode] = useState<"bar" | "stacked">("bar");
  const [commentsPost, setCommentsPost] = useState<AnalyticsPost | null>(null);
  const [duplicatePost, setDuplicatePost] = useState<AnalyticsPost | null>(null);
  const [exporting, setExporting] = useState(false);
  const [comparisonBannerDismissed, setComparisonBannerDismissed] = useState(false);
  const query = useAnalytics(range, sortBy);
  const data = query.data;
  const posts = useMemo(() => data?.topPosts ?? [], [data?.topPosts]);
  const summary = data?.summary;

  async function showComments(post: AnalyticsPost) {
    setCommentsPost(post);
  }

  async function exportReport() {
    if (!data) return;
    setExporting(true);
    try {
      const pdf = new jsPDF();
      const start = formatToWIB(data.period.start, "dd MMM yyyy");
      const end = formatToWIB(new Date(new Date(data.period.end).getTime() - 86400000), "dd MMM yyyy");
      let y = 20;
      pdf.setFontSize(22); pdf.text("AutoPost Analytics", 20, y); y += 10;
      pdf.setFontSize(10); pdf.text(`Periode: ${start} - ${end} WIB`, 20, y); y += 14;
      pdf.setFontSize(13); pdf.text("Summary KPI", 20, y); y += 8;
      const cards = [["Posts", summary?.posts.value], ["Followers", summary?.followers.value], ["Reactions", summary?.reactions.value], ["Comments", summary?.comments.value], ["Engagement Rate", summary ? percent.format(summary.engagementRate.value ?? 0) : "-"], ["Views", summary?.views.value]];
      pdf.setFontSize(10);
      cards.forEach(([label, value]) => { pdf.text(`${label}: ${typeof value === "number" ? compact.format(value) : value ?? "-"}`, 24, y); y += 6; });
      y += 5; pdf.setFontSize(13); pdf.text("Top 5 Posts", 20, y); y += 8; pdf.setFontSize(10);
      for (const [index, post] of posts.entries()) {
        if (post.thumbnailUrl) {
          try { pdf.addImage(await imageToDataUrl(post.thumbnailUrl), "JPEG", 20, y - 4, 12, 12); } catch { /* Thumbnail access is optional for PDF export. */ }
        }
        const line = `#${index + 1} ${mediaLabel(post.mediaType)} | ${compact.format(post.metrics.likes)} reactions | ${post.caption.slice(0, 70)}`;
        pdf.text(line, post.thumbnailUrl ? 36 : 24, y, { maxWidth: 153 });
        y += 15;
        if (y > 275) { pdf.addPage(); y = 20; }
      }
      y += 5; pdf.setFontSize(13); pdf.text("Posts Analytics", 20, y); y += 8; pdf.setFontSize(10);
      const counts = data.posts.reduce((result, post) => { result[post.mediaType] += 1; return result; }, { IMAGE: 0, CAROUSEL: 0, REELS: 0 });
      pdf.text(`Single Image: ${counts.IMAGE} | Carousel: ${counts.CAROUSEL} | Reels: ${counts.REELS}`, 24, y);
      pdf.save(`AutoPost-Analytics-${start.replaceAll(" ", "-")}-sampai-${end.replaceAll(" ", "-")}.pdf`);
    } finally { setExporting(false); }
  }

  if (query.isLoading) return <div className="space-y-6"><div className="shimmer h-24 rounded-3xl bg-slate-200 dark:bg-slate-800" /><div className="grid grid-cols-2 gap-3 xl:grid-cols-6">{Array.from({ length: 6 }).map((_, index) => <div key={index} className="shimmer h-32 rounded-2xl bg-slate-200 dark:bg-slate-800" />)}</div><div className="shimmer h-96 rounded-3xl bg-slate-200 dark:bg-slate-800" /></div>;

  return <div className="space-y-6">
    <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div><p className="text-xs font-black uppercase tracking-[0.2em] text-[#F97362]">Performance Intelligence</p><h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl dark:text-white">Analytics</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">Insight performa akun Instagram berdasarkan konten yang dipublish.</p></div>
      <div className="flex w-full min-w-0 items-center gap-2 lg:w-auto"><div className="scrollbar-hide flex min-w-0 flex-1 snap-x snap-mandatory gap-1 overflow-x-auto rounded-full border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-900 md:flex-none">{ranges.map((item) => <button key={item.value} type="button" onClick={() => setRange(item.value)} className={`min-h-10 shrink-0 snap-start rounded-full px-2.5 py-2 text-xs font-bold transition md:px-3 ${range === item.value ? "bg-slate-950 text-white dark:bg-white dark:text-slate-950" : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"}`}>{item.label}</button>)}</div><button type="button" onClick={exportReport} disabled={exporting || !data} aria-label="Export Report" className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-[#F97362] to-[#7C3AED] text-xs font-black text-white transition hover:shadow-md disabled:opacity-60 md:h-auto md:w-auto md:gap-2 md:rounded-full md:px-4 md:py-3"><FileDown size={16} /><span className="hidden md:inline">{exporting ? "Exporting..." : "Export Report"}</span></button></div>
    </section>
    {data?.warnings.length ? <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">{data.warnings.join(" ")}</div> : null}
    {data?.noComparisonDataAvailable && !comparisonBannerDismissed ? <div className="flex items-start gap-3 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900 dark:border-sky-900 dark:bg-sky-950/50 dark:text-sky-100"><Info className="mt-0.5 shrink-0 text-sky-600 dark:text-sky-300" size={18} /><p className="flex-1">Akun ini masih baru - perbandingan periode sebelumnya akan tersedia setelah ada cukup histori data.</p><button type="button" onClick={() => setComparisonBannerDismissed(true)} aria-label="Tutup informasi" className="rounded-full p-1 text-sky-600 transition hover:bg-sky-100 hover:text-sky-900 dark:text-sky-300 dark:hover:bg-sky-900"><X size={16} /></button></div> : null}
    <section className="grid grid-cols-2 gap-3 xl:grid-cols-6">
      <SummaryCard label="Posts" value={compact.format(summary?.posts.value ?? 0)} change={summary?.posts.change ?? null} icon={CalendarDays} showTrend={!data?.noComparisonDataAvailable} />
      <SummaryCard label="Total Followers" value={summary?.followers.value === null ? "-" : compact.format(summary?.followers.value ?? 0)} change={null} icon={Users} note="Live count" showTrend={!data?.noComparisonDataAvailable} />
      <SummaryCard label="Reactions" value={compact.format(summary?.reactions.value ?? 0)} change={summary?.reactions.change ?? null} icon={Heart} showTrend={!data?.noComparisonDataAvailable} />
      <SummaryCard label="Comments" value={compact.format(summary?.comments.value ?? 0)} change={summary?.comments.change ?? null} icon={MessageCircle} showTrend={!data?.noComparisonDataAvailable} />
      <SummaryCard label="Engagement Rate" value={percent.format(summary?.engagementRate.value ?? 0)} change={summary?.engagementRate.change ?? null} icon={BarChart3} showTrend={!data?.noComparisonDataAvailable} />
      <SummaryCard label="Views" value={compact.format(summary?.views.value ?? 0)} change={summary?.views.change ?? null} icon={Eye} note={data?.posts.some((post) => post.mediaType === "REELS") ? undefined : "Tidak ada Reels"} showTrend={!data?.noComparisonDataAvailable} />
    </section>
    <section className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-black text-slate-950 dark:text-white">Posts Analytics</h2><p className="mt-1 text-xs text-slate-500">Jumlah post publish per hari WIB</p></div><div className="flex rounded-full border border-slate-200 p-1 dark:border-slate-700"><button type="button" onClick={() => setChartMode("bar")} className={`rounded-full px-3 py-1.5 text-xs font-bold ${chartMode === "bar" ? "bg-violet-600 text-white" : "text-slate-500"}`}>Bar</button><button type="button" onClick={() => setChartMode("stacked")} className={`rounded-full px-3 py-1.5 text-xs font-bold ${chartMode === "stacked" ? "bg-violet-600 text-white" : "text-slate-500"}`}>Stacked</button></div></div><div className="mt-4 h-80"><ResponsiveContainer width="100%" height="100%"><BarChart data={data?.postsByDay ?? []}><CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" /><XAxis dataKey="date" tick={{ fontSize: 11 }} /><YAxis allowDecimals={false} /><Tooltip /><Legend /><Bar dataKey={chartMode === "bar" ? "total" : "image"} name={chartMode === "bar" ? "Total Posts" : "Single Image"} stackId={chartMode === "stacked" ? "content" : undefined} fill="#7C3AED" radius={[6, 6, 0, 0]} />{chartMode === "stacked" ? <><Bar dataKey="carousel" name="Carousel" stackId="content" fill="#F97362" /><Bar dataKey="reels" name="Reels" stackId="content" fill="#14B8A6" /></> : null}</BarChart></ResponsiveContainer></div></div>
      <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"><div className="flex items-center gap-3"><Users className="text-violet-600" /><h2 className="text-lg font-black text-slate-950 dark:text-white">Followers Analytics</h2></div><p className="mt-8 text-5xl font-black text-slate-950 dark:text-white">{summary?.followers.value === null ? "-" : compact.format(summary?.followers.value ?? 0)}</p><p className="mt-2 text-xs font-bold uppercase tracking-wide text-violet-600">Current live count</p><p className="mt-8 text-sm leading-6 text-slate-500 dark:text-slate-400">Grafik pertumbuhan followers akan tersedia setelah sistem melakukan pencatatan harian. Fitur ini sedang dalam pengembangan.</p></div>
    </section>
    <section><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-black text-slate-950 dark:text-white">Top 5 Posts</h2><p className="mt-1 text-xs text-slate-500">Sorotan performa terbaik pada periode ini</p></div><div className="flex rounded-full border border-slate-200 p-1 dark:border-slate-700"><button type="button" onClick={() => setSortBy("reactions")} className={`rounded-full px-3 py-1.5 text-xs font-bold ${sortBy === "reactions" ? "bg-slate-950 text-white dark:bg-white dark:text-slate-950" : "text-slate-500"}`}>Reactions</button><button type="button" onClick={() => setSortBy("comments")} className={`rounded-full px-3 py-1.5 text-xs font-bold ${sortBy === "comments" ? "bg-slate-950 text-white dark:bg-white dark:text-slate-950" : "text-slate-500"}`}>Comments</button></div></div><div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">{posts.map((post, index) => <article key={post.id} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"><div className="flex gap-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#F97362] to-[#7C3AED] text-sm font-black text-white">#{index + 1}</span><PostThumbnail post={post} /></div><p className="mt-3 line-clamp-2 text-sm font-bold text-slate-900 dark:text-slate-100">{post.caption}</p><div className="mt-2 flex items-center justify-between gap-2"><span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black text-slate-600 dark:bg-slate-800 dark:text-slate-300">{mediaLabel(post.mediaType)}</span><span className="text-xs text-slate-500">{formatToWIB(post.publishedAt, "dd MMM yyyy")}</span></div><div className="mt-3 flex items-center justify-between text-sm"><span className="font-black text-rose-600"><Heart size={14} className="mr-1 inline" />{compact.format(post.metrics.likes)}</span><span className="font-black text-sky-600"><MessageCircle size={14} className="mr-1 inline" />{compact.format(post.metrics.comments)}</span></div><div className="mt-4 grid grid-cols-2 gap-2"><button type="button" onClick={() => showComments(post)} className="inline-flex items-center justify-center gap-1 rounded-xl border border-slate-200 px-2 py-2 text-xs font-bold text-slate-700 dark:border-slate-700 dark:text-slate-200"><MessageSquare size={13} /> Comments</button><button type="button" onClick={() => setDuplicatePost(post)} className="rounded-xl bg-violet-600 px-2 py-2 text-xs font-bold text-white">Duplicate</button></div></article>)}</div></section>
    <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"><h2 className="text-lg font-black text-slate-950 dark:text-white">All Posts in Period</h2><div className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">{(data?.posts ?? []).map((post) => <div key={post.id} className="flex items-center gap-3 py-3"><PostThumbnail post={post} /><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-slate-900 dark:text-slate-100">{post.caption}</p><p className="mt-1 text-xs text-slate-500">{formatToWIB(post.publishedAt)}</p></div><span className="text-xs font-black text-slate-500">{compact.format(post.metrics.engagement)} engagement</span></div>)}</div></section>
    {commentsPost ? <CommentsPanel post={commentsPost} onClose={() => setCommentsPost(null)} /> : null}
    <ComposeModal open={Boolean(duplicatePost)} mode="create" defaultCaption={duplicatePost?.caption} defaultMediaType={duplicatePost?.mediaType} onClose={() => setDuplicatePost(null)} onSuccess={() => setDuplicatePost(null)} />
  </div>;
}

function CommentsPanel({ post, onClose }: { post: AnalyticsPost; onClose: () => void }) {
  const [comments, setComments] = useState<Array<{ id: string; text?: string; username?: string }>>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { let active = true; fetch(`/api/analytics/comments?mediaId=${post.igMediaId}`).then((response) => response.json()).then((data) => { if (active) setComments(data.comments ?? []); }).finally(() => { if (active) setLoading(false); }); return () => { active = false; }; }, [post.igMediaId]);
  return <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/60 px-4 backdrop-blur-sm"><div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-slate-900"><div className="flex items-center justify-between"><h2 className="font-black text-slate-950 dark:text-white">Comments</h2><button type="button" onClick={onClose} className="rounded-full p-2 hover:bg-slate-100 dark:hover:bg-slate-800"><X size={18} /></button></div><div className="mt-4 max-h-80 space-y-3 overflow-y-auto">{loading ? <p className="text-sm text-slate-500">Memuat komentar...</p> : comments.length ? comments.map((comment) => <div key={comment.id} className="rounded-2xl bg-slate-100 p-3 text-sm dark:bg-slate-800"><strong>{comment.username ?? "User"}</strong><p className="mt-1 text-slate-600 dark:text-slate-300">{comment.text ?? ""}</p></div>) : <p className="text-sm text-slate-500">Belum ada komentar atau komentar tidak tersedia.</p>}</div></div></div>;
}
