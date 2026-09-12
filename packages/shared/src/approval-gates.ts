import { ApprovalGate, UserRole } from "./types";

/**
 * The four hard approval gates. No workflow (n8n or otherwise) may set a
 * decision on these — only an authenticated user action through the
 * dashboard API may call `decideApproval`. This module is the single place
 * that decides "who is allowed to decide what."
 */
const GATE_ALLOWED_ROLES: Record<ApprovalGate, UserRole[]> = {
  APPROVE_SUPPLIER: ["OWNER", "PROCUREMENT_MANAGER"],
  APPROVE_INSPECTION: ["OWNER", "PROCUREMENT_MANAGER", "MECHANIC"],
  APPROVE_PURCHASE: ["OWNER"],
  RELEASE_PAYMENT: ["OWNER", "FINANCE"],
};

export function canDecideGate(gate: ApprovalGate, roles: UserRole[]): boolean {
  const allowed = GATE_ALLOWED_ROLES[gate];
  return roles.some((r) => allowed.includes(r));
}

export interface ApprovalDecisionInput {
  gate: ApprovalGate;
  actingRoles: UserRole[];
  decision: "APPROVED" | "REJECTED" | "MORE_INFO_REQUESTED";
  reason?: string;
}

export class ApprovalGateError extends Error {}

/** Throws if the acting user's roles are not authorized for this gate.
 * Callers must pass this check before writing to the `approvals` table. */
export function assertCanDecideGate(input: ApprovalDecisionInput): void {
  if (!canDecideGate(input.gate, input.actingRoles)) {
    throw new ApprovalGateError(
      `Roles [${input.actingRoles.join(", ")}] are not authorized to decide gate ${input.gate}`,
    );
  }
  if (input.decision === "REJECTED" && !input.reason) {
    throw new ApprovalGateError("A rejection reason is required.");
  }
}

/** RELEASE_PAYMENT is the most sensitive gate: only OWNER or FINANCE may even
 * SEE the button in the dashboard (enforced again here, not just in the UI). */
export function canViewReleasePaymentAction(roles: UserRole[]): boolean {
  return canDecideGate("RELEASE_PAYMENT", roles);
}
