"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, LayoutDashboard, LogOut, Menu, PenLine, Settings, X } from "lucide-react";
import { signOut } from "next-auth/react";
import { useState } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import { AppModal } from "@/components/ui/app-modal";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/compose", label: "Compose", icon: PenLine },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings }
];

export function AppNav({ signedIn, userEmail }: { signedIn: boolean; userEmail?: string | null }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  if (!signedIn) {
    return <ThemeToggle />;
  }

  async function confirmLogout() {
    setLoggingOut(true);
    await signOut({ callbackUrl: "/login" });
  }

  return (
    <div className="flex items-center gap-2">
      <nav className="hidden items-center gap-1 rounded-2xl border border-slate-200 bg-white/85 p-1.5 text-sm shadow-[0_14px_40px_rgb(15_23_42/0.08)] backdrop-blur-xl md:flex dark:border-slate-800 dark:bg-slate-950/80">
        {navItems.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "inline-flex items-center gap-2 rounded-xl px-3.5 py-2 font-bold transition-all focus:outline-none focus:ring-2 focus:ring-teal-500",
                active
                  ? "bg-slate-950 text-white shadow-sm dark:bg-white dark:text-slate-950"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
              )}
            >
              <Icon size={16} />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="hidden items-center gap-2 rounded-2xl border border-slate-200 bg-white/85 p-1.5 shadow-[0_14px_40px_rgb(15_23_42/0.08)] backdrop-blur-xl md:flex dark:border-slate-800 dark:bg-slate-950/80">
        {userEmail ? (
          <span className="max-w-48 truncate rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300" title={userEmail}>
            {userEmail}
          </span>
        ) : null}
        <button
          type="button"
          onClick={() => setConfirmOpen(true)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-slate-700 transition-colors hover:bg-rose-50 hover:text-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-500 dark:text-slate-100 dark:hover:bg-rose-950 dark:hover:text-rose-200"
          aria-label="Logout"
          title="Logout"
        >
          <LogOut size={16} />
        </button>
      </div>
      <ThemeToggle />
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition-colors hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500 md:hidden dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        aria-label="Toggle navigation"
      >
        {open ? <X size={18} /> : <Menu size={18} />}
      </button>
      {open ? (
        <div className="absolute left-4 right-4 top-16 z-50 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl md:hidden dark:border-slate-800 dark:bg-slate-950">
          {userEmail ? (
            <div className="mb-2 rounded-xl bg-slate-100 px-4 py-3 text-xs font-semibold text-slate-600 dark:bg-slate-900 dark:text-slate-300">
              Signed in as
              <span className="mt-1 block truncate text-sm text-slate-950 dark:text-white">{userEmail}</span>
            </div>
          ) : null}
          {navItems.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold ${
                  active
                    ? "bg-slate-950 text-white dark:bg-white dark:text-slate-950"
                    : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                }`}
              >
                <Icon size={17} />
                {item.label}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              setConfirmOpen(true);
            }}
            className="mt-2 flex w-full items-center gap-2 rounded-xl px-4 py-3 text-left text-sm font-bold text-rose-700 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-950"
          >
            <LogOut size={16} /> Logout
          </button>
        </div>
      ) : null}
      {confirmOpen ? (
        <AppModal open onClose={() => setConfirmOpen(false)} eyebrow="Account" title="Keluar dari AutoPost?" description={`Apakah kamu yakin ingin keluar${userEmail ? ` dari akun ${userEmail}` : ""}?`} className="max-w-sm" footer={<div className="flex justify-end gap-2"><button type="button" onClick={() => setConfirmOpen(false)} disabled={loggingOut} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-white disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">Batal</button><button type="button" onClick={confirmLogout} disabled={loggingOut} className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-sm font-bold text-white hover:bg-rose-700 disabled:opacity-50"><LogOut size={16} /> {loggingOut ? "Keluar..." : "Ya, Keluar"}</button></div>}>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-200">
              <LogOut size={22} />
            </div>
        </AppModal>
      ) : null}
    </div>
  );
}
