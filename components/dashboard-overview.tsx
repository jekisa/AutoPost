"use client";

import { formatDistanceToNow } from "date-fns";
import { id } from "date-fns/locale";
import { ArrowUpRight, BarChart3, CalendarClock, Check, Clock3, Edit3, FileText, Heart, Lightbulb, MessageCircle, MessageSquare, Plus, RefreshCw, Send, Target, TrendingUp, Users, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Line, LineChart, ResponsiveContainer } from "recharts";
import { ComposeModal } from "@/components/compose-modal";
import { TrendBadge } from "@/components/ui/trend-badge";
import { Avatar } from "@/components/ui/avatar";
import { useDashboardOverview, useMarkCommentsRead, useSaveWeeklyGoal, type OverviewComment, type OverviewPost } from "@/hooks/useDashboardOverview";
import type { PostListItem } from "@/hooks/usePosts";
import { formatToWIB } from "@/lib/timezone";
import { cn } from "@/lib/utils";
import { AppModal } from "@/components/ui/app-modal";

const compact = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });

function greetingLabel(date: string) {
  const hour = Number(formatToWIB(date, "HH"));
  return hour >= 4 && hour < 11 ? "Good Morning" : hour < 15 ? "Good Afternoon" : hour < 19 ? "Good Evening" : "Good Night";
}

function PostThumb({ post, className = "h-14 w-14" }: { post: OverviewPost; className?: string }) {
  const asset = post.mediaAssets[0];
  return asset ? (asset.type === "VIDEO" ? <video src={asset.url} className={`${className} shrink-0 rounded-2xl object-cover`} muted /> : (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={asset.url} alt="" className={`${className} shrink-0 rounded-2xl object-cover`} />
  )) : <div className={`${className} shrink-0 rounded-2xl bg-slate-100 dark:bg-slate-800`} />;
}

function SectionTitle({ icon: Icon, title, action }: { icon: typeof Target; title: string; action?: React.ReactNode }) {
  return <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><Icon size={18} className="text-violet-600" /><h2 className="text-lg font-black text-slate-950 dark:text-white">{title}</h2></div>{action}</div>;
}

function PulseChange({ value }: { value: number | null }) {
  return <TrendBadge value={value} />;
}

function Sparkline({ values, color, target }: { values: number[]; color: string; target?: number }) {
  if (values.length < 2) return null;
  const chartData = values.map((value, index) => ({ index, value, target }));
  return <div className="mt-4 h-10 w-full opacity-80" aria-hidden="true"><ResponsiveContainer width="100%" height="100%"><LineChart data={chartData}><Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={false} isAnimationActive={false} /><Line type="monotone" dataKey="target" stroke="#94a3b8" strokeWidth={1} strokeDasharray="3 3" dot={false} isAnimationActive={false} /></LineChart></ResponsiveContainer></div>;
}

