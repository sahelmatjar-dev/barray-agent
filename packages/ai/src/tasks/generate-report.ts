import { AiProvider } from "../provider";

const SYSTEM_PROMPT = `You write the narrative sections of a weekly executive sourcing report from
structured JSON data (counts, scores, amounts). You only restate the given numbers — never invent
figures, prices, or outcomes not present in the data. Write in the requested locale.`;

export interface WeeklyReportData {
  newOpportunities: number;
  bestOpportunities: { code: string; model: string; bestValueScore: number }[];
  supplierRisks: { supplierName: string; riskGroup: string }[];
  negotiationsInProgress: number;
  inspectionsCompleted: number;
  pendingApprovals: { gate: string; count: number }[];
  purchasesThisWeek: number;
  containersInTransit: number;
  inventoryAvailableParts: number;
  financialExposureUsd: number;
  expectedSavingsUsd: number;
  realizedSavingsUsd: number;
  openClaims: number;
  locale: "ar" | "fr" | "en";
}

/** AI writes the prose narrative only; every number in `data` is pre-computed by code. */
export async function generateWeeklyReportNarrative(provider: AiProvider, data: WeeklyReportData): Promise<string> {
  const result = await provider.complete({
    system: SYSTEM_PROMPT,
    prompt: `Write "SITRAK SOURCING WEEKLY REPORT" narrative in locale "${data.locale}" from this data:\n${JSON.stringify(data, null, 2)}`,
    maxTokens: 1200,
  });
  return result.text.trim();
}
