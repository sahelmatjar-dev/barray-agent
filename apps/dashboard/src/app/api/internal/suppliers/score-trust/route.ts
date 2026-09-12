import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSupplier, listSupplierBankAccounts, updateSupplierTrustScore, createApprovalRequest } from "@barray/database";
import { scoreSupplierTrust } from "@barray/shared";
import { assertInternalApiAuth } from "@/lib/internal-auth";

const Schema = z.object({ supplierId: z.string().uuid() });

export async function POST(request: NextRequest) {
  const authError = assertInternalApiAuth(request);
  if (authError) return authError;

  const parsed = Schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_input" }, { status: 400 });

  const supplier = await getSupplier(parsed.data.supplierId);
  if (!supplier) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const bankAccounts = await listSupplierBankAccounts(parsed.data.supplierId);
  const activeAccount = bankAccounts.find((a) => a.is_active);

  const result = scoreSupplierTrust({
    legal_existence_verified: supplier.legal_existence_verified,
    years_active: supplier.years_active,
    third_party_audit: supplier.third_party_audit,
    is_truck_specialist: supplier.is_truck_specialist,
    bank_account_matches_company: activeAccount?.matches_company_name ?? null,
    digital_presence_score: supplier.digital_presence_score,
    export_evidence: supplier.export_evidence,
    communication_quality_score: supplier.communication_quality_score,
  });

  await updateSupplierTrustScore(supplier.id, result.score, result.risk_group, result.breakdown);

  // Every scored supplier gets an APPROVE_SUPPLIER request — the owner decides,
  // the engine only informs (see docs/safety-rules.md, "the four hard approval gates").
  await createApprovalRequest("APPROVE_SUPPLIER", "supplier", supplier.id, { trust: result }, null);

  return NextResponse.json({ ok: true, entityId: supplier.id, score: result.score, riskGroup: result.risk_group });
}
