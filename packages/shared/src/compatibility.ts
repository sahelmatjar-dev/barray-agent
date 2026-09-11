import {
  CompatibilityResult,
  CompatibilityWeights,
  DEFAULT_COMPATIBILITY_WEIGHTS,
  TruckComponent,
  TruckComponentSpec,
  UNKNOWN,
} from "./types";

/**
 * Deterministic compatibility scoring between a candidate donor truck's
 * component specs and EL BARRAY RA's fleet reference specs.
 *
 * This is pure, rule-based comparison. It never calls an AI provider and
 * never invents a match — a component that cannot be confirmed is always
 * scored as UNKNOWN, never assumed compatible.
 */

type ComponentKey = keyof CompatibilityWeights;

const COMPONENT_FIELD_MAP: Record<Exclude<ComponentKey, "axles" | "other">, keyof TruckComponentSpec> = {
  engine: "engine_model",
  gearbox: "gearbox_model",
  ecu: "ecu_reference",
  cabin: "cabin_generation",
  hydraulic: "hydraulic_system",
};

function normalize(value: string): string {
  return value.trim().toUpperCase().replace(/\s+/g, " ");
}

function compareField(
  component: TruckComponent,
  reasonPrefix: string,
  candidate: string | typeof UNKNOWN,
  reference: string | typeof UNKNOWN,
  weight: number,
): CompatibilityResult["reasons"][number] {
  if (candidate === UNKNOWN || reference === UNKNOWN) {
    return {
      component,
      reason_code: `${reasonPrefix}_unknown`,
      match_type: "UNKNOWN" as const,
      score_contribution: 0,
      max_contribution: weight,
    };
  }
  if (normalize(candidate) === normalize(reference)) {
    return {
      component,
      reason_code: `${reasonPrefix}_exact_match`,
      match_type: "EXACT_MATCH" as const,
      score_contribution: weight,
      max_contribution: weight,
    };
  }
  // Partial match: same family prefix (e.g. "MC13" vs "MC13H") counts as partial.
  const a = normalize(candidate);
  const b = normalize(reference);
  const isPartial = a.startsWith(b.slice(0, 4)) || b.startsWith(a.slice(0, 4));
  if (isPartial) {
    return {
      component,
      reason_code: `${reasonPrefix}_partial_match`,
      match_type: "PARTIAL_MATCH" as const,
      score_contribution: weight * 0.5,
      max_contribution: weight,
    };
  }
  return {
    component,
    reason_code: `${reasonPrefix}_mismatch`,
    match_type: "MISMATCH" as const,
    score_contribution: 0,
    max_contribution: weight,
  };
}

export function validateWeights(weights: CompatibilityWeights): void {
  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  if (Math.abs(total - 100) > 0.001) {
    throw new Error(`Compatibility weights must sum to 100, got ${total}`);
  }
}

export function scoreCompatibility(
  candidate: TruckComponentSpec,
  reference: TruckComponentSpec,
  weights: CompatibilityWeights = DEFAULT_COMPATIBILITY_WEIGHTS,
): CompatibilityResult {
  validateWeights(weights);

  const reasons: CompatibilityResult["reasons"] = [];

  for (const [component, field] of Object.entries(COMPONENT_FIELD_MAP) as [
    Exclude<ComponentKey, "axles" | "other">,
    keyof TruckComponentSpec,
  ][]) {
    reasons.push(compareField(component, component, candidate[field], reference[field], weights[component]));
  }

  // Axles: average of front + rear axle comparisons, weighted as a single "axles" bucket.
  const frontAxle = compareField("axles", "front_axle", candidate.front_axle_model, reference.front_axle_model, weights.axles / 2);
  const rearAxle = compareField("axles", "rear_axle", candidate.rear_axle_model, reference.rear_axle_model, weights.axles / 2);
  reasons.push(frontAxle, rearAxle);

  // "other" bucket is reserved for future component checks (e.g. PTO type);
  // with nothing to compare it is UNKNOWN by default and never invented.
  reasons.push({
    component: "other",
    reason_code: "other_unknown",
    match_type: "UNKNOWN",
    score_contribution: 0,
    max_contribution: weights.other,
  });

  const score = Math.round(reasons.reduce((sum, r) => sum + r.score_contribution, 0));

  return { score: Math.min(100, Math.max(0, score)), reasons };
}
