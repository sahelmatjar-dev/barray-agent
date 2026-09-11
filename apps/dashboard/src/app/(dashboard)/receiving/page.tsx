import { getSession } from "@/lib/auth";
import { getDictionary } from "@/i18n/dictionaries";
import { listReceivingReports, listReceivingItems } from "@barray/database";

export default async function ReceivingPage() {
  const session = await getSession();
  const dict = getDictionary(session!.locale);
  const reports = await listReceivingReports();
  const itemsByReport = await Promise.all(reports.map((r: Record<string, unknown>) => listReceivingItems(r.id as string)));

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">{dict.nav.receiving}</h1>
      {reports.length === 0 ? (
        <p className="text-sm text-slate-500">{dict.common.no_data}</p>
      ) : (
        reports.map((r: Record<string, unknown>, idx: number) => (
          <div key={r.id as string} className="rounded-lg border border-slate-800 bg-slate-900 p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-medium">{(r.container_number as string) ?? "—"}</span>
              <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs">{r.status as string}</span>
            </div>
            <table className="w-full text-sm">
              <thead className="text-slate-400">
                <tr><th className="p-1 text-start">Package</th><th className="p-1 text-start">Expected</th><th className="p-1 text-start">Received</th><th className="p-1 text-start">Condition</th><th className="p-1 text-start">Status</th></tr>
              </thead>
              <tbody>
                {itemsByReport[idx].map((it: Record<string, unknown>) => (
                  <tr key={it.id as string} className="border-t border-slate-800">
                    <td className="p-1">{(it.package_code as string) ?? "—"}</td>
                    <td className="p-1">{it.expected_quantity as number}</td>
                    <td className="p-1">{it.received_quantity as number}</td>
                    <td className="p-1">{(it.condition_on_arrival as string) ?? "—"}</td>
                    <td className="p-1">
                      <span className={`rounded-full px-2 py-0.5 text-xs ${it.status === "DISCREPANCY" ? "bg-red-900 text-red-300" : "bg-slate-800"}`}>
                        {it.status as string}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))
      )}
    </div>
  );
}
