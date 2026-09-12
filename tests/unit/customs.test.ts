import { describe, expect, it } from "vitest";
import { checkCompleteVehicleRisk } from "../../packages/shared/src/customs";

describe("checkCompleteVehicleRisk", () => {
  it("flags when most of a donor truck's major components ship together", () => {
    const result = checkCompleteVehicleRisk({
      donorTruckId: "donor-1",
      batchComponentTypes: ["ENGINE", "GEARBOX", "FRONT_AXLE_1", "REAR_AXLE_1", "CABIN"],
    });
    expect(result.flagged).toBe(true);
    expect(result.message).toBe("CUSTOMS REVIEW REQUIRED — POSSIBLE GIR 2(a) CLASSIFICATION");
  });

  it("does not flag a single-component shipment", () => {
    const result = checkCompleteVehicleRisk({
      donorTruckId: "donor-1",
      batchComponentTypes: ["ENGINE"],
    });
    expect(result.flagged).toBe(false);
    expect(result.message).toBeNull();
  });

  it("respects a custom coverage threshold", () => {
    const result = checkCompleteVehicleRisk({
      donorTruckId: "donor-1",
      batchComponentTypes: ["ENGINE", "GEARBOX"],
      coverageThresholdPct: 20,
    });
    expect(result.flagged).toBe(true);
  });
});
