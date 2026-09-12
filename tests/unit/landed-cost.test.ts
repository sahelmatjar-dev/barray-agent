import { describe, expect, it } from "vitest";
import { calculateLandedCost } from "../../packages/shared/src/landed-cost";

describe("calculateLandedCost", () => {
  it("sums every cost component deterministically", () => {
    const result = calculateLandedCost({
      purchasePrice: 17800,
      inspection: 250,
      dismantling: 600,
      packing: 450,
      chinaTransport: 300,
      exportFees: 150,
      freight: 4200,
      insurance: 180,
      destinationCharges: 900,
      customsDuty: 1100,
      vat: 1600,
      customsBroker: 300,
      moroccoTransport: 400,
      miscellaneous: 100,
    });
    expect(result.totalLandedCost).toBe(28330);
  });

  it("defaults missing optional fields to 0", () => {
    const result = calculateLandedCost({ purchasePrice: 10000 });
    expect(result.totalLandedCost).toBe(10000);
  });

  it("rejects negative values instead of silently ignoring them", () => {
    expect(() => calculateLandedCost({ purchasePrice: 10000, freight: -1 })).toThrow();
  });

  it("never lets a partial/undefined field crash the calculation", () => {
    expect(() => calculateLandedCost({ purchasePrice: 5000, vat: undefined })).not.toThrow();
  });
});
