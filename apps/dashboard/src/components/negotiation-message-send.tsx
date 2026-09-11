"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function NegotiationMessageSend({ messageId }: { messageId: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function send() {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/negotiations/messages/${messageId}/send`, { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? "Send failed");
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-1 flex items-center gap-2">
      <button
        onClick={send}
        disabled={busy}
        className="rounded-md bg-emerald-600 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
      >
        {busy ? "..." : "Approve & Send"}
      </button>
      {error && <span className="text-xs text-red-400">{error}</span>}
    </div>
  );
}
