"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function SettingEditor({ settingKey, value, canEdit }: { settingKey: string; value: unknown; canEdit: boolean }) {
  const [text, setText] = useState(JSON.stringify(value, null, 2));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  async function save() {
    setError(null);
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      setError("Invalid JSON");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/settings/system/${settingKey}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value: parsed }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? "Save failed");
        return;
      }
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-2">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        readOnly={!canEdit}
        rows={6}
        className="w-full rounded-md border border-slate-700 bg-slate-800 p-2 font-mono text-xs text-slate-200"
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
      {canEdit && (
        <button
          onClick={save}
          disabled={saving}
          className="rounded-md bg-amber-500 px-3 py-1 text-xs font-medium text-slate-950 hover:bg-amber-400 disabled:opacity-50"
        >
          {saving ? "..." : "Save"}
        </button>
      )}
    </div>
  );
}
