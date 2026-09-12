import { describe, expect, it } from "vitest";
import { evaluateBankAccountChange } from "../../packages/shared/src/bank-account-guard";

describe("evaluateBankAccountChange", () => {
  it("does nothing when the account has not changed", () => {
    const result = evaluateBankAccountChange({
      previousAccountNumber: "ACC-1",
      newAccountNumber: "ACC-1",
      newAccountVerified: true,
      hasPendingOrRecentPayment: false,
    });
    expect(result.blocksPaymentRelease).toBe(false);
  });

  it("blocks payment release when the new account is unverified", () => {
    const result = evaluateBankAccountChange({
      previousAccountNumber: "ACC-1",
      newAccountNumber: "ACC-2",
      newAccountVerified: false,
      hasPendingOrRecentPayment: false,
    });
    expect(result.blocksPaymentRelease).toBe(true);
  });

  it("blocks payment release when a change coincides with a payment in flight, even if verified", () => {
    const result = evaluateBankAccountChange({
      previousAccountNumber: "ACC-1",
      newAccountNumber: "ACC-2",
      newAccountVerified: true,
      hasPendingOrRecentPayment: true,
    });
    expect(result.blocksPaymentRelease).toBe(true);
    expect(result.requiresReverification).toBe(true);
  });

  it("allows release once a changed account is verified and no payment is in flight", () => {
    const result = evaluateBankAccountChange({
      previousAccountNumber: "ACC-1",
      newAccountNumber: "ACC-2",
      newAccountVerified: true,
      hasPendingOrRecentPayment: false,
    });
    expect(result.blocksPaymentRelease).toBe(false);
  });

  it("treats a first-time account (no previous) as not a change", () => {
    const result = evaluateBankAccountChange({
      previousAccountNumber: null,
      newAccountNumber: "ACC-1",
      newAccountVerified: false,
      hasPendingOrRecentPayment: false,
    });
    expect(result.blocksPaymentRelease).toBe(false);
  });
});
