import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getOpportunity, createPurchaseOrderFromApproval } from "@barray/database";
import { assertInternalApiAuth } from "@/lib/internal-auth";

const Schema = z.object({ opportunityId: z.string().uuid(), approvalId: z.string().uuid() });

export async function POST(request: NextRequest) {
  const authError = assertInternalApiAuth(request);
  if (authError) return authError;

  const parsed = Schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_input" }, { status: 400 });

  const opportunity = await getOpportunity(parsed.data.opportunityId);
  if (!opportunity || !opportunity.supplier_id) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!opportunity.asking_price) {
    return NextResponse.json({ error: "opportunity has no agreed price yet" }, { status: 422 });
  }

  // The DB trigger enforce_po_approval_gate independently re-checks that
  // approvalId references a decided APPROVE_PURCHASE approval before this
  // can be created with status APPROVED — this call cannot bypass that.
  try {
    const po = await createPurchaseOrderFromApproval({
      opportunityId: opportunity.id,
      supplierId: opportunity.supplier_id,
      approvalId: parsed.data.approvalId,
      agreedPrice: Number(opportunity.asking_price),
      currency: opportunity.currency,
      description: `SITRAK ${opportunity.model} ${opportunity.configuration} donor truck (${opportunity.code})`,
    });
    return NextResponse.json({ ok: true, entityId: po.id, code: po.code });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "PO creation rejected" }, { status: 422 });
  }
}
