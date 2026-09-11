export type TruckComponent = "engine" | "gearbox" | "axles" | "ecu" | "cabin" | "hydraulic" | "other";

export type MatchType = "EXACT_MATCH" | "PARTIAL_MATCH" | "MISMATCH" | "UNKNOWN";

/** Use the literal string "UNKNOWN" instead of null/undefined for any real-world
 * field that could not be confirmed. Never fabricate a value. See docs/safety-rules.md. */
export const UNKNOWN = "UNKNOWN" as const;
export type Unknown = typeof UNKNOWN;

export interface TruckComponentSpec {
  engine_model: string | Unknown;
  gearbox_model: string | Unknown;
  front_axle_model: string | Unknown;
  rear_axle_model: string | Unknown;
  ecu_reference: string | Unknown;
  cabin_generation: string | Unknown;
  hydraulic_system: string | Unknown;
}

export interface CompatibilityWeights {
  engine: number;
  gearbox: number;
  axles: number;
  ecu: number;
  cabin: number;
  hydraulic: number;
  other: number;
}

export const DEFAULT_COMPATIBILITY_WEIGHTS: CompatibilityWeights = {
  engine: 25,
  gearbox: 20,
  axles: 15,
  ecu: 15,
  cabin: 10,
  hydraulic: 10,
  other: 5,
};

export interface CompatibilityReasonEntry {
  component: TruckComponent;
  reason_code: string;
  match_type: MatchType;
  score_contribution: number;
  max_contribution: number;
}

export interface CompatibilityResult {
  score: number;
  reasons: CompatibilityReasonEntry[];
}

export interface SupplierTrustWeights {
  legal_existence: number;
  years_active: number;
  third_party_audit: number;
  truck_specialization: number;
  bank_account_match: number;
  digital_presence: number;
  export_evidence: number;
  communication_quality: number;
}

export const DEFAULT_SUPPLIER_TRUST_WEIGHTS: SupplierTrustWeights = {
  legal_existence: 20,
  years_active: 10,
  third_party_audit: 15,
  truck_specialization: 15,
  bank_account_match: 15,
  digital_presence: 10,
  export_evidence: 10,
  communication_quality: 5,
};

export type SupplierRiskGroup = "LOW_RISK" | "ACCEPTABLE" | "MANUAL_REVIEW" | "HIGH_RISK";

export type FraudRiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type OpportunityStatus =
  | "DISCOVERED" | "SCREENING" | "SUPPLIER_REVIEW" | "SUPPLIER_APPROVAL"
  | "RFQ_PENDING" | "RFQ_SENT" | "QUOTE_RECEIVED" | "NEGOTIATING"
  | "INSPECTION_PENDING" | "INSPECTION_COMPLETE" | "PURCHASE_APPROVAL"
  | "APPROVED" | "REJECTED" | "PURCHASED" | "DISMANTLING" | "PACKING"
  | "READY_TO_SHIP" | "SHIPPED" | "IN_TRANSIT" | "CUSTOMS" | "RECEIVING"
  | "RECEIVED" | "CLOSED" | "FROZEN";

export type ApprovalGate = "APPROVE_SUPPLIER" | "APPROVE_INSPECTION" | "APPROVE_PURCHASE" | "RELEASE_PAYMENT";

export type UserRole =
  | "OWNER" | "PROCUREMENT_MANAGER" | "FINANCE" | "MECHANIC"
  | "LOGISTICS" | "WAREHOUSE" | "VIEWER";
