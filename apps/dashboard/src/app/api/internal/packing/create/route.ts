import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createPackagesForDismantlingJob } from "@barray/database";
import { assertInternalApiAuth } from "@/lib/internal-auth";

const Schema = z.object({ dismantlingJobId: z.string().uuid() });

export async function POST(request: NextRequest) {
  const authError = assertInternalApiAuth(request);
  if (authError) return authError;

  const parsed = Schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_input" }, { status: 400 });

  try {
    const result = await createPackagesForDismantlingJob(parsed.data.dismantlingJobId);
    return NextResponse.json({ ok: true, entityId: result.packingListId, packageIds: result.packageIds });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "packing failed" }, { status: 422 });
  }
}
