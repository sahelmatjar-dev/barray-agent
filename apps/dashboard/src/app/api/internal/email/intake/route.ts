import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { findRfqByGmailThreadId } from "@barray/database";
import { assertInternalApiAuth } from "@/lib/internal-auth";

const Schema = z.object({
  gmailMessageId: z.string(),
  gmailThreadId: z.string(),
  fromEmail: z.string().optional(),
  subject: z.string().optional(),
  bodyText: z.string(),
});

export async function POST(request: NextRequest) {
  const authError = assertInternalApiAuth(request);
  if (authError) return authError;

  const parsed = Schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_input" }, { status: 400 });

  const rfq = await findRfqByGmailThreadId(parsed.data.gmailThreadId);
  if (!rfq) {
    return NextResponse.json({ ok: true, entityId: null, matched: false, message: "No RFQ found for this Gmail thread." });
  }

  return NextResponse.json({
    ok: true,
    entityId: rfq.opportunity_id,
    matched: true,
    opportunityId: rfq.opportunity_id,
    opportunityCode: rfq.opportunity_code,
    rfqId: rfq.id,
    supplierId: rfq.supplier_id,
    bodyText: parsed.data.bodyText,
  });
}
