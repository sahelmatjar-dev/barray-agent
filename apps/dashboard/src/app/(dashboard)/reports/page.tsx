import { getSession } from "@/lib/auth";
import { getDictionary } from "@/i18n/dictionaries";
import { createAiProviderFromEnv, generateWeeklyReportNarrative } from "@barray/ai";
import { buildWeeklyReportData } from "@/lib/reports";

export default async function ReportsPage() {
  const session = await getSession();
  const dict = getDictionary(session!.locale);
  const reportData = await buildWeeklyReportData(session!.locale);

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
