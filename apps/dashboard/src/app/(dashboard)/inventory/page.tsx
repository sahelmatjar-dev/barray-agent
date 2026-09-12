import { getSession } from "@/lib/auth";
import { getDictionary } from "@/i18n/dictionaries";
import { listInventory } from "@barray/database";

const STATUS_COLOR: Record<string, string> = {
  AVAILABLE: "bg-emerald-900 text-emerald-300",
  RESERVED: "bg-sky-900 text-sky-300",
  INSTALLED: "bg-slate-800",
  UNDER_TEST: "bg-amber-900 text-amber-300",
  DAMAGED: "bg-red-900 text-red-300",
  SOLD: "bg-slate-800",
  SCRAPPED: "bg-red-950 text-red-400",
};

export default async function InventoryPage() {
  const session = await getSession();
  const dict = getDictionary(session!.locale);
  const inventory = await listInventory();

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">{dict.nav.inventory}</h1>
      {inventory.length === 0 ? (
        <p className="text-sm text-slate-500">{dict.common.no_data}</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-800">
          <table className="w-full text-sm">
            <thead className="bg-slate-900 text-slate-400">
              <tr>
                <th className="p-3 text-start">Part</th><th className="p-3 text-start">Type</th>
                <th className="p-3 text-start">Donor</th><th className="p-3 text-start">Condition</th>
                <th className="p-3 text-start">Location</th><th className="p-3 text-start">Status</th>
              </tr>
            </thead>
            <tbody>
              {inventory.map((i: Record<string, unknown>) => (
                <tr key={i.id as string} className="border-t border-slate-800 hover:bg-slate-900/60">
                  <td className="p-3">{i.part_code as string}</td>
                  <td className="p-3">{i.part_type as string}</td>
                  <td className="p-3">{i.donor_code as string}</td>
                  <td className="p-3">{i.condition as string}</td>
                  <td className="p-3">{i.warehouse_name ? `${i.warehouse_name} / ${i.location_code}` : "—"}</td>
                  <td className="p-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${STATUS_COLOR[i.part_status as string] ?? "bg-slate-800"}`}>
                      {i.part_status as string}
                    </span>
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
