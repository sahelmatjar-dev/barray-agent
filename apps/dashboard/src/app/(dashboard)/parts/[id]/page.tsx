import { notFound } from "next/navigation";
import Link from "next/link";
import { getPart, getDonorTruck, listPartInstallationsForPart, getInventoryForPart } from "@barray/database";

export default async function PartDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const part = await getPart(id);
  if (!part) notFound();

  const [donor, installations, inventory] = await Promise.all([
    getDonorTruck(part.donor_truck_id),
    listPartInstallationsForPart(id),
    getInventoryForPart(id),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">{part.part_code}</h1>
        <p className="text-sm text-slate-400">
          {part.part_type} · {part.condition} · from donor {donor ? (
            <Link href={`/donor-trucks/${donor.id}`} className="text-amber-400 hover:underline">{donor.code}</Link>
          ) : "—"}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-slate-800 bg-slate-900 p-3">
          <div className="text-lg font-semibold text-amber-400">{part.status}</div>
          <div className="text-xs text-slate-400">Part status</div>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-900 p-3">
          <div className="text-lg font-semibold text-amber-400">{inventory?.part_status ?? "—"}</div>
          <div className="text-xs text-slate-400">Inventory status</div>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-900 p-3">
          <div className="text-lg font-semibold text-amber-400">
            {part.estimated_replacement_value ? `${Number(part.estimated_replacement_value).toLocaleString()}` : "—"}
          </div>
          <div className="text-xs text-slate-400">Estimated replacement value</div>
        </div>
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold text-slate-300">Installation history (traceability)</h2>
        <ul className="space-y-1 text-sm">
          {installations.map((i: Record<string, unknown>) => (
            <li key={i.id as string} className="rounded-md border border-slate-800 bg-slate-900 p-2">
              Installed on {i.registration_number as string} — {new Date(i.installation_date as string).toLocaleDateString()}
              {i.odometer_at_installation ? ` @ ${Number(i.odometer_at_installation).toLocaleString()} km` : ""}
              {i.technician ? ` · ${i.technician as string}` : ""}
              <span className="ms-2 rounded-full bg-slate-800 px-2 py-0.5 text-[11px]">{i.status as string}</span>
            </li>
          ))}
          {installations.length === 0 && <li className="text-slate-500">Not yet installed on any fleet truck.</li>}
        </ul>
      </div>
    </div>
  );
}
