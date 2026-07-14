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
    <form onSubmit={submit} className="space-y-5 rounded-lg border border-stone-200 bg-white p-6">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-1 text-sm font-medium">
          IG User ID
          <input name="igUserId" required defaultValue={initialValues?.igUserId} className="w-full rounded-md border px-3 py-2 font-normal" />
        </label>
        <label className="space-y-1 text-sm font-medium">
          Page ID
          <input name="pageId" required defaultValue={initialValues?.pageId} className="w-full rounded-md border px-3 py-2 font-normal" />
        </label>
      </div>
      <label className="block space-y-1 text-sm font-medium">
        Long-lived Access Token
        <textarea name="accessToken" required rows={4} className="w-full rounded-md border px-3 py-2 font-normal" />
      </label>
      <label className="block space-y-1 text-sm font-medium">
        Token Expires At
        <input name="tokenExpiresAt" type="datetime-local" className="w-full rounded-md border px-3 py-2 font-normal" />
      </label>
      <button disabled={loading} className="rounded-md bg-moss px-4 py-2 text-sm font-medium text-white disabled:opacity-60">
        {loading ? "Testing..." : "Save & Test Connection"}
      </button>
      {message ? <p className="text-sm text-stone-700">{message}</p> : null}
      {initialValues?.tokenExpiresAt ? (
        <p className="text-xs text-stone-500">Stored token expiry: {initialValues.tokenExpiresAt.toLocaleString()}</p>
      ) : null}
    </form>
  );
}
