import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getPayment, getPaymentVerificationContext, recordPaymentVerification, setPaymentStatus } from "@barray/database";
import { evaluateBankAccountChange } from "@barray/shared";
import { assertInternalApiAuth } from "@/lib/internal-auth";

const Schema = z.object({ paymentId: z.string().uuid() });

export async function POST(request: NextRequest) {
  const authError = assertInternalApiAuth(request);
  if (authError) return authError;

  const parsed = Schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_input" }, { status: 400 });

  const payment = await getPayment(parsed.data.paymentId);
  if (!payment) return NextResponse.json({ error: "not_found" }, { status: 404 });
  // Verification runs pre-release only — re-running it must never downgrade a
  // payment that has already been RELEASED (or FROZEN pending owner review).
  if ((payment as { status: string }).status === "RELEASED" || (payment as { status: string }).status === "FROZEN") {
    return NextResponse.json({ error: `Payment is already ${(payment as { status: string }).status}; verification does not apply.` }, { status: 409 });
  }

  const ctx = await getPaymentVerificationContext(parsed.data.paymentId);
  if (!ctx) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const checks: { checkType: Parameters<typeof recordPaymentVerification>[0]["checkType"]; passed: boolean; details: string }[] = [
    {
      checkType: "BANK_NAME_MATCH",
      passed: ctx.matches_company_name === true,
      details: ctx.matches_company_name === true ? "Account holder matches supplier legal name." : "Account holder does NOT match supplier legal name.",
    },
    {
      checkType: "ACCOUNT_NOT_PERSONAL",
      passed: ctx.is_personal_account === false,
      details: ctx.is_personal_account ? "Beneficiary account is a PERSONAL account." : "Company account confirmed.",
    },
    {
      checkType: "AMOUNT_MATCHES_PO",
      passed: Number(ctx.amount) === Number(ctx.po_agreed_price),
      details: `Payment amount ${ctx.amount} vs PO agreed price ${ctx.po_agreed_price}.`,
    },
    {
      checkType: "SUPPLIER_NOT_FROZEN",
      passed: ctx.supplier_status !== "FROZEN" && ctx.supplier_status !== "SUSPENDED",
      details: `Supplier status: ${ctx.supplier_status}.`,
    },
  ];

  const bankChangeDecision = evaluateBankAccountChange({
    previousAccountNumber: ctx.bank_account_id, // presence of a prior verified account id stands in for "has an account on file"
    newAccountNumber: ctx.bank_account_id ?? "none",
    newAccountVerified: ctx.matches_company_name === true,
    hasPendingOrRecentPayment: false,
  });
  checks.push({
    checkType: "ACCOUNT_UNCHANGED",
    passed: !bankChangeDecision.blocksPaymentRelease,
    details: bankChangeDecision.reason,
  });

  for (const check of checks) {
    await recordPaymentVerification({ paymentId: parsed.data.paymentId, ...check });
  }

  const allPassed = checks.every((c) => c.passed);
  await setPaymentStatus(parsed.data.paymentId, allPassed ? "VERIFIED" : "PENDING_VERIFICATION");

  return NextResponse.json({ ok: true, entityId: parsed.data.paymentId, allPassed, checks });
}
