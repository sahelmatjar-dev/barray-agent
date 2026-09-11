/**
 * Guards against paying a supplier's newly-changed bank account without
 * re-verification. Every change must be audit-logged (see documents/audit_logs
 * table + docs/safety-rules.md "Critical events").
 */
export interface BankAccountChangeInput {
  previousAccountNumber: string | null;
  newAccountNumber: string;
  newAccountVerified: boolean;
  hasPendingOrRecentPayment: boolean; // a payment exists in PENDING_RELEASE/RELEASED tied to this supplier
}

export interface BankAccountChangeDecision {
  requiresReverification: boolean;
  blocksPaymentRelease: boolean;
  reason: string;
}

export function evaluateBankAccountChange(input: BankAccountChangeInput): BankAccountChangeDecision {
  const changed = input.previousAccountNumber !== null && input.previousAccountNumber !== input.newAccountNumber;

  if (!changed) {
    return { requiresReverification: false, blocksPaymentRelease: false, reason: "No account change detected." };
  }

  if (!input.newAccountVerified) {
    return {
      requiresReverification: true,
      blocksPaymentRelease: true,
      reason: "Bank account changed and the new account is not yet verified — RELEASE PAYMENT is blocked.",
    };
  }

  if (input.hasPendingOrRecentPayment) {
    return {
      requiresReverification: true,
      blocksPaymentRelease: true,
      reason: "Bank account changed with a pending/recent payment in flight — requires owner re-approval before release.",
    };
  }

  return { requiresReverification: false, blocksPaymentRelease: false, reason: "Account change verified, no payment in flight." };
}
