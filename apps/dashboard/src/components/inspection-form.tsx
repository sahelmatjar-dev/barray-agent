"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Result = "PASS" | "WARNING" | "FAIL" | "UNKNOWN";
type Category = "ENGINE" | "GEARBOX" | "AXLES" | "CHASSIS" | "ELECTRONICS" | "HYDRAULIC";

const CHECKLIST: Record<Category, string[]> = {
  ENGINE: ["cold_start", "smoke", "blow_by", "oil_pressure", "leaks", "noise", "turbo", "coolant", "injectors"],
  GEARBOX: ["shifting", "noise", "leaks", "clutch"],
  AXLES: ["differential_noise", "leaks", "bearings"],
  CHASSIS: ["cracks", "welding", "deformation", "accident_evidence"],
  ELECTRONICS: ["fault_codes", "ecu", "dashboard", "sensors"],
  HYDRAULIC: ["pto", "pump", "cylinder", "hoses"],
};

const RESULTS: Result[] = ["PASS", "WARNING", "FAIL", "UNKNOWN"];

export function InspectionForm({ opportunities }: { opportunities: { id: string; code: string; model: string; configuration: string }[] }) {
  const router = useRouter();
  const [opportunityId, setOpportunityId] = useState(opportunities[0]?.id ?? "");
  const [inspectorName, setInspectorName] = useState("");
  const [findings, setFindings] = useState<Record<string, Result>>(() => {
    const initial: Record<string, Result> = {};
    for (const [category, items] of Object.entries(CHECKLIST)) {
      for (const item of items) initial[`${category}:${item}`] = "UNKNOWN";
    }
    return initial;
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ score: number; recommendation: string } | null>(null);

  async function submit() {
    setError(null);
    setBusy(true);
    try {
      const payload = {
        opportunityId,
        inspectorName,
        findings: Object.entries(findings).map(([key, res]) => {
          const [category, item_code] = key.split(":");
          return { category, item_code, result: res };
        }),
      };
      const res = await fetch("/api/inspections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error ?? "Failed");
        return;
      }
      setResult({ score: body.score, recommendation: body.recommendation });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  if (result) {
    return (
      <div className="rounded-lg border border-slate-800 bg-slate-900 p-6 text-center">
        <div className="text-2xl font-semibold text-amber-400">{result.score}/100</div>
        <div className="mt-1 text-sm text-slate-300">Recommendation: {result.recommendation}</div>
        <p className="mt-2 text-xs text-slate-500">An APPROVE_INSPECTION request was created for the owner.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs text-slate-400">Opportunity</label>
          <select
            value={opportunityId}
            onChange={(e) => setOpportunityId(e.target.value)}
            className="w-full rounded-md border border-slate-700 bg-slate-800 px-2 py-2 text-sm text-slate-200"
          >
            {opportunities.map((o) => (
              <option key={o.id} value={o.id}>{o.code} — SITRAK {o.model} {o.configuration}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-400">Inspector name</label>
          <input
            value={inspectorName}
            onChange={(e) => setInspectorName(e.target.value)}
            className="w-full rounded-md border border-slate-700 bg-slate-800 px-2 py-2 text-sm text-slate-200"
          />
        </div>
      </div>

      {(Object.entries(CHECKLIST) as [Category, string[]][]).map(([category, items]) => (
        <div key={category} className="rounded-lg border border-slate-800 bg-slate-900 p-4">
          <div className="mb-2 text-sm font-semibold text-slate-300">{category}</div>
          <div className="space-y-2">
            {items.map((item) => (
              <div key={item} className="flex items-center justify-between text-sm">
                <span className="text-slate-400">{item.replace(/_/g, " ")}</span>
                <div className="flex gap-1">
                  {RESULTS.map((r) => (
                    <button
                      key={r}
                      onClick={() => setFindings((f) => ({ ...f, [`${category}:${item}`]: r }))}
                      className={`rounded-md px-2 py-1 text-xs ${
                        findings[`${category}:${item}`] === r
                          ? r === "PASS" ? "bg-emerald-600 text-white" : r === "FAIL" ? "bg-red-600 text-white" : r === "WARNING" ? "bg-amber-600 text-white" : "bg-slate-600 text-white"
                          : "bg-slate-800 text-slate-400"
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {error && <p className="text-sm text-red-400">{error}</p>}

      <button
        onClick={submit}
        disabled={busy || !opportunityId || !inspectorName}
        className="rounded-md bg-amber-500 px-4 py-2 text-sm font-medium text-slate-950 hover:bg-amber-400 disabled:opacity-50"
      >
        {busy ? "..." : "Submit inspection"}
      </button>
    </div>
  );
}
