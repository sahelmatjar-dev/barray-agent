import { getSession } from "@/lib/auth";
import { getDictionary } from "@/i18n/dictionaries";
import { listDonorRoiInputs, getFinancialExposure } from "@barray/database";
import { calculateRoi } from "@barray/shared";

export default async function AnalyticsPage() {
  const session = await getSession();
  const dict = getDictionary(session!.locale);
  const [roiInputs, exposure] = await Promise.all([listDonorRoiInputs(), getFinancialExposure()]);

  const rois = roiInputs.map((row) => ({
    donorCode: row.donor_code,
    ...calculateRoi({
      totalLandedCost: Number(row.total_landed_cost),
      replacementValues: { other: Number(row.total_parts_value) },
      usableMajorComponentCount: Number(row.usable_component_count),
    }),
  }));

  const totalSavings = rois.reduce((sum, r) => sum + r.savingsAmount, 0);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">{dict.nav.analytics}</h1>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
          <div className="text-2xl font-semibold text-amber-400">{exposure.toLocaleString()} USD</div>
          <div className="text-sm text-slate-400">Financial exposure (open POs)</div>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
          <div className="text-2xl font-semibold text-amber-400">{totalSavings.toLocaleString()} USD</div>
          <div className="text-sm text-slate-400">Realized savings (closed donors)</div>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-900 p-4">
          <div className="text-2xl font-semibold text-amber-400">{rois.length}</div>
          <div className="text-sm text-slate-400">Donor trucks with a final landed cost</div>
        </div>
      </div>

      {rois.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-slate-800">
          <table className="w-full text-sm">
            <thead className="bg-slate-900 text-slate-400">
              <tr>
                <th className="p-3 text-start">Donor</th><th className="p-3 text-start">Parts value</th>
                <th className="p-3 text-start">Savings</th><th className="p-3 text-start">Savings %</th>
                <th className="p-3 text-start">ROI %</th><th className="p-3 text-start">Cost / component</th>
              </tr>
            </thead>
            <tbody>
              {rois.map((r) => (
                <tr key={r.donorCode} className="border-t border-slate-800">
                  <td className="p-3">{r.donorCode}</td>
                  <td className="p-3">{r.partsReplacementValue.toLocaleString()}</td>
                  <td className="p-3">{r.savingsAmount.toLocaleString()}</td>
                  <td className="p-3">{r.savingsPct}%</td>
                  <td className="p-3">{r.roiPct}%</td>
                  <td className="p-3">{r.costPerUsableComponent?.toLocaleString() ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {rois.length === 0 && <p className="text-sm text-slate-500">{dict.common.no_data}</p>}
    </div>
  );
}
