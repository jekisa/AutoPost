"use client";

import { FormEvent, useState } from "react";

type Props = {
  initialValues?: {
    igUserId: string;
    pageId: string;
    username?: string | null;
    tokenExpiresAt?: Date | null;
  } | null;
};

export function SettingsForm({ initialValues }: Props) {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    const response = await fetch("/api/settings", {
      method: "POST",
      body: new FormData(event.currentTarget)
    });
    const data = await response.json();
    setLoading(false);
    setMessage(response.ok ? `Tersimpan. Connected as ${data.username ?? data.igUserId}.` : data.error);
  }

  return (
    <form onSubmit={submit} className="space-y-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2 text-sm font-bold text-slate-800 dark:text-slate-200">
          IG User ID
          <input name="igUserId" required defaultValue={initialValues?.igUserId} className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 font-normal focus:outline-none focus:ring-2 focus:ring-teal-500 dark:border-slate-700 dark:bg-slate-950" />
        </label>
        <label className="space-y-2 text-sm font-bold text-slate-800 dark:text-slate-200">
          Page ID
          <input name="pageId" required defaultValue={initialValues?.pageId} className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 font-normal focus:outline-none focus:ring-2 focus:ring-teal-500 dark:border-slate-700 dark:bg-slate-950" />
        </label>
      </div>
      <label className="block space-y-2 text-sm font-bold text-slate-800 dark:text-slate-200">
        Long-lived Access Token
        <textarea name="accessToken" required rows={4} className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 font-normal focus:outline-none focus:ring-2 focus:ring-teal-500 dark:border-slate-700 dark:bg-slate-950" />
      </label>
      <label className="block space-y-2 text-sm font-bold text-slate-800 dark:text-slate-200">
        Token Expires At
        <input name="tokenExpiresAt" type="datetime-local" className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 font-normal focus:outline-none focus:ring-2 focus:ring-teal-500 dark:border-slate-700 dark:bg-slate-950" />
      </label>
      <button disabled={loading} className="rounded-full bg-teal-600 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-60">
        {loading ? "Testing..." : "Save & Test Connection"}
      </button>
      {message ? <p className="rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-700 dark:bg-slate-950 dark:text-slate-300">{message}</p> : null}
      {initialValues?.tokenExpiresAt ? (
        <p className="text-xs text-slate-500 dark:text-slate-400">Stored token expiry: {initialValues.tokenExpiresAt.toLocaleString()}</p>
      ) : null}
    </form>
  );
}
