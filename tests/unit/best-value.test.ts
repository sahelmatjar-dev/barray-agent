import { describe, expect, it } from "vitest";
import { rankQuotesByBestValue } from "../../packages/shared/src/best-value";

describe("rankQuotesByBestValue", () => {
  it("ranks the cheaper, more compatible, more trusted quote first", () => {
    const results = rankQuotesByBestValue([
      {
        id: "A", compatibilityScore: 96, mechanicalScore: 89, supplierTrustScore: 91,
        totalPrice: 27600, mileageKm: 220000, year: 2021, documentationCompletenessPct: 90, logisticsScore: 80,
      },
      {
        id: "B", compatibilityScore: 60, mechanicalScore: 50, supplierTrustScore: 40,
        totalPrice: 32000, mileageKm: 350000, year: 2016, documentationCompletenessPct: 40, logisticsScore: 50,
      },
    ]);
    expect(results[0].id).toBe("A");
    expect(results[0].score).toBeGreaterThan(results[1].score);
  });

  it("returns an empty array for no candidates", () => {
    expect(rankQuotesByBestValue([])).toEqual([]);
  });
});
