/**
 * Deterministic GIR 2(a) ("complete vehicle in disassembled form") risk flag.
 * This is a coverage heuristic over which major components of ONE donor
 * truck are present in a single import batch — never an HS code decision.
 * A true result must always surface:
 *   "CUSTOMS REVIEW REQUIRED — POSSIBLE GIR 2(a) CLASSIFICATION"
 * and must never be auto-cleared; a human sets customs_verified.
 */
export const MAJOR_COMPONENT_TYPES = [
  "ENGINE", "GEARBOX", "FRONT_AXLE_1", "FRONT_AXLE_2", "REAR_AXLE_1", "REAR_AXLE_2", "CABIN",
] as const;
export type MajorComponentType = (typeof MAJOR_COMPONENT_TYPES)[number];

export interface CompleteVehicleCheckInput {
  donorTruckId: string;
  batchComponentTypes: MajorComponentType[]; // components of THIS donor truck present in the same shipment/batch
  coverageThresholdPct?: number; // default 70%
}

export interface CompleteVehicleCheckResult {
  flagged: boolean;
  coveragePct: number;
  presentComponents: MajorComponentType[];
  missingComponents: MajorComponentType[];
  message: string | null;
}

export function checkCompleteVehicleRisk(input: CompleteVehicleCheckInput): CompleteVehicleCheckResult {
  const threshold = input.coverageThresholdPct ?? 70;
  const present = Array.from(new Set(input.batchComponentTypes));
  const coveragePct = Math.round((present.length / MAJOR_COMPONENT_TYPES.length) * 10000) / 100;
  const missing = MAJOR_COMPONENT_TYPES.filter((c) => !present.includes(c));
  const flagged = coveragePct >= threshold;

  return {
    flagged,
    coveragePct,
    presentComponents: present,
    missingComponents: missing,
    message: flagged ? "CUSTOMS REVIEW REQUIRED — POSSIBLE GIR 2(a) CLASSIFICATION" : null,
  };
}
