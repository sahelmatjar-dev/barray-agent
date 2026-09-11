"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CustomsVerifyForm({ recordId, candidateHsCode }: { recordId: string; candidateHsCode: string | null }) {
  const [hsCode, setHsCode] = useState(candidateHsCode ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function verify() {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/customs/${recordId}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hsCode }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? "Failed");
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-2 flex items-center gap-2">
      <input
        value={hsCode}
        onChange={(e) => setHsCode(e.target.value)}
        placeholder="Confirmed HS code"
        className="w-40 rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-200"
      />
      <button
        onClick={verify}
        disabled={busy || hsCode.length < 4}
        className="rounded-md bg-amber-500 px-3 py-1 text-xs font-medium text-slate-950 hover:bg-amber-400 disabled:opacity-50"
      >
        {busy ? "..." : "Confirm verified"}
      </button>
      {error && <span className="text-xs text-red-400">{error}</span>}
    </div>
  );
}
