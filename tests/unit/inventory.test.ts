import { describe, expect, it } from "vitest";
import { applyMovement, canApplyMovement } from "../../packages/shared/src/inventory";

describe("inventory movements", () => {
  it("receives a new part into AVAILABLE", () => {
    expect(applyMovement(null, "RECEIVED")).toBe("AVAILABLE");
  });

  it("cannot re-receive an already-existing part", () => {
    expect(canApplyMovement("AVAILABLE", "RECEIVED")).toBe(false);
  });

  it("reserves and releases correctly", () => {
    expect(applyMovement("AVAILABLE", "RESERVED")).toBe("RESERVED");
    expect(applyMovement("RESERVED", "RELEASED")).toBe("AVAILABLE");
  });

  it("cannot install a part that is already SOLD", () => {
    expect(canApplyMovement("SOLD", "INSTALLED")).toBe(false);
    expect(() => applyMovement("SOLD", "INSTALLED")).toThrow();
  });

  it("supports the full traceability path: available -> reserved -> installed -> removed -> available", () => {
    let status = applyMovement(null, "RECEIVED");
    status = applyMovement(status, "RESERVED");
    status = applyMovement(status, "INSTALLED");
    status = applyMovement(status, "REMOVED");
    expect(status).toBe("AVAILABLE");
  });

  it("cannot scrap a SOLD part", () => {
    expect(canApplyMovement("SOLD", "SCRAPPED")).toBe(false);
  });
});
