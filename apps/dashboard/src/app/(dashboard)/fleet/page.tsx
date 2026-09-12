import Link from "next/link";
import { getSession } from "@/lib/auth";
import { getDictionary } from "@/i18n/dictionaries";
import { listFleetTrucks } from "@barray/database";

export default async function FleetPage() {
  const session = await getSession();
  const dict = getDictionary(session!.locale);
  const trucks = await listFleetTrucks();

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">{dict.nav.fleet}</h1>

      {trucks.length === 0 ? (
        <p className="text-sm text-slate-500">{dict.common.no_data}</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-800">
          <table className="w-full text-sm">
            <thead className="bg-slate-900 text-slate-400">
              <tr>
                <th className="p-3 text-start">Registration</th>
                <th className="p-3 text-start">VIN</th>
                <th className="p-3 text-start">Model</th>
                <th className="p-3 text-start">Engine</th>
                <th className="p-3 text-start">Gearbox</th>
                <th className="p-3 text-start">Status</th>
              </tr>
            </thead>
            <tbody>
              {trucks.map((t) => (
                <tr key={t.id} className="border-t border-slate-800 hover:bg-slate-900/60">
                  <td className="p-3">
                    <Link href={`/fleet/${t.id}`} className="text-amber-400 hover:underline">{t.registration_number}</Link>
                  </td>
                  <td className="p-3">{t.vin ?? "UNKNOWN"}</td>
                  <td className="p-3">SITRAK {t.model} {t.configuration}</td>
                  <td className="p-3">{t.engine_model ?? "UNKNOWN"}</td>
                  <td className="p-3">{t.gearbox_model ?? "UNKNOWN"}</td>
                  <td className="p-3">
                    <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs">{t.status}</span>
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
