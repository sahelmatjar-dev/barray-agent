import { describe, expect, it } from "vitest";
import { calculateRoi } from "../../packages/shared/src/roi";

describe("calculateRoi", () => {
  it("calculates savings and ROI against a landed cost", () => {
    const result = calculateRoi({
      totalLandedCost: 27600,
      replacementValues: { engine: 12000, gearbox: 9000, cabin: 8000, axles: 7000, ecu: 5000 },
      usableMajorComponentCount: 5,
    });
    expect(result.partsReplacementValue).toBe(41000);
    expect(result.savingsAmount).toBe(13400);
    expect(result.savingsPct).toBeCloseTo(32.68, 1);
    expect(result.roiPct).toBeCloseTo(48.55, 1);
    expect(result.costPerUsableComponent).toBe(5520);
  });

  it("returns zero savings percentage when replacement value is zero", () => {
    const result = calculateRoi({ totalLandedCost: 1000, replacementValues: {}, usableMajorComponentCount: 0 });
    expect(result.savingsPct).toBe(0);
    expect(result.costPerUsableComponent).toBeNull();
  });

  it("ignores non-numeric replacement values instead of throwing", () => {
    const result = calculateRoi({
      totalLandedCost: 1000,
      replacementValues: { engine: 5000, gearbox: undefined },
      usableMajorComponentCount: 1,
    });
    expect(result.partsReplacementValue).toBe(5000);
  });
});
