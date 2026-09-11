import { describe, expect, it } from "vitest";
import { detectFraud, FraudCheckInput } from "../../packages/shared/src/fraud-detection";

const CLEAN_INPUT: FraudCheckInput = {
  duplicateVin: false,
  duplicatePhotoMatch: false,
  supplierBankNameMismatch: false,
  bankAccountIsPersonal: false,
  bankAccountChangedRecently: false,
  priceDeviationPct: 0.05,
  mileageConflict: false,
  engineNumberConflict: false,
  companyInfoConflict: false,
};

describe("detectFraud", () => {
  it("returns LOW risk and no freeze for a clean opportunity", () => {
    const result = detectFraud(CLEAN_INPUT);
    expect(result.overallRisk).toBe("LOW");
    expect(result.freezeRequired).toBe(false);
  });

  it("freezes the purchase process on a duplicate VIN (CRITICAL)", () => {
    const result = detectFraud({ ...CLEAN_INPUT, duplicateVin: true });
    expect(result.overallRisk).toBe("CRITICAL");
    expect(result.freezeRequired).toBe(true);
  });

  it("freezes on an unexpected bank account change (CRITICAL)", () => {
    const result = detectFraud({ ...CLEAN_INPUT, bankAccountChangedRecently: true });
    expect(result.overallRisk).toBe("CRITICAL");
    expect(result.freezeRequired).toBe(true);
  });

  it("flags a personal bank account as HIGH without freezing", () => {
    const result = detectFraud({ ...CLEAN_INPUT, bankAccountIsPersonal: true });
    expect(result.overallRisk).toBe("HIGH");
    expect(result.freezeRequired).toBe(false);
  });

  it("takes the worst severity across multiple triggered rules", () => {
    const result = detectFraud({
      ...CLEAN_INPUT,
      priceDeviationPct: 0.5, // MEDIUM
      engineNumberConflict: true, // HIGH
    });
    expect(result.overallRisk).toBe("HIGH");
  });

  it("does not trigger the suspicious price rule under the 40% threshold", () => {
    const result = detectFraud({ ...CLEAN_INPUT, priceDeviationPct: 0.39 });
    expect(result.rules.find((r) => r.code === "suspicious_price")?.triggered).toBe(false);
  });
});
