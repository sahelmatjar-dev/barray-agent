import Link from "next/link";
import { getSession } from "@/lib/auth";
import { getDictionary } from "@/i18n/dictionaries";
import { listOpportunities } from "@barray/database";

export default async function OpportunitiesPage() {
  const session = await getSession();
  const dict = getDictionary(session!.locale);
  const opportunities = await listOpportunities();

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">{dict.nav.opportunities}</h1>

      {opportunities.length === 0 ? (
        <p className="text-sm text-slate-500">{dict.common.no_data}</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-800">
          <table className="w-full text-sm">
            <thead className="bg-slate-900 text-slate-400">
              <tr>
                <th className="p-3 text-start">Code</th>
                <th className="p-3 text-start">Model</th>
                <th className="p-3 text-start">Year</th>
                <th className="p-3 text-start">Price</th>
                <th className="p-3 text-start">Compat.</th>
                <th className="p-3 text-start">Trust</th>
                <th className="p-3 text-start">Fraud</th>
                <th className="p-3 text-start">Status</th>
              </tr>
            </thead>
            <tbody>
              {opportunities.map((o) => (
                <tr key={o.id} className="border-t border-slate-800 hover:bg-slate-900/60">
                  <td className="p-3">
                    <Link href={`/opportunities/${o.id}`} className="text-amber-400 hover:underline">
                      {o.code}
                    </Link>
                  </td>
                  <td className="p-3">SITRAK {o.model} {o.configuration}</td>
                  <td className="p-3">{o.year ?? "—"}</td>
                  <td className="p-3">{o.asking_price ? `${Number(o.asking_price).toLocaleString()} ${o.currency}` : "—"}</td>
                  <td className="p-3">{o.compatibility_score ?? "—"}</td>
                  <td className="p-3">{o.supplier_trust_score ?? "—"}</td>
                  <td className="p-3">{o.fraud_risk ?? "—"}</td>
                  <td className="p-3">
                    <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs">{o.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
