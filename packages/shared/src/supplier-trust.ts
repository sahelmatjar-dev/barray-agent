import { DEFAULT_SUPPLIER_TRUST_WEIGHTS, SupplierRiskGroup, SupplierTrustWeights } from "./types";

export interface SupplierTrustInput {
  legal_existence_verified: boolean;
  years_active: number | null;
  third_party_audit: boolean;
  is_truck_specialist: boolean;
  bank_account_matches_company: boolean | null;
  digital_presence_score: number | null; // 0-100, from website/socials/marketplace presence
  export_evidence: boolean;
  communication_quality_score: number | null; // 0-100
}

export interface SupplierTrustResult {
  score: number;
  breakdown: Record<keyof SupplierTrustWeights, number>;
  risk_group: SupplierRiskGroup;
}

export function validateSupplierTrustWeights(weights: SupplierTrustWeights): void {
  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  if (Math.abs(total - 100) > 0.001) {
    throw new Error(`Supplier trust weights must sum to 100, got ${total}`);
  }
}

/** Years-active scoring ramps linearly to full credit at 8+ years. */
function yearsActiveFraction(years: number | null): number {
  if (years === null) return 0;
  return Math.max(0, Math.min(1, years / 8));
}

export function riskGroupFor(
  score: number,
  bands = { low_risk_min: 85, acceptable_min: 70, manual_review_min: 65 },
): SupplierRiskGroup {
  if (score >= bands.low_risk_min) return "LOW_RISK";
  if (score >= bands.acceptable_min) return "ACCEPTABLE";
  if (score >= bands.manual_review_min) return "MANUAL_REVIEW";
  return "HIGH_RISK";
}

export function scoreSupplierTrust(
  input: SupplierTrustInput,
  weights: SupplierTrustWeights = DEFAULT_SUPPLIER_TRUST_WEIGHTS,
): SupplierTrustResult {
  validateSupplierTrustWeights(weights);

  const breakdown = {
    legal_existence: input.legal_existence_verified ? weights.legal_existence : 0,
    years_active: yearsActiveFraction(input.years_active) * weights.years_active,
    third_party_audit: input.third_party_audit ? weights.third_party_audit : 0,
    truck_specialization: input.is_truck_specialist ? weights.truck_specialization : 0,
    bank_account_match: input.bank_account_matches_company === true ? weights.bank_account_match : 0,
    digital_presence: ((input.digital_presence_score ?? 0) / 100) * weights.digital_presence,
    export_evidence: input.export_evidence ? weights.export_evidence : 0,
    communication_quality: ((input.communication_quality_score ?? 0) / 100) * weights.communication_quality,
  };

  const score = Math.round(Object.values(breakdown).reduce((a, b) => a + b, 0));

  return {
    score: Math.min(100, Math.max(0, score)),
    breakdown,
    risk_group: riskGroupFor(score),
  };
}
