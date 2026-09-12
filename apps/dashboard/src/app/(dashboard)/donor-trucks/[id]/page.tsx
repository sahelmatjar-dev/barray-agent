import Link from "next/link";
import { notFound } from "next/navigation";
import { getDonorTruck, listPartsForDonor } from "@barray/database";
import { generatePartQrCode } from "@/lib/qrcode";

export default async function DonorTruckDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const donor = await getDonorTruck(id);
  if (!donor) notFound();

  const parts = await listPartsForDonor(id);
  const baseUrl = process.env.APP_BASE_URL ?? "http://localhost:3000";
  const partsWithQr = await Promise.all(
    parts.map(async (p) => ({ ...p, qr: await generatePartQrCode(`${baseUrl}/parts/${p.id}`) })),
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">{donor.code}</h1>
        <p className="text-sm text-slate-400">VIN: {donor.vin ?? "UNKNOWN"} · SITRAK {donor.model} {donor.configuration} · {donor.status}</p>
      </div>

      <div>
        <h2 className="mb-2 text-sm font-semibold text-slate-300">Parts</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {partsWithQr.map((p) => (
            <div key={p.id} className="rounded-lg border border-slate-800 bg-slate-900 p-3 text-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.qr} alt={`QR code for ${p.part_code}`} className="mx-auto mb-2 h-24 w-24" />
              <Link href={`/parts/${p.id}`} className="text-amber-400 hover:underline">{p.part_code}</Link>
              <div className="text-xs text-slate-400">{p.part_type} · {p.condition}</div>
              <span className="mt-1 inline-block rounded-full bg-slate-800 px-2 py-0.5 text-[11px]">{p.status}</span>
            </div>
          ))}
          {partsWithQr.length === 0 && <p className="text-sm text-slate-500">No parts recorded yet.</p>}
        </div>
      </div>
    </div>
  );
}
