import { getSession } from "@/lib/auth";
import { getDictionary } from "@/i18n/dictionaries";
import { listFreightQuotes, listContainers, totalFreightQuoteCost, FreightCostFields } from "@barray/database";

export default async function LogisticsPage() {
  const session = await getSession();
  const dict = getDictionary(session!.locale);
  const [quotes, containers] = await Promise.all([listFreightQuotes(), listContainers()]);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">{dict.nav.logistics}</h1>

      <div>
        <h2 className="mb-2 text-sm font-semibold text-slate-300">Freight quotes</h2>
        <div className="overflow-x-auto rounded-lg border border-slate-800">
          <table className="w-full text-sm">
            <thead className="bg-slate-900 text-slate-400">
              <tr>
                <th className="p-3 text-start">Forwarder</th><th className="p-3 text-start">Donor</th>
                <th className="p-3 text-start">Route</th><th className="p-3 text-start">Container</th>
                <th className="p-3 text-start">Total cost</th><th className="p-3 text-start">Transit</th>
                <th className="p-3 text-start">Status</th>
              </tr>
            </thead>
            <tbody>
              {quotes.map((q: Record<string, unknown>) => (
                <tr key={q.id as string} className="border-t border-slate-800">
                  <td className="p-3">{q.forwarder_name as string}</td>
                  <td className="p-3">{(q.donor_code as string) ?? "—"}</td>
                  <td className="p-3">{q.origin_port as string} → {q.destination_port as string}</td>
                  <td className="p-3">{q.container_type as string}</td>
                  <td className="p-3">{totalFreightQuoteCost(q as unknown as FreightCostFields).toLocaleString()} {q.currency as string}</td>
                  <td className="p-3">{q.transit_days ? `${q.transit_days}d` : "—"}</td>
                  <td className="p-3"><span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs">{q.status as string}</span></td>
                </tr>
              ))}
              {quotes.length === 0 && <tr><td className="p-3 text-slate-500" colSpan={7}>{dict.common.no_data}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold text-slate-300">Containers</h2>
        <div className="overflow-x-auto rounded-lg border border-slate-800">
          <table className="w-full text-sm">
            <thead className="bg-slate-900 text-slate-400">
              <tr><th className="p-3 text-start">Number</th><th className="p-3 text-start">Type</th><th className="p-3 text-start">Forwarder</th><th className="p-3 text-start">Status</th></tr>
            </thead>
            <tbody>
              {containers.map((c: Record<string, unknown>) => (
                <tr key={c.id as string} className="border-t border-slate-800">
                  <td className="p-3">{(c.container_number as string) ?? "—"}</td>
                  <td className="p-3">{c.container_type as string}</td>
                  <td className="p-3">{(c.forwarder_name as string) ?? "—"}</td>
                  <td className="p-3"><span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs">{c.status as string}</span></td>
                </tr>
              ))}
              {containers.length === 0 && <tr><td className="p-3 text-slate-500" colSpan={4}>{dict.common.no_data}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
