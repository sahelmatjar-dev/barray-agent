import { getSession } from "@/lib/auth";
import { getDictionary } from "@/i18n/dictionaries";
import { listWarehouses, listWarehouseLocations } from "@barray/database";

export default async function WarehousePage() {
  const session = await getSession();
  const dict = getDictionary(session!.locale);
  const warehouses = await listWarehouses();
  const locationsByWarehouse = await Promise.all(
    warehouses.map((w: Record<string, unknown>) => listWarehouseLocations(w.id as string)),
  );

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">{dict.nav.warehouse}</h1>
      {warehouses.length === 0 ? (
        <p className="text-sm text-slate-500">{dict.common.no_data}</p>
      ) : (
        warehouses.map((w: Record<string, unknown>, idx: number) => (
          <div key={w.id as string} className="rounded-lg border border-slate-800 bg-slate-900 p-4">
            <div className="mb-2 font-medium">{w.name as string} <span className="text-sm text-slate-400">— {(w.city as string) ?? ""}</span></div>
            <div className="flex flex-wrap gap-2">
              {locationsByWarehouse[idx].map((loc: Record<string, unknown>) => (
                <span key={loc.id as string} className="rounded-md bg-slate-800 px-2 py-1 text-xs text-slate-300">
                  {loc.level as string}: {loc.code as string}
                </span>
              ))}
              {locationsByWarehouse[idx].length === 0 && <span className="text-sm text-slate-500">No locations defined.</span>}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
