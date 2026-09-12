import Link from "next/link";
import { getSession } from "@/lib/auth";
import { getDictionary } from "@/i18n/dictionaries";
import { listSuppliers } from "@barray/database";

const RISK_BADGE: Record<string, string> = {
  LOW_RISK: "bg-emerald-900 text-emerald-300",
  ACCEPTABLE: "bg-sky-900 text-sky-300",
  MANUAL_REVIEW: "bg-amber-900 text-amber-300",
  HIGH_RISK: "bg-red-900 text-red-300",
};

export default async function SuppliersPage() {
  const session = await getSession();
  const dict = getDictionary(session!.locale);
  const suppliers = await listSuppliers();

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">{dict.nav.suppliers}</h1>

      {suppliers.length === 0 ? (
        <p className="text-sm text-slate-500">{dict.common.no_data}</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-800">
          <table className="w-full text-sm">
            <thead className="bg-slate-900 text-slate-400">
              <tr>
                <th className="p-3 text-start">Legal name</th>
                <th className="p-3 text-start">Country</th>
                <th className="p-3 text-start">Trust score</th>
                <th className="p-3 text-start">Risk group</th>
                <th className="p-3 text-start">Fraud risk</th>
                <th className="p-3 text-start">Status</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map((s) => (
                <tr key={s.id} className="border-t border-slate-800 hover:bg-slate-900/60">
                  <td className="p-3">
                    <Link href={`/suppliers/${s.id}`} className="text-amber-400 hover:underline">{s.legal_name}</Link>
                  </td>
                  <td className="p-3">{s.country}</td>
                  <td className="p-3">{s.trust_score ?? "—"}</td>
                  <td className="p-3">
                    {s.trust_risk_group && (
                      <span className={`rounded-full px-2 py-0.5 text-xs ${RISK_BADGE[s.trust_risk_group] ?? ""}`}>
                        {s.trust_risk_group}
                      </span>
                    )}
                  </td>
                  <td className="p-3">{s.fraud_risk ?? "—"}</td>
                  <td className="p-3">
                    <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs">{s.status}</span>
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
