import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getOpportunity, listSupplierBankAccounts, query, transitionOpportunityStatus } from "@barray/database";
import { detectFraud } from "@barray/shared";
import { assertInternalApiAuth } from "@/lib/internal-auth";

const Schema = z.object({ opportunityId: z.string().uuid() });

export async function POST(request: NextRequest) {
  const authError = assertInternalApiAuth(request);
  if (authError) return authError;

  const parsed = Schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_input" }, { status: 400 });

  const opportunity = await getOpportunity(parsed.data.opportunityId);
  if (!opportunity) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const duplicateRows = await query<{ count: string }>(
    `SELECT count(*) FROM opportunities WHERE vin = $1 AND id != $2 AND vin IS NOT NULL`,
    [opportunity.vin, opportunity.id],
  );
  const duplicateVin = Number(duplicateRows[0]?.count ?? 0) > 0;

  let bankMismatch = false;
  let personalAccount = false;
  if (opportunity.supplier_id) {
    const accounts = await listSupplierBankAccounts(opportunity.supplier_id);
    const active = accounts.find((a) => a.is_active);
    bankMismatch = active?.matches_company_name === false;
    personalAccount = active?.is_personal_account ?? false;
  }

  const result = detectFraud({
    duplicateVin,
    duplicatePhotoMatch: false, // requires perceptual-hash comparison across truck_media, computed by WF-003
    supplierBankNameMismatch: bankMismatch,
    bankAccountIsPersonal: personalAccount,
    bankAccountChangedRecently: false, // set by the bank-account-change guard when a payment is in flight
    priceDeviationPct: null, // requires a market median reference not yet populated
    mileageConflict: false,
    engineNumberConflict: false,
    companyInfoConflict: false,
  });

  await query(`UPDATE opportunities SET fraud_risk = $1 WHERE id = $2`, [result.overallRisk, opportunity.id]);

  if (result.freezeRequired && opportunity.status !== "FROZEN") {
    await transitionOpportunityStatus(opportunity.id, "FROZEN", null, "Automatic freeze: CRITICAL fraud risk detected");
  }

  return NextResponse.json({ ok: true, entityId: opportunity.id, risk: result.overallRisk, rules: result.rules, frozen: result.freezeRequired });
}
