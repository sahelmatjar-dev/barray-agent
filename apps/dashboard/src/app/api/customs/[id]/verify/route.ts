import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyCustomsRecord } from "@barray/database";
import { getSession } from "@/lib/auth";

const Schema = z.object({ hsCode: z.string().min(4) });

/**
 * Manual HS code verification — the only way customs_verified can become
 * true (see database trigger enforce_customs_verification and
 * docs/safety-rules.md "Never fabricate customs descriptions"). Restricted
 * to OWNER/PROCUREMENT_MANAGER/LOGISTICS, who are the roles expected to
 * handle customs paperwork.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!session.roles.some((r) => ["OWNER", "PROCUREMENT_MANAGER", "LOGISTICS"].includes(r))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const parsed = Schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_input" }, { status: 400 });

  await verifyCustomsRecord(id, session.sub, parsed.data.hsCode);
  return NextResponse.json({ ok: true });
}
