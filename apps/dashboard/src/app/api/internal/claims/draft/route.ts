import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClaimDraftForReceivingItem } from "@barray/database";
import { assertInternalApiAuth } from "@/lib/internal-auth";

const Schema = z.object({ receivingItemId: z.string().uuid() });

export async function POST(request: NextRequest) {
  const authError = assertInternalApiAuth(request);
  if (authError) return authError;

  const parsed = Schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_input" }, { status: 400 });

  try {
    const claimId = await createClaimDraftForReceivingItem(parsed.data.receivingItemId);
    return NextResponse.json({ ok: true, entityId: claimId });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "claim draft creation failed" }, { status: 422 });
  }
}
