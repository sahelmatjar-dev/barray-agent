/**
 * Deterministic landed-cost calculator. This is plain arithmetic — the AI
 * layer must NEVER compute this number (see docs/safety-rules.md). Every
 * input defaults to 0 so an incomplete cost record still produces a
 * (clearly partial) total rather than throwing.
 */
export interface LandedCostInput {
  purchasePrice: number;
  inspection?: number;
  dismantling?: number;
  packing?: number;
  chinaTransport?: number;
  exportFees?: number;
  freight?: number;
  insurance?: number;
  destinationCharges?: number;
  customsDuty?: number;
  vat?: number;
  customsBroker?: number;
  moroccoTransport?: number;
  miscellaneous?: number;
}

export interface LandedCostBreakdown extends Required<LandedCostInput> {
  totalLandedCost: number;
}

const FIELDS: (keyof LandedCostInput)[] = [
  "purchasePrice", "inspection", "dismantling", "packing", "chinaTransport",
  "exportFees", "freight", "insurance", "destinationCharges", "customsDuty",
  "vat", "customsBroker", "moroccoTransport", "miscellaneous",
];

export function calculateLandedCost(input: LandedCostInput): LandedCostBreakdown {
  const normalized = FIELDS.reduce((acc, field) => {
    const value = input[field] ?? 0;
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
      throw new Error(`landed cost field "${field}" must be a non-negative finite number, got ${value}`);
    }
    acc[field] = value;
    return acc;
  }, {} as Required<LandedCostInput>);

  const totalLandedCost = FIELDS.reduce((sum, field) => sum + normalized[field], 0);

  return { ...normalized, totalLandedCost: Math.round(totalLandedCost * 100) / 100 };
}
