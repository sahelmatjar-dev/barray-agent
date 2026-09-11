import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createApprovalRequest } from "@barray/database";
import { assertInternalApiAuth } from "@/lib/internal-auth";

const Schema = z.object({
  gate: z.enum(["APPROVE_SUPPLIER", "APPROVE_INSPECTION", "APPROVE_PURCHASE", "RELEASE_PAYMENT"]),
  entity: z.string(),
  entityId: z.string().uuid(),
  snapshot: z.unknown().optional(),
});

export async function POST(request: NextRequest) {
  const authError = assertInternalApiAuth(request);
  if (authError) return authError;

  const parsed = Schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_input" }, { status: 400 });

  const approvalId = await createApprovalRequest(
    parsed.data.gate, parsed.data.entity, parsed.data.entityId, parsed.data.snapshot ?? {}, null,
  );

  return NextResponse.json({ ok: true, entityId: approvalId });
}
