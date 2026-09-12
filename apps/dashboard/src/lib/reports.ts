import {
  getWeeklyReportCounts, listBestOpportunities, listSupplierRisks,
  getFinancialExposure, listDonorRoiInputs, listPendingApprovals,
} from "@barray/database";
import { calculateRoi } from "@barray/shared";
import type { WeeklyReportData } from "@barray/ai";

/** Assembles the deterministic figures for the weekly executive report.
 * Shared by the Reports dashboard page and WF-026's internal API endpoint
 * so both always show the exact same numbers. */
export async function buildWeeklyReportData(locale: "ar" | "fr" | "en"): Promise<WeeklyReportData> {
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

  return {
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
    expectedSavingsUsd: realizedSavings,
    realizedSavingsUsd: realizedSavings,
    openClaims: counts.open_claims,
    locale,
  };
}
