import { getSession } from "@/lib/auth";
import { getDictionary } from "@/i18n/dictionaries";
import { listShipments, etaDriftDays, ETA_DRIFT_ALERT_DAYS } from "@barray/database";

export default async function ShipmentsPage() {
  const session = await getSession();
  const dict = getDictionary(session!.locale);
  const shipments = await listShipments();

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">{dict.nav.shipments}</h1>
      {shipments.length === 0 ? (
        <p className="text-sm text-slate-500">{dict.common.no_data}</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-800">
          <table className="w-full text-sm">
            <thead className="bg-slate-900 text-slate-400">
              <tr>
                <th className="p-3 text-start">Container</th><th className="p-3 text-start">Vessel</th>
                <th className="p-3 text-start">Route</th><th className="p-3 text-start">ETA</th>
                <th className="p-3 text-start">ETA drift</th><th className="p-3 text-start">Status</th>
              </tr>
            </thead>
            <tbody>
              {shipments.map((s: Record<string, unknown>) => {
                const drift = etaDriftDays(s.eta as string | null, s.original_eta as string | null);
                const alert = drift !== null && Math.abs(drift) > ETA_DRIFT_ALERT_DAYS;
                return (
                  <tr key={s.id as string} className="border-t border-slate-800">
                    <td className="p-3">{s.container_number as string}</td>
                    <td className="p-3">{(s.vessel as string) ?? "—"}</td>
                    <td className="p-3">{s.origin_port as string} → {s.destination_port as string}</td>
                    <td className="p-3">{s.eta ? new Date(s.eta as string).toLocaleDateString() : "—"}</td>
                    <td className="p-3">
                      {drift !== null ? (
                        <span className={alert ? "text-red-400 font-medium" : "text-slate-400"}>
                          {drift > 0 ? `+${drift}` : drift}d {alert ? "⚠" : ""}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="p-3"><span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs">{s.status as string}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
