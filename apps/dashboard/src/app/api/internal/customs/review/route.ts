import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getDonorTruck, listPartsForDonor, recordCompleteVehicleCheck } from "@barray/database";
import { checkCompleteVehicleRisk, MAJOR_COMPONENT_TYPES, MajorComponentType } from "@barray/shared";
import { assertInternalApiAuth } from "@/lib/internal-auth";

const Schema = z.object({ donorId: z.string().uuid() });

function isMajorComponent(partType: string): partType is MajorComponentType {
  return (MAJOR_COMPONENT_TYPES as readonly string[]).includes(partType);
}

export async function POST(request: NextRequest) {
  const authError = assertInternalApiAuth(request);
  if (authError) return authError;

  const parsed = Schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_input" }, { status: 400 });

  const donor = await getDonorTruck(parsed.data.donorId);
  if (!donor) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const parts = await listPartsForDonor(donor.id);
  const componentTypes = parts.map((p) => p.part_type).filter(isMajorComponent);

  const result = checkCompleteVehicleRisk({ donorTruckId: donor.id, batchComponentTypes: componentTypes });

  await recordCompleteVehicleCheck({
    donorId: donor.id,
    coveragePct: result.coveragePct,
    presentComponents: result.presentComponents,
    flagged: result.flagged,
    message: result.message,
  });

  return NextResponse.json({ ok: true, entityId: donor.id, ...result });
}
