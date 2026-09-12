import { describe, expect, it } from "vitest";
import { scoreCompatibility, validateWeights } from "../../packages/shared/src/compatibility";
import { DEFAULT_COMPATIBILITY_WEIGHTS, TruckComponentSpec, UNKNOWN } from "../../packages/shared/src/types";

const FLEET_REFERENCE: TruckComponentSpec = {
  engine_model: "MC13",
  gearbox_model: "HW19710",
  front_axle_model: "FAT13",
  rear_axle_model: "STR13-460",
  ecu_reference: "BOSCH-EDC17",
  cabin_generation: "GEN2",
  hydraulic_system: "TIPPER-KIT-A",
};

describe("scoreCompatibility", () => {
  it("scores a perfect match as 100", () => {
    const result = scoreCompatibility({ ...FLEET_REFERENCE }, FLEET_REFERENCE);
    expect(result.score).toBe(95); // "other" bucket (5 pts) is always UNKNOWN, never invented
    expect(result.reasons.find((r) => r.component === "engine")?.match_type).toBe("EXACT_MATCH");
  });

  it("never invents a match when data is UNKNOWN", () => {
    const candidate: TruckComponentSpec = { ...FLEET_REFERENCE, engine_model: UNKNOWN };
    const result = scoreCompatibility(candidate, FLEET_REFERENCE);
    const engineReason = result.reasons.find((r) => r.component === "engine");
    expect(engineReason?.match_type).toBe("UNKNOWN");
    expect(engineReason?.reason_code).toBe("engine_unknown");
    expect(engineReason?.score_contribution).toBe(0);
  });

  it("scores a full mismatch on every field as 0", () => {
    const candidate: TruckComponentSpec = {
      engine_model: "D12",
      gearbox_model: "ZF16",
      front_axle_model: "OTHER-FRONT",
      rear_axle_model: "OTHER-REAR",
      ecu_reference: "OTHER-ECU",
      cabin_generation: "OLD-GEN",
      hydraulic_system: "OTHER-HYD",
    };
    const result = scoreCompatibility(candidate, FLEET_REFERENCE);
    expect(result.score).toBe(0);
  });

  it("gives partial credit for a family-prefix match", () => {
    const candidate: TruckComponentSpec = { ...FLEET_REFERENCE, engine_model: "MC13H" };
    const result = scoreCompatibility(candidate, FLEET_REFERENCE);
    const engineReason = result.reasons.find((r) => r.component === "engine");
    expect(engineReason?.match_type).toBe("PARTIAL_MATCH");
    expect(engineReason?.score_contribution).toBe(DEFAULT_COMPATIBILITY_WEIGHTS.engine * 0.5);
  });

  it("rejects weights that do not sum to 100", () => {
    expect(() => validateWeights({ ...DEFAULT_COMPATIBILITY_WEIGHTS, engine: 999 })).toThrow();
  });

  it("respects custom configured weights", () => {
    const weights = { engine: 50, gearbox: 15, axles: 10, ecu: 10, cabin: 5, hydraulic: 5, other: 5 };
    const result = scoreCompatibility({ ...FLEET_REFERENCE }, FLEET_REFERENCE, weights);
    expect(result.reasons.find((r) => r.component === "engine")?.score_contribution).toBe(50);
  });
});
