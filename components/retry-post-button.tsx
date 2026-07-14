"use client";

import { useState } from "react";
import { RotateCcw } from "lucide-react";

export function RetryPostButton({ postId }: { postId: string }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function retry() {
    setLoading(true);
    setMessage("");
    const response = await fetch(`/api/posts/${postId}/retry`, { method: "POST" });
    const data = await response.json();
    setLoading(false);

    if (response.ok) {
      window.location.reload();
      return;
    }

    setMessage(data.error ?? "Retry gagal.");
  }

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={retry}
        disabled={loading}
        className="inline-flex items-center gap-1.5 rounded-md border border-red-200 bg-white px-2 py-1 text-xs font-medium text-red-700 disabled:opacity-60"
      >
        <RotateCcw size={13} /> {loading ? "Retrying..." : "Retry"}
      </button>
      {message ? <p className="mt-1 max-w-xs text-xs text-red-700">{message}</p> : null}
    </div>
  );
}
