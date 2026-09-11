import { getSession } from "@/lib/auth";
import { getDictionary } from "@/i18n/dictionaries";
import {
  getWeeklyReportCounts, listBestOpportunities, listSupplierRisks,
  getFinancialExposure, listDonorRoiInputs, listPendingApprovals,
} from "@barray/database";
import { calculateRoi } from "@barray/shared";
import { createAiProviderFromEnv, generateWeeklyReportNarrative, WeeklyReportData } from "@barray/ai";

export default async function ReportsPage() {
  const session = await getSession();
  const dict = getDictionary(session!.locale);

  const [counts, bestOpportunities, supplierRisks, exposure, roiInputs, pendingApprovals] = await Promise.all([
    getWeeklyReportCounts(),
    listBestOpportunities(5),
    listSupplierRisks(),
    getFinancialExposure(),
    listDonorRoiInputs(),
    listPendingApprovals(),
  ]);

  const rois = roiInputs.map((row) =>
    calculateRoi({
      totalLandedCost: Number(row.total_landed_cost),
      replacementValues: { other: Number(row.total_parts_value) },
      usableMajorComponentCount: Number(row.usable_component_count),
    }),
  );
  const realizedSavings = rois.reduce((sum, r) => sum + r.savingsAmount, 0);

  const gateCounts = new Map<string, number>();
  for (const a of pendingApprovals as { gate: string }[]) gateCounts.set(a.gate, (gateCounts.get(a.gate) ?? 0) + 1);

  const reportData: WeeklyReportData = {
    newOpportunities: counts.new_opportunities,
    bestOpportunities: (bestOpportunities as { code: string; model: string; best_value_score: number }[]).map((o) => ({
      code: o.code, model: o.model, bestValueScore: o.best_value_score,
    })),
    supplierRisks: (supplierRisks as { legal_name: string; trust_risk_group: string }[]).map((s) => ({
      supplierName: s.legal_name, riskGroup: s.trust_risk_group,
    })),
    negotiationsInProgress: counts.negotiations_in_progress,
    inspectionsCompleted: counts.inspections_completed,
    pendingApprovals: Array.from(gateCounts.entries()).map(([gate, count]) => ({ gate, count })),
    purchasesThisWeek: counts.purchases_this_week,
    containersInTransit: counts.containers_in_transit,
    inventoryAvailableParts: counts.inventory_available_parts,
    financialExposureUsd: exposure,
    expectedSavingsUsd: realizedSavings, // no open (non-final) landed costs modeled separately yet — see docs
    realizedSavingsUsd: realizedSavings,
    openClaims: counts.open_claims,
    locale: session!.locale,
  };

  let narrative: string | null = null;
  let narrativeError: string | null = null;
  try {
    const provider = createAiProviderFromEnv();
    narrative = await generateWeeklyReportNarrative(provider, reportData);
  } catch (err) {
    narrativeError = err instanceof Error ? err.message : "AI provider not configured";
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">SITRAK SOURCING WEEKLY REPORT</h1>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="New opportunities" value={reportData.newOpportunities} />
        <Stat label="Negotiations in progress" value={reportData.negotiationsInProgress} />
        <Stat label="Inspections completed" value={reportData.inspectionsCompleted} />
        <Stat label="Purchases this week" value={reportData.purchasesThisWeek} />
        <Stat label="Containers in transit" value={reportData.containersInTransit} />
        <Stat label="Inventory available parts" value={reportData.inventoryAvailableParts} />
        <Stat label="Open claims" value={reportData.openClaims} />
        <Stat label="Financial exposure (USD)" value={reportData.financialExposureUsd.toLocaleString()} />
      </div>

      <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
        <h2 className="mb-2 text-sm font-semibold text-slate-300">Narrative (AI, from the figures above only)</h2>
        {narrative ? (
          <p className="whitespace-pre-wrap text-sm text-slate-300">{narrative}</p>
        ) : (
          <p className="text-sm text-amber-400">
            {dict.common.coming_soon} — AI narrative unavailable ({narrativeError}). The figures above are deterministic and always accurate regardless.
          </p>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900 p-3">
      <div className="text-lg font-semibold text-amber-400">{value}</div>
      <div className="text-xs text-slate-400">{label}</div>
    </div>
  );
}
