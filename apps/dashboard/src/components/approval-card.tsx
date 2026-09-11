"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Locale, getDictionary } from "@/i18n/dictionaries";
import type { OwnerDecisionCard } from "@barray/database";

const GATE_LABEL: Record<string, Record<Locale, string>> = {
  APPROVE_SUPPLIER: { ar: "موافقة مورد", fr: "Approbation fournisseur", en: "Supplier approval" },
  APPROVE_INSPECTION: { ar: "موافقة فحص", fr: "Approbation inspection", en: "Inspection approval" },
  APPROVE_PURCHASE: { ar: "موافقة شراء", fr: "Approbation achat", en: "Purchase approval" },
  RELEASE_PAYMENT: { ar: "الإفراج عن الدفع", fr: "Libération du paiement", en: "Release payment" },
};

const RISK_COLOR: Record<string, string> = {
  LOW: "text-emerald-400", MEDIUM: "text-amber-400", HIGH: "text-orange-400", CRITICAL: "text-red-500",
};

function Metric({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-md bg-slate-800 px-2 py-1 text-center">
      <div className="text-sm font-semibold text-slate-100">{value ?? "—"}</div>
      <div className="text-[11px] text-slate-400">{label}</div>
    </div>
  );
}

export function ApprovalCard({ card, locale }: { card: OwnerDecisionCard; locale: Locale }) {
  const dict = getDictionary(locale);
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [decided, setDecided] = useState(false);

  async function decide(decision: "APPROVED" | "REJECTED" | "MORE_INFO_REQUESTED") {
    let reason: string | undefined;
    if (decision === "REJECTED") {
      reason = window.prompt(locale === "ar" ? "سبب الرفض؟" : locale === "fr" ? "Motif du rejet ?" : "Reason for rejection?") ?? undefined;
      if (!reason) return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/approvals/${card.approvalId}/decide`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, reason }),
      });
      if (res.ok) {
        setDecided(true);
        router.refresh();
      } else {
        const body = await res.json().catch(() => ({}));
        alert(body.error ?? "Failed");
      }
    } finally {
      setBusy(false);
    }
  }

  if (decided) return null;

  return (
    <div className="space-y-3 rounded-lg border border-slate-800 bg-slate-900 p-4">
      <div className="flex items-center justify-between">
        <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-amber-400">
          {GATE_LABEL[card.gate]?.[locale] ?? card.gate}
        </span>
        <span className="text-xs text-slate-500">{card.opportunityCode}</span>
      </div>

      <div>
        <div className="font-semibold text-slate-100">
          {card.gate === "RELEASE_PAYMENT"
            ? `${card.paymentAmount?.toLocaleString() ?? "—"} ${card.currency ?? ""}`
            : (card.truckLabel ?? "—")}
        </div>
        <div className="text-sm text-slate-400">{card.supplierName ?? "—"} · VIN: {card.vin ?? "UNKNOWN"}</div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Metric label="Compat." value={card.compatibilityScore !== null ? `${card.compatibilityScore}/100` : null} />
        <Metric label="Trust" value={card.supplierTrustScore !== null ? `${card.supplierTrustScore}/100` : null} />
        <Metric label="Mech." value={card.mechanicalScore !== null ? `${card.mechanicalScore}/100` : null} />
        <Metric
          label="Fraud"
          value={<span className={RISK_COLOR[card.fraudRisk ?? ""] ?? ""}>{card.fraudRisk ?? "—"}</span>}
        />
        <Metric label="Price" value={card.askingPrice ? `${card.askingPrice.toLocaleString()} ${card.currency}` : null} />
        <Metric label="Savings" value={card.savingsPct !== null ? `${card.savingsPct}%` : null} />
      </div>

      {card.aiRecommendation && (
        <p className="rounded-md bg-slate-800/60 px-3 py-2 text-sm text-slate-300">{card.aiRecommendation}</p>
      )}

      <div className="flex gap-2">
        <button
          disabled={busy}
          onClick={() => decide("APPROVED")}
          className="flex-1 rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
        >
          {dict.common.approve}
        </button>
        <button
          disabled={busy}
          onClick={() => decide("REJECTED")}
          className="flex-1 rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-500 disabled:opacity-50"
        >
          {dict.common.reject}
        </button>
        <button
          disabled={busy}
          onClick={() => decide("MORE_INFO_REQUESTED")}
          className="flex-1 rounded-md bg-slate-700 px-3 py-2 text-sm font-medium text-white hover:bg-slate-600 disabled:opacity-50"
        >
          {dict.common.request_info}
        </button>
      </div>
    </div>
  );
}
