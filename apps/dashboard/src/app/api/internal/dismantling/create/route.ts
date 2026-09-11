import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createDismantlingJobForOpportunity } from "@barray/database";
import { assertInternalApiAuth } from "@/lib/internal-auth";

const Schema = z.object({ opportunityId: z.string().uuid() });

export async function POST(request: NextRequest) {
  const authError = assertInternalApiAuth(request);
  if (authError) return authError;

  const parsed = Schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_input" }, { status: 400 });

  const result = await createDismantlingJobForOpportunity(parsed.data.opportunityId);

  return NextResponse.json({ ok: true, entityId: result.jobId, donorId: result.donorId, donorCode: result.donorCode });
}
