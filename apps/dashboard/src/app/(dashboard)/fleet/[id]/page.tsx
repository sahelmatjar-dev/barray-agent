import { notFound } from "next/navigation";
import { getFleetTruck } from "@barray/database";

const FIELDS: { key: keyof NonNullable<Awaited<ReturnType<typeof getFleetTruck>>>; label: string }[] = [
  { key: "vin", label: "VIN" },
  { key: "engine_model", label: "Engine model" },
  { key: "gearbox_model", label: "Gearbox model" },
  { key: "front_axle_model", label: "Front axle model" },
  { key: "rear_axle_model", label: "Rear axle model" },
  { key: "ecu_reference", label: "ECU reference" },
  { key: "cabin_generation", label: "Cabin generation" },
  { key: "hydraulic_system", label: "Hydraulic system" },
];

export default async function FleetTruckDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const truck = await getFleetTruck(id);
  if (!truck) notFound();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">{truck.registration_number}</h1>
        <p className="text-sm text-slate-400">SITRAK {truck.model} {truck.configuration} · {truck.status}</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {FIELDS.map((f) => (
          <div key={f.key} className="rounded-lg border border-slate-800 bg-slate-900 p-3">
            <div className="text-sm font-medium text-slate-100">{String(truck[f.key] ?? "UNKNOWN")}</div>
            <div className="text-xs text-slate-400">{f.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
