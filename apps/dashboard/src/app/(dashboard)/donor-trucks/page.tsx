import Link from "next/link";
import { getSession } from "@/lib/auth";
import { getDictionary } from "@/i18n/dictionaries";
import { listDonorTrucks } from "@barray/database";

export default async function DonorTrucksPage() {
  const session = await getSession();
  const dict = getDictionary(session!.locale);
  const donors = await listDonorTrucks();

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">{dict.nav.donor_trucks}</h1>
      {donors.length === 0 ? (
        <p className="text-sm text-slate-500">{dict.common.no_data}</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-800">
          <table className="w-full text-sm">
            <thead className="bg-slate-900 text-slate-400">
              <tr>
                <th className="p-3 text-start">Code</th>
                <th className="p-3 text-start">Opportunity</th>
                <th className="p-3 text-start">VIN</th>
                <th className="p-3 text-start">Model</th>
                <th className="p-3 text-start">Status</th>
              </tr>
            </thead>
            <tbody>
              {donors.map((d) => (
                <tr key={d.id} className="border-t border-slate-800 hover:bg-slate-900/60">
                  <td className="p-3"><Link href={`/donor-trucks/${d.id}`} className="text-amber-400 hover:underline">{d.code}</Link></td>
                  <td className="p-3">{d.opportunity_code}</td>
                  <td className="p-3">{d.vin ?? "UNKNOWN"}</td>
                  <td className="p-3">SITRAK {d.model} {d.configuration}</td>
                  <td className="p-3"><span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs">{d.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
