import { getSession } from "@/lib/auth";
import { getDictionary } from "@/i18n/dictionaries";
import { listNegotiations } from "@barray/database";

export default async function NegotiationsPage() {
  const session = await getSession();
  const dict = getDictionary(session!.locale);
  const negotiations = await listNegotiations();

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">{dict.nav.negotiations}</h1>
      {negotiations.length === 0 ? (
        <p className="text-sm text-slate-500">{dict.common.no_data}</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-800">
          <table className="w-full text-sm">
            <thead className="bg-slate-900 text-slate-400">
              <tr>
                <th className="p-3 text-start">Opportunity</th>
                <th className="p-3 text-start">Supplier</th>
                <th className="p-3 text-start">Asking</th>
                <th className="p-3 text-start">Target</th>
                <th className="p-3 text-start">Maximum</th>
                <th className="p-3 text-start">Current counter</th>
                <th className="p-3 text-start">Status</th>
              </tr>
            </thead>
            <tbody>
              {negotiations.map((n: Record<string, unknown>) => (
                <tr key={n.id as string} className="border-t border-slate-800 hover:bg-slate-900/60">
                  <td className="p-3">{n.opportunity_code as string}</td>
                  <td className="p-3">{n.supplier_name as string}</td>
                  <td className="p-3">{Number(n.asking_price).toLocaleString()}</td>
                  <td className="p-3">{Number(n.target_price).toLocaleString()}</td>
                  <td className="p-3">{Number(n.maximum_price).toLocaleString()}</td>
                  <td className="p-3">{n.current_counter_price ? Number(n.current_counter_price).toLocaleString() : "—"}</td>
                  <td className="p-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${
                      n.status === "MAXIMUM_EXCEEDED" ? "bg-red-900 text-red-300" : "bg-slate-800"
                    }`}>{n.status as string}</span>
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
