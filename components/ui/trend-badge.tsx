import { ArrowDown, ArrowUp } from "lucide-react";

export function TrendBadge({ value }: { value: number | null }) {
  if (value === null) {
    return <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black text-slate-500 dark:bg-slate-800 dark:text-slate-300">N/A</span>;
  }

  const positive = value >= 0;
  return <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-black ${positive ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200" : "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-200"}`}>
    {positive ? <ArrowUp size={11} /> : <ArrowDown size={11} />}
    {Math.abs(value).toFixed(1)}%
  </span>;
}
