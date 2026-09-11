import { describe, expect, it } from "vitest";
import { assertTransition, canTransition } from "../../packages/shared/src/state-machine";

describe("opportunity state machine", () => {
  it("allows the documented forward path", () => {
    expect(canTransition("DISCOVERED", "SCREENING")).toBe(true);
    expect(canTransition("SCREENING", "SUPPLIER_REVIEW")).toBe(true);
    expect(canTransition("APPROVED", "PURCHASED")).toBe(true);
    expect(canTransition("RECEIVED", "CLOSED")).toBe(true);
  });

  it("rejects skipping steps", () => {
    expect(canTransition("DISCOVERED", "PURCHASED")).toBe(false);
    expect(canTransition("RFQ_SENT", "APPROVED")).toBe(false);
  });

  it("rejects moving backwards", () => {
    expect(canTransition("NEGOTIATING", "QUOTE_RECEIVED")).toBe(false);
  });

  it("allows freezing from any active status", () => {
    expect(canTransition("NEGOTIATING", "FROZEN")).toBe(true);
    expect(canTransition("INSPECTION_PENDING", "FROZEN")).toBe(true);
  });

  it("only allows resuming from FROZEN to the status it was frozen from", () => {
    expect(canTransition("FROZEN", "NEGOTIATING", "NEGOTIATING")).toBe(true);
    expect(canTransition("FROZEN", "APPROVED", "NEGOTIATING")).toBe(false);
  });

  it("treats CLOSED and REJECTED as terminal", () => {
    expect(canTransition("CLOSED", "DISCOVERED")).toBe(false);
    expect(canTransition("REJECTED", "SCREENING")).toBe(false);
  });

  it("assertTransition throws on an invalid transition", () => {
    expect(() => assertTransition("DISCOVERED", "APPROVED")).toThrow();
    expect(() => assertTransition("DISCOVERED", "SCREENING")).not.toThrow();
  });
});
