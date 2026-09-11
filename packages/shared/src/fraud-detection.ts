import { FraudRiskLevel } from "./types";

export interface FraudCheckInput {
  duplicateVin: boolean;
  duplicatePhotoMatch: boolean;
  supplierBankNameMismatch: boolean;
  bankAccountIsPersonal: boolean;
  bankAccountChangedRecently: boolean; // changed since last verified payment
  priceDeviationPct: number | null; // (asking - marketMedian) / marketMedian, signed
  mileageConflict: boolean; // mileage disagrees across documents/quotes
  engineNumberConflict: boolean;
  companyInfoConflict: boolean; // e.g. business license vs. quote letterhead mismatch
}

export interface FraudRule {
  code: string;
  triggered: boolean;
  severity: FraudRiskLevel;
  message: string;
}

export interface FraudDetectionResult {
  overallRisk: FraudRiskLevel;
  rules: FraudRule[];
  freezeRequired: boolean;
}

const SEVERITY_ORDER: FraudRiskLevel[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

function worst(a: FraudRiskLevel, b: FraudRiskLevel): FraudRiskLevel {
  return SEVERITY_ORDER.indexOf(a) >= SEVERITY_ORDER.indexOf(b) ? a : b;
}

/**
 * Deterministic fraud rule engine. Every rule is an explicit, auditable
 * condition — never an AI judgment call. A CRITICAL result must freeze the
 * purchase process (see packages/shared/src/state-machine.ts FROZEN status
 * and database/migrations 004_opportunities.sql trigger).
 */
export function detectFraud(input: FraudCheckInput): FraudDetectionResult {
  const rules: FraudRule[] = [
    {
      code: "duplicate_vin",
      triggered: input.duplicateVin,
      severity: "CRITICAL",
      message: "This VIN already exists on another opportunity or donor truck.",
    },
    {
      code: "duplicate_photos",
      triggered: input.duplicatePhotoMatch,
      severity: "HIGH",
      message: "Listing photos match another supplier's listing (perceptual hash match).",
    },
    {
      code: "supplier_bank_mismatch",
      triggered: input.supplierBankNameMismatch,
      severity: "HIGH",
      message: "Bank account holder name does not match the supplier's legal name.",
    },
    {
      code: "personal_bank_account",
      triggered: input.bankAccountIsPersonal,
      severity: "HIGH",
      message: "Payment is requested to a personal bank account, not a company account.",
    },
    {
      code: "unexpected_bank_change",
      triggered: input.bankAccountChangedRecently,
      severity: "CRITICAL",
      message: "Beneficiary bank account changed since the last verified payment to this supplier.",
    },
    {
      code: "suspicious_price",
      triggered: input.priceDeviationPct !== null && Math.abs(input.priceDeviationPct) >= 0.4,
      severity: "MEDIUM",
      message: "Asking price deviates 40%+ from market median for this model/configuration.",
    },
    {
      code: "conflicting_mileage",
      triggered: input.mileageConflict,
      severity: "MEDIUM",
      message: "Mileage figures conflict between listing, quote, and/or inspection sources.",
    },
    {
      code: "conflicting_engine_number",
      triggered: input.engineNumberConflict,
      severity: "HIGH",
      message: "Engine serial number conflicts across documents.",
    },
    {
      code: "conflicting_company_information",
      triggered: input.companyInfoConflict,
      severity: "MEDIUM",
      message: "Company information conflicts across business license, website and quote letterhead.",
    },
  ];

  const triggeredRules = rules.filter((r) => r.triggered);
  const overallRisk = triggeredRules.reduce<FraudRiskLevel>((acc, r) => worst(acc, r.severity), "LOW");

  return {
    overallRisk,
    rules,
    freezeRequired: overallRisk === "CRITICAL",
  };
}
