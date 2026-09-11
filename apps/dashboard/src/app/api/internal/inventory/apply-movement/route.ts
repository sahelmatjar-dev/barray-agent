import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getInventoryForPart, applyInventoryMovement } from "@barray/database";
import { applyMovement } from "@barray/shared";
import { assertInternalApiAuth } from "@/lib/internal-auth";

const MOVEMENT_TYPES = [
  "RECEIVED", "MOVED", "RESERVED", "RELEASED", "INSTALLED", "REMOVED", "SOLD", "SCRAPPED", "ADJUSTED",
] as const;

const Schema = z.object({
  partId: z.string().uuid(),
  movementType: z.enum(MOVEMENT_TYPES),
  warehouseLocationId: z.string().uuid().optional(),
});

export async function POST(request: NextRequest) {
  const authError = assertInternalApiAuth(request);
  if (authError) return authError;

  const parsed = Schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_input" }, { status: 400 });

  const current = await getInventoryForPart(parsed.data.partId);

  try {
    const newStatus = applyMovement(current?.part_status ?? null, parsed.data.movementType);
    const inventoryId = await applyInventoryMovement(
      parsed.data.partId, parsed.data.movementType, newStatus, null, parsed.data.warehouseLocationId,
    );
    return NextResponse.json({ ok: true, entityId: inventoryId, newStatus });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "movement_rejected" }, { status: 422 });
  }
}
