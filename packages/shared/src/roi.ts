/**
 * Deterministic ROI / savings calculator. Replacement values come from the
 * `parts.estimated_replacement_value` column (set by procurement from real
 * market catalogs), never guessed by AI.
 */
export type MajorComponent =
  | "engine" | "gearbox" | "cabin" | "axles" | "differentials"
  | "ecu" | "turbo" | "hydraulic" | "cooling" | "electrical" | "other";

export type ReplacementValues = Partial<Record<MajorComponent, number>>;

export interface RoiInput {
  totalLandedCost: number;
  replacementValues: ReplacementValues;
  usableMajorComponentCount: number;
}

export interface RoiResult {
  partsReplacementValue: number;
  savingsAmount: number;
  savingsPct: number;
  roiPct: number;
  costPerUsableComponent: number | null;
}

export function calculateRoi(input: RoiInput): RoiResult {
  const partsReplacementValue = Object.values(input.replacementValues).reduce(
    (sum, v) => sum + (typeof v === "number" && Number.isFinite(v) ? v : 0),
    0,
  );

  const savingsAmount = Math.round((partsReplacementValue - input.totalLandedCost) * 100) / 100;
  const savingsPct = partsReplacementValue > 0
    ? Math.round((savingsAmount / partsReplacementValue) * 10000) / 100
    : 0;
  const roiPct = input.totalLandedCost > 0
    ? Math.round((savingsAmount / input.totalLandedCost) * 10000) / 100
    : 0;
  const costPerUsableComponent = input.usableMajorComponentCount > 0
    ? Math.round((input.totalLandedCost / input.usableMajorComponentCount) * 100) / 100
    : null;

  return { partsReplacementValue, savingsAmount, savingsPct, roiPct, costPerUsableComponent };
}
