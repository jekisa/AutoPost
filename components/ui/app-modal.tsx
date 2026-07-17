"use client";

import { X } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type AppModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  eyebrow?: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  labelledBy?: string;
};

export function AppModal({ open, onClose, title, description, eyebrow, children, footer, className, labelledBy }: AppModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose, open]);

  if (!open) return null;
  const titleId = labelledBy ?? `modal-title-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/65 p-0 backdrop-blur-md sm:items-center sm:p-5" role="dialog" aria-modal="true" aria-labelledby={titleId} onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className={cn("app-modal-enter relative flex max-h-[min(92vh,900px)] w-full flex-col overflow-hidden border border-white/20 bg-white shadow-2xl dark:bg-slate-950 sm:rounded-[2rem]", className ?? "max-w-lg")}>
        <div className="flex items-start justify-between gap-4 border-b border-slate-200/80 bg-white/90 px-5 py-4 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90 sm:px-6">
          <div className="min-w-0">
            {eyebrow ? <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#F97362]">{eyebrow}</p> : null}
            <h2 id={titleId} className="mt-1 truncate text-lg font-black text-slate-950 dark:text-white">{title}</h2>
            {description ? <p className="mt-1 text-sm leading-5 text-slate-500 dark:text-slate-400">{description}</p> : null}
          </div>
          <button type="button" onClick={onClose} className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-100 hover:text-slate-950 focus:outline-none focus:ring-2 focus:ring-violet-400 dark:border-slate-700 dark:hover:bg-slate-800 dark:hover:text-white" aria-label="Tutup modal" title="Tutup">
            <X size={17} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6">{children}</div>
        {footer ? <div className="border-t border-slate-200/80 bg-slate-50/80 px-5 py-4 dark:border-slate-800 dark:bg-slate-900/60 sm:px-6">{footer}</div> : null}
      </div>
    </div>
  );
}
