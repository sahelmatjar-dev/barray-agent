import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getOpportunity, getTruckSpecsForOpportunity, getFleetReferenceSpec } from "@barray/database";
import { scoreCompatibility, TruckComponentSpec, UNKNOWN } from "@barray/shared";

function toSpec(row: {
  engine_model: string | null; gearbox_model: string | null; front_axle_model: string | null;
  rear_axle_model: string | null; ecu_reference: string | null; cabin_generation: string | null;
  hydraulic_system: string | null;
} | null): TruckComponentSpec {
  return {
    engine_model: row?.engine_model ?? UNKNOWN,
    gearbox_model: row?.gearbox_model ?? UNKNOWN,
    front_axle_model: row?.front_axle_model ?? UNKNOWN,
    rear_axle_model: row?.rear_axle_model ?? UNKNOWN,
    ecu_reference: row?.ecu_reference ?? UNKNOWN,
    cabin_generation: row?.cabin_generation ?? UNKNOWN,
    hydraulic_system: row?.hydraulic_system ?? UNKNOWN,
  };
}

export default async function OpportunityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await getSession();
  const { id } = await params;
  const opportunity = await getOpportunity(id);
  if (!opportunity) notFound();

  const truckSpecs = await getTruckSpecsForOpportunity(id);
  const fleetReference = await getFleetReferenceSpec(opportunity.model, opportunity.configuration);

  const compatibility = fleetReference
    ? scoreCompatibility(toSpec(truckSpecs), toSpec(fleetReference))
    : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">{opportunity.code}</h1>
        <p className="text-sm text-slate-400">
          SITRAK {opportunity.model} {opportunity.configuration} · {opportunity.year ?? "UNKNOWN"} ·
          VIN: {opportunity.vin ?? "UNKNOWN"}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border border-slate-800 bg-slate-900 p-3">
          <div className="text-lg font-semibold text-amber-400">
            {opportunity.asking_price ? `${Number(opportunity.asking_price).toLocaleString()} ${opportunity.currency}` : "—"}
          </div>
          <div className="text-xs text-slate-400">Asking price</div>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-900 p-3">
          <div className="text-lg font-semibold text-amber-400">{compatibility?.score ?? opportunity.compatibility_score ?? "—"}/100</div>
          <div className="text-xs text-slate-400">Compatibility</div>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-900 p-3">
          <div className="text-lg font-semibold text-amber-400">{opportunity.supplier_trust_score ?? "—"}/100</div>
          <div className="text-xs text-slate-400">Supplier trust</div>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-900 p-3">
          <div className="text-lg font-semibold text-amber-400">{opportunity.fraud_risk ?? "—"}</div>
          <div className="text-xs text-slate-400">Fraud risk</div>
        </div>
      </div>

      {compatibility && (
        <div>
          <h2 className="mb-2 text-sm font-semibold text-slate-300">Compatibility breakdown (deterministic)</h2>
          <div className="overflow-x-auto rounded-lg border border-slate-800">
            <table className="w-full text-sm">
              <thead className="bg-slate-900 text-slate-400">
                <tr>
                  <th className="p-2 text-start">Component</th>
                  <th className="p-2 text-start">Reason</th>
                  <th className="p-2 text-start">Match</th>
                  <th className="p-2 text-start">Points</th>
                </tr>
              </thead>
              <tbody>
                {compatibility.reasons.map((r, idx) => (
                  <tr key={idx} className="border-t border-slate-800">
                    <td className="p-2">{r.component}</td>
                    <td className="p-2 text-slate-400">{r.reason_code}</td>
                    <td className="p-2">{r.match_type}</td>
                    <td className="p-2">{r.score_contribution.toFixed(1)} / {r.max_contribution}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!fleetReference && (
            <p className="mt-2 text-xs text-amber-500">
              No ACTIVE fleet reference truck found for {opportunity.model} {opportunity.configuration} — add one under Fleet.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