function MetricCard({
  asButton,
  title,
  value,
  caption,
  icon: Icon,
  accent,
  children,
  onClick
}: {
  asButton?: boolean;
  title: string;
  value: React.ReactNode;
  caption?: React.ReactNode;
  icon: typeof Target;
  accent: "coral" | "violet" | "sky";
  children?: React.ReactNode;
  onClick?: () => void;
}) {
  const accents = {
    coral: "from-[#F97362] to-rose-500 text-[#F97362] bg-[#F97362]/10 border-[#F97362]/20",
    violet: "from-violet-600 to-fuchsia-500 text-violet-600 bg-violet-600/10 border-violet-600/20",
    sky: "from-sky-500 to-cyan-500 text-sky-600 bg-sky-600/10 border-sky-600/20"
  };
  const Tag = asButton ? "button" : "div";

  return (
    <Tag
      type={asButton ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition-all dark:border-slate-800 dark:bg-slate-900",
        "before:absolute before:inset-x-0 before:top-0 before:h-1 before:bg-gradient-to-r",
        accents[accent].split(" ").slice(0, 2).join(" "),
        asButton && "cursor-pointer hover:-translate-y-1 hover:border-violet-300 hover:shadow-xl hover:shadow-slate-950/10 focus:outline-none focus:ring-2 focus:ring-violet-300"
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-slate-500">{title}</p>
          <div className="mt-4 text-3xl font-black tracking-tight text-slate-950 dark:text-white">{value}</div>
        </div>
        <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border", accents[accent].split(" ").slice(2).join(" "))}>
          <Icon size={20} />
        </div>
      </div>
      {caption ? <div className="mt-2 text-sm font-bold text-slate-500 dark:text-slate-400">{caption}</div> : null}
      {children}
    </Tag>
  );
}

export function DashboardOverview() {
  const query = useDashboardOverview();
  const saveGoal = useSaveWeeklyGoal();
  const markRead = useMarkCommentsRead();
  const [goalOpen, setGoalOpen] = useState(false);
  const [goalValue, setGoalValue] = useState(3);
  const [modal, setModal] = useState<OverviewPost | "template" | null>(null);
  const [templateCaption, setTemplateCaption] = useState("");
  const data = query.data;

  if (query.isLoading) return <div className="space-y-6"><div className="shimmer h-24 rounded-3xl bg-slate-200 dark:bg-slate-800" /><div className="grid gap-3 md:grid-cols-3">{Array.from({ length: 3 }).map((_, index) => <div key={index} className="shimmer h-36 rounded-3xl bg-slate-200 dark:bg-slate-800" />)}</div><div className="grid gap-6 lg:grid-cols-[1fr_360px]"><div className="shimmer h-96 rounded-3xl bg-slate-200 dark:bg-slate-800" /><div className="shimmer h-96 rounded-3xl bg-slate-200 dark:bg-slate-800" /></div></div>;
  if (query.isError || !data) return <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-rose-800">Dashboard gagal dimuat. {query.error instanceof Error ? query.error.message : "Coba refresh halaman."}</div>;

  const templates = [
    { title: "When everything went wrong in one week", description: "Cerita jujur dengan twist yang relatable.", icon: TrendingUp },
    { title: "Share something you changed your mind about", description: "Bagikan perubahan perspektif yang bermakna.", icon: MessageSquare },
    { title: "How I landed [result] without [expected method]", description: "Bongkar cara tidak biasa mencapai hasil.", icon: Target },
    { title: "Is this overrated - or just misunderstood?", description: "Mulai percakapan dari pertanyaan yang memancing opini.", icon: Lightbulb }
  ];
  function openTemplate(caption: string) { setTemplateCaption(caption); setModal("template"); }
  function save() { saveGoal.mutate(goalValue, { onSuccess: () => setGoalOpen(false) }); }
  function viewPost(post: OverviewPost) { setModal(post); }
  const postForModal = modal && modal !== "template" ? modal as PostListItem : null;

  return <div className="dashboard-overview space-y-6">
    <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div className="flex items-center gap-3"><Avatar name={data.greeting.name} className="h-12 w-12 text-lg sm:h-14 sm:w-14" /><div><p className="text-xs font-black uppercase tracking-[0.2em] text-[#F97362]">Your publishing cockpit</p><h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl dark:text-white">{greetingLabel(data.today)}, {data.greeting.name}!</h1></div></div><p className="text-sm font-semibold text-slate-500">{formatToWIB(data.today, "EEE, MMM dd yyyy")}</p></section>
    {data.warnings.length ? <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">{data.warnings.join(" ")}</div> : null}

    <section className="grid gap-3 md:grid-cols-3">
      <MetricCard title="Week Streak" value={`${data.summary.streak} minggu`} caption={data.summary.progressStatus} icon={TrendingUp} accent="coral">
        <Sparkline values={data.history.map((week) => week.posts)} color="#F97362" />
      </MetricCard>
      <MetricCard asButton onClick={() => { setGoalValue(data.summary.target ?? 3); setGoalOpen(true); }} title="Posting Goals" value={data.summary.target ? `${data.summary.currentWeekPosts} / ${data.summary.target}` : "No goals"} caption={data.summary.target ? "posts this week" : <span className="inline-flex items-center gap-1 text-violet-600">Set Goal <ArrowUpRight size={15} /></span>} icon={Edit3} accent="violet">
        {data.summary.target ? <><div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-full rounded-full bg-gradient-to-r from-[#F97362] to-[#7C3AED]" style={{ width: `${Math.min(data.summary.currentWeekPosts / data.summary.target * 100, 100)}%` }} /></div><p className="mt-2 text-sm font-bold text-violet-600">{data.summary.progressStatus}</p><Sparkline values={data.history.map((week) => week.posts)} color="#7C3AED" target={data.summary.target} /></> : null}
      </MetricCard>
      <MetricCard title="Comment Score" value={data.summary.commentScore === "Not enough data yet" ? "N/A" : data.summary.commentAverage.toFixed(1)} caption={<><span className="block text-xs font-semibold text-slate-400">avg. comments/post</span><span className="mt-1 block text-sky-600">{data.summary.commentScore}</span></>} icon={MessageCircle} accent="sky">
        {data.summary.commentScore !== "Not enough data yet" ? <Sparkline values={data.history.map((week) => week.commentAverage)} color="#0EA5E9" /> : null}
      </MetricCard>
    </section>

    <section><SectionTitle icon={BarChart3} title="Weekly Pulse" /><div className="mt-3 grid gap-3 sm:grid-cols-3"><div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"><p className="text-xs font-bold text-slate-500">Posts</p><p className="mt-2 text-2xl font-black dark:text-white">{data.weeklyPulse.posts}</p><PulseChange value={data.weeklyPulse.postsChange} /></div><div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"><p className="text-xs font-bold text-slate-500">Total Followers</p><p className="mt-2 text-2xl font-black dark:text-white">{data.weeklyPulse.followers === null ? "-" : compact.format(data.weeklyPulse.followers)}</p><span className="text-xs font-bold text-slate-400">Live count</span></div><div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"><p className="text-xs font-bold text-slate-500">Comments</p><p className="mt-2 text-2xl font-black dark:text-white">{compact.format(data.weeklyPulse.comments)}</p><span className="text-xs font-bold text-slate-400">Minggu ini</span></div></div></section>

    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-6">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"><SectionTitle icon={CalendarClock} title={`Up Next - ${data.upcoming.length} posts scheduled`} action={<Link href="/compose" className="text-xs font-black text-violet-600">Lihat semua</Link>} /><div className="mt-4 space-y-2">{data.upcoming.slice(0, 5).map((post) => <button key={post.id} type="button" onClick={() => viewPost(post)} className="flex w-full items-center gap-3 rounded-2xl p-2 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800"><PostThumb post={post} /><div className="min-w-0 flex-1"><p className="text-xs font-black text-violet-600">{formatToWIB(post.scheduledAt)}</p><p className="mt-1 line-clamp-1 text-sm font-bold text-slate-800 dark:text-slate-100">{post.caption}</p><span className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold text-slate-400"><Send size={10} /> Instagram</span></div></button>)}{!data.upcoming.length ? <div className="py-8 text-center"><Clock3 className="mx-auto text-slate-400" /><p className="mt-3 text-sm font-bold text-slate-500">Belum ada konten terjadwal</p><button type="button" onClick={() => setModal("template")} className="mt-3 inline-flex items-center gap-2 rounded-full bg-violet-600 px-4 py-2 text-xs font-black text-white"><Plus size={14} /> Jadwalkan Post</button></div> : null}</div></section>
        <section><SectionTitle icon={Lightbulb} title="Templates - Ide Konten" /><div className="mt-3 grid gap-3 sm:grid-cols-2">{templates.map((template) => <button key={template.title} type="button" onClick={() => openTemplate(template.title)} className="rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-violet-300 dark:border-slate-800 dark:bg-slate-900"><template.icon className="text-[#F97362]" size={20} /><p className="mt-3 text-sm font-black text-slate-900 dark:text-white">{template.title}</p><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{template.description}</p></button>)}</div></section>
      </div>
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"><SectionTitle icon={MessageSquare} title={`Comments Inbox${data.comments.unreadCount ? ` (${data.comments.unreadCount})` : ""}`} action={<button type="button" onClick={() => markRead.mutate()} className="text-xs font-black text-violet-600">Mark all read</button>} /><div className="mt-4 max-h-[620px] space-y-2 overflow-y-auto">{data.comments.items.map((comment) => <CommentItem key={comment.id} comment={comment} unread={Boolean(comment.unread)} />)}{!data.comments.items.length ? <div className="py-10 text-center"><MessageCircle className="mx-auto text-slate-400" /><p className="mt-3 text-sm font-bold text-slate-500">Belum ada komentar masuk</p></div> : null}</div></section>
    </div>
    {goalOpen ? <GoalModal value={goalValue} onChange={setGoalValue} onClose={() => setGoalOpen(false)} onSave={save} saving={saveGoal.isPending} /> : null}
    <ComposeModal open={Boolean(modal)} mode={modal && modal !== "template" ? "view" : "create"} post={postForModal} defaultCaption={modal === "template" ? templateCaption : undefined} onClose={() => setModal(null)} onSuccess={() => setModal(null)} />
  </div>;
}

function CommentItem({ comment, unread }: { comment: OverviewComment; unread: boolean }) {
  return <div className={`flex gap-3 rounded-2xl p-3 ${unread ? "bg-violet-50 dark:bg-violet-950/30" : "bg-slate-50 dark:bg-slate-800/60"}`}><Avatar name={comment.username} className="h-9 w-9 text-xs" /><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><p className="truncate text-xs font-black text-slate-900 dark:text-white">@{comment.username}</p><span className="shrink-0 text-[10px] text-slate-400">{formatDistanceToNow(new Date(comment.timestamp), { addSuffix: true, locale: id })}</span></div><p className="mt-1 line-clamp-3 text-sm text-slate-600 dark:text-slate-300">{comment.text}</p></div></div>;
}

function GoalModal({ value, onChange, onClose, onSave, saving }: { value: number; onChange: (value: number) => void; onClose: () => void; onSave: () => void; saving: boolean }) {
  return <AppModal open onClose={onClose} eyebrow="Weekly planning" title="Posting Goals" description="Atur target publish mingguanmu agar progress dashboard tetap terarah." footer={<div className="flex gap-2"><button type="button" onClick={onClose} disabled={saving} className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 hover:bg-white disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">Batal</button><button type="button" onClick={onSave} disabled={saving} className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#F97362] to-[#7C3AED] px-4 py-3 text-sm font-black text-white disabled:opacity-60"><Check size={16} /> {saving ? "Saving..." : "Save Goal"}</button></div>}><label className="block text-sm font-bold text-slate-700 dark:text-slate-200">Target post per minggu<input type="number" min={1} max={100} value={value} onChange={(event) => onChange(Number(event.target.value))} className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100 dark:border-slate-700 dark:bg-slate-950" /></label></AppModal>;
}
