import { getSession } from "@/lib/auth";
import { getDictionary } from "@/i18n/dictionaries";
import { listRfqs } from "@barray/database";

export default async function RfqsPage() {
  const session = await getSession();
  const dict = getDictionary(session!.locale);
  const rfqs = await listRfqs();

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">{dict.nav.rfqs}</h1>
      {rfqs.length === 0 ? (
        <p className="text-sm text-slate-500">{dict.common.no_data}</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-800">
          <table className="w-full text-sm">
            <thead className="bg-slate-900 text-slate-400">
              <tr>
                <th className="p-3 text-start">Opportunity</th>
                <th className="p-3 text-start">Supplier</th>
                <th className="p-3 text-start">Sent</th>
                <th className="p-3 text-start">Status</th>
              </tr>
            </thead>
            <tbody>
              {rfqs.map((r) => (
                <tr key={r.id} className="border-t border-slate-800 hover:bg-slate-900/60">
                  <td className="p-3">{r.opportunity_code}</td>
                  <td className="p-3">{r.supplier_name}</td>
                  <td className="p-3">{r.sent_at ? new Date(r.sent_at).toLocaleDateString() : "—"}</td>
                  <td className="p-3"><span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs">{r.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
