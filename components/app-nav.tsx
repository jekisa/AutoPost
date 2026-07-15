"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Menu, X } from "lucide-react";
import { signOut } from "next-auth/react";
import { useState } from "react";
import { ThemeToggle } from "@/components/theme-toggle";

const navItems = [
  { href: "/", label: "Dashboard" },
  { href: "/compose", label: "Compose" },
  { href: "/settings", label: "Settings" }
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
      <nav className="hidden items-center gap-1 rounded-full border border-slate-200 bg-white/80 p-1 text-sm shadow-sm backdrop-blur md:flex dark:border-slate-800 dark:bg-slate-950/70">
        {navItems.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-full px-4 py-2 font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 ${
                active
                  ? "bg-teal-600 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="hidden items-center gap-2 md:flex">
        {userEmail ? (
          <span className="max-w-48 truncate rounded-full bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300" title={userEmail}>
            {userEmail}
          </span>
        ) : null}
        <button
          type="button"
          onClick={() => setConfirmOpen(true)}
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 shadow-sm transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-rose-800 dark:hover:bg-rose-950 dark:hover:text-rose-200"
        >
          <LogOut size={16} /> Logout
        </button>
      </div>
      <ThemeToggle />
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition-colors hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500 md:hidden dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
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
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`block rounded-xl px-4 py-3 text-sm font-medium ${
                  active
                    ? "bg-teal-600 text-white"
                    : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                }`}
              >
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
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/55 px-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="logout-title">
          <div className="w-full max-w-sm rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-950">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-200">
              <LogOut size={22} />
            </div>
            <h2 id="logout-title" className="mt-4 text-lg font-black text-slate-950 dark:text-white">
              Keluar dari AutoPost?
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
              Apakah kamu yakin ingin keluar{userEmail ? ` dari akun ${userEmail}` : ""}?
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                disabled={loggingOut}
                className="rounded-full border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={confirmLogout}
                disabled={loggingOut}
                className="inline-flex items-center gap-2 rounded-full bg-rose-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-500 disabled:opacity-50"
              >
                <LogOut size={16} /> {loggingOut ? "Keluar..." : "Ya, Keluar"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
