import { describe, expect, it } from "vitest";
import { riskGroupFor, scoreSupplierTrust } from "../../packages/shared/src/supplier-trust";

describe("scoreSupplierTrust", () => {
  it("scores a fully-verified specialist supplier as LOW_RISK", () => {
    const result = scoreSupplierTrust({
      legal_existence_verified: true,
      years_active: 10,
      third_party_audit: true,
      is_truck_specialist: true,
      bank_account_matches_company: true,
      digital_presence_score: 100,
      export_evidence: true,
      communication_quality_score: 100,
    });
    expect(result.score).toBe(100);
    expect(result.risk_group).toBe("LOW_RISK");
  });

  it("scores an unverified, brand-new supplier as HIGH_RISK", () => {
    const result = scoreSupplierTrust({
      legal_existence_verified: false,
      years_active: 0,
      third_party_audit: false,
      is_truck_specialist: false,
      bank_account_matches_company: false,
      digital_presence_score: 0,
      export_evidence: false,
      communication_quality_score: 0,
    });
    expect(result.score).toBe(0);
    expect(result.risk_group).toBe("HIGH_RISK");
  });

  it("maps boundary scores to the correct risk group", () => {
    expect(riskGroupFor(85)).toBe("LOW_RISK");
    expect(riskGroupFor(84)).toBe("ACCEPTABLE");
    expect(riskGroupFor(70)).toBe("ACCEPTABLE");
    expect(riskGroupFor(69)).toBe("MANUAL_REVIEW");
    expect(riskGroupFor(65)).toBe("MANUAL_REVIEW");
    expect(riskGroupFor(64)).toBe("HIGH_RISK");
  });

  it("never scores an unmatched bank account as trust-contributing", () => {
    const result = scoreSupplierTrust({
      legal_existence_verified: true,
      years_active: 8,
      third_party_audit: true,
      is_truck_specialist: true,
      bank_account_matches_company: null, // unknown, must not be treated as a match
      digital_presence_score: 80,
      export_evidence: true,
      communication_quality_score: 80,
    });
    expect(result.breakdown.bank_account_match).toBe(0);
  });
});
