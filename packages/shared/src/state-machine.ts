import { OpportunityStatus } from "./types";

/** Mirrors database/migrations/001_core.sql opportunity_status_transitions.
 * Kept here too so the dashboard/API can validate before round-tripping to
 * Postgres, and so packages/shared has a DB-free unit-testable source of truth.
 * The Postgres trigger `enforce_opportunity_transition` is the ultimate backstop.
 */
export const OPPORTUNITY_TRANSITIONS: Record<OpportunityStatus, OpportunityStatus[]> = {
  DISCOVERED: ["SCREENING", "FROZEN"],
  SCREENING: ["SUPPLIER_REVIEW", "REJECTED", "FROZEN"],
  SUPPLIER_REVIEW: ["SUPPLIER_APPROVAL", "REJECTED", "FROZEN"],
  SUPPLIER_APPROVAL: ["RFQ_PENDING", "REJECTED", "FROZEN"],
  RFQ_PENDING: ["RFQ_SENT", "FROZEN"],
  RFQ_SENT: ["QUOTE_RECEIVED", "FROZEN"],
  QUOTE_RECEIVED: ["NEGOTIATING", "FROZEN"],
  NEGOTIATING: ["INSPECTION_PENDING", "REJECTED", "FROZEN"],
  INSPECTION_PENDING: ["INSPECTION_COMPLETE", "FROZEN"],
  INSPECTION_COMPLETE: ["PURCHASE_APPROVAL", "REJECTED", "FROZEN"],
  PURCHASE_APPROVAL: ["APPROVED", "REJECTED", "FROZEN"],
  APPROVED: ["PURCHASED", "FROZEN"],
  PURCHASED: ["DISMANTLING", "FROZEN"],
  DISMANTLING: ["PACKING", "FROZEN"],
  PACKING: ["READY_TO_SHIP", "FROZEN"],
  READY_TO_SHIP: ["SHIPPED", "FROZEN"],
  SHIPPED: ["IN_TRANSIT", "FROZEN"],
  IN_TRANSIT: ["CUSTOMS", "FROZEN"],
  CUSTOMS: ["RECEIVING", "FROZEN"],
  RECEIVING: ["RECEIVED", "FROZEN"],
  RECEIVED: ["CLOSED", "FROZEN"],
  CLOSED: [],
  REJECTED: [],
  FROZEN: [], // resuming from FROZEN is handled separately via frozenFromStatus
};

export function canTransition(
  from: OpportunityStatus,
  to: OpportunityStatus,
  frozenFromStatus?: OpportunityStatus | null,
): boolean {
  if (from === to) return false;
  if (from === "FROZEN") {
    return to === frozenFromStatus;
  }
  return OPPORTUNITY_TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertTransition(
  from: OpportunityStatus,
  to: OpportunityStatus,
  frozenFromStatus?: OpportunityStatus | null,
): void {
  if (!canTransition(from, to, frozenFromStatus)) {
    throw new Error(`Invalid opportunity status transition: ${from} -> ${to}`);
  }
}
