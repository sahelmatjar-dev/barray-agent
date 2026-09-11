import { describe, expect, it } from "vitest";
import {
  ApprovalGateError,
  assertCanDecideGate,
  canDecideGate,
  canViewReleasePaymentAction,
} from "../../packages/shared/src/approval-gates";

describe("approval gates", () => {
  it("only OWNER may approve a purchase", () => {
    expect(canDecideGate("APPROVE_PURCHASE", ["OWNER"])).toBe(true);
    expect(canDecideGate("APPROVE_PURCHASE", ["PROCUREMENT_MANAGER"])).toBe(false);
    expect(canDecideGate("APPROVE_PURCHASE", ["FINANCE"])).toBe(false);
  });

  it("only OWNER or FINANCE may release payment", () => {
    expect(canViewReleasePaymentAction(["FINANCE"])).toBe(true);
    expect(canViewReleasePaymentAction(["OWNER"])).toBe(true);
    expect(canViewReleasePaymentAction(["PROCUREMENT_MANAGER"])).toBe(false);
    expect(canViewReleasePaymentAction(["MECHANIC", "LOGISTICS"])).toBe(false);
  });

  it("mechanics can approve inspections but not purchases", () => {
    expect(canDecideGate("APPROVE_INSPECTION", ["MECHANIC"])).toBe(true);
    expect(canDecideGate("APPROVE_PURCHASE", ["MECHANIC"])).toBe(false);
  });

  it("throws ApprovalGateError when an unauthorized role attempts a decision", () => {
    expect(() =>
      assertCanDecideGate({ gate: "RELEASE_PAYMENT", actingRoles: ["WAREHOUSE"], decision: "APPROVED" }),
    ).toThrow(ApprovalGateError);
  });

  it("requires a reason on rejection", () => {
    expect(() =>
      assertCanDecideGate({ gate: "APPROVE_SUPPLIER", actingRoles: ["OWNER"], decision: "REJECTED" }),
    ).toThrow(ApprovalGateError);
    expect(() =>
      assertCanDecideGate({
        gate: "APPROVE_SUPPLIER",
        actingRoles: ["OWNER"],
        decision: "REJECTED",
        reason: "Fraud risk too high",
      }),
    ).not.toThrow();
  });
});
