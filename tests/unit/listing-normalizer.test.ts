import { describe, expect, it } from "vitest";
import {
  extractConfiguration, extractCurrency, extractModel, extractPrice, extractYear,
} from "../../packages/shared/src/listing-normalizer";

describe("listing normalizer", () => {
  it("extracts a known model", () => {
    expect(extractModel("2021 SITRAK C7H 8x4 dump truck")).toBe("C7H");
    expect(extractModel("Used G7 tipper")).toBe("G7");
    expect(extractModel("random Chinese truck")).toBe("OTHER");
  });

  it("extracts a known configuration", () => {
    expect(extractConfiguration("SITRAK 8x4 tipper")).toBe("8x4");
    expect(extractConfiguration("6×4 dump truck")).toBe("6x4");
    expect(extractConfiguration("no config mentioned")).toBe("OTHER");
  });

  it("extracts a 4-digit year", () => {
    expect(extractYear("Manufactured in 2021, low mileage")).toBe(2021);
    expect(extractYear("no year here")).toBeNull();
  });

  it("extracts a price without fabricating one", () => {
    expect(extractPrice("$17,800 negotiable")).toBe(17800);
    expect(extractPrice(null)).toBeNull();
    expect(extractPrice("call for price")).toBeNull();
  });

  it("defaults currency to USD when ambiguous", () => {
    expect(extractCurrency("17800 USD")).toBe("USD");
    expect(extractCurrency("120000 RMB")).toBe("CNY");
    expect(extractCurrency(null)).toBe("USD");
  });
});
