import { getSession } from "@/lib/auth";
import { getDictionary } from "@/i18n/dictionaries";
import { listPackages, listPackingLists } from "@barray/database";

export default async function PackingPage() {
  const session = await getSession();
  const dict = getDictionary(session!.locale);
  const [packages, packingLists] = await Promise.all([listPackages(), listPackingLists()]);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">{dict.nav.packing}</h1>

      <div>
        <h2 className="mb-2 text-sm font-semibold text-slate-300">Packing lists</h2>
        <div className="overflow-x-auto rounded-lg border border-slate-800">
          <table className="w-full text-sm">
            <thead className="bg-slate-900 text-slate-400">
              <tr><th className="p-3 text-start">Donor</th><th className="p-3 text-start">Container</th><th className="p-3 text-start">Status</th></tr>
            </thead>
            <tbody>
              {packingLists.map((pl: Record<string, unknown>) => (
                <tr key={pl.id as string} className="border-t border-slate-800">
                  <td className="p-3">{pl.donor_code as string}</td>
                  <td className="p-3">{(pl.container_number as string) ?? "—"}</td>
                  <td className="p-3"><span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs">{pl.status as string}</span></td>
                </tr>
              ))}
              {packingLists.length === 0 && <tr><td className="p-3 text-slate-500" colSpan={3}>{dict.common.no_data}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold text-slate-300">Packages</h2>
        <div className="overflow-x-auto rounded-lg border border-slate-800">
          <table className="w-full text-sm">
            <thead className="bg-slate-900 text-slate-400">
              <tr>
                <th className="p-3 text-start">Package</th><th className="p-3 text-start">Donor</th>
                <th className="p-3 text-start">Description</th><th className="p-3 text-start">Weight</th>
                <th className="p-3 text-start">CBM</th><th className="p-3 text-start">Candidate HS</th>
                <th className="p-3 text-start">Status</th>
              </tr>
            </thead>
            <tbody>
              {packages.map((p: Record<string, unknown>) => (
                <tr key={p.id as string} className="border-t border-slate-800">
                  <td className="p-3">{p.package_id as string}</td>
                  <td className="p-3">{p.donor_code as string}</td>
                  <td className="p-3">{p.part_description as string}</td>
                  <td className="p-3">{p.gross_weight_kg ? `${p.gross_weight_kg} kg` : "—"}</td>
                  <td className="p-3">{(p.cbm as string) ?? "—"}</td>
                  <td className="p-3">{(p.candidate_hs_code as string) ?? "—"}</td>
                  <td className="p-3"><span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs">{p.status as string}</span></td>
                </tr>
              ))}
              {packages.length === 0 && <tr><td className="p-3 text-slate-500" colSpan={7}>{dict.common.no_data}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
