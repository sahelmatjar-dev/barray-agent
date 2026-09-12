import { ApprovalGate, assertCanDecideGate, UserRole } from "@barray/shared";
import { query, queryOne } from "../pool";
import { writeAuditLog } from "../audit";

export interface ApprovalRow {
  id: string;
  gate: ApprovalGate;
  entity: string;
  entity_id: string;
  decision: string;
  snapshot: unknown;
  created_at: string;
}

export async function listPendingApprovals(gate?: ApprovalGate): Promise<ApprovalRow[]> {
  if (gate) {
    return query<ApprovalRow>(`SELECT * FROM approvals WHERE status = 'PENDING' AND gate = $1 ORDER BY created_at`, [gate]);
  }
  return query<ApprovalRow>(`SELECT * FROM approvals WHERE status = 'PENDING' ORDER BY created_at`);
}

export async function createApprovalRequest(
  gate: ApprovalGate,
  entity: string,
  entityId: string,
  snapshot: unknown,
  requestedBy: string | null,
): Promise<string> {
  const row = await queryOne<{ id: string }>(
    `INSERT INTO approvals (gate, entity, entity_id, requested_by, snapshot)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [gate, entity, entityId, requestedBy, JSON.stringify(snapshot)],
  );
  return row!.id;
}

/**
 * The single choke point for deciding any of the four hard approval gates.
 * Validates role authorization via @barray/shared BEFORE writing anything,
 * and always writes an audit log entry (critical event).
 */
export async function decideApproval(
  approvalId: string,
  decision: "APPROVED" | "REJECTED" | "MORE_INFO_REQUESTED",
  decidedBy: string,
  actingRoles: UserRole[],
  reason?: string,
): Promise<ApprovalRow> {
  const approval = await queryOne<ApprovalRow>(`SELECT * FROM approvals WHERE id = $1`, [approvalId]);
  if (!approval) throw new Error(`Approval ${approvalId} not found`);

  assertCanDecideGate({ gate: approval.gate, actingRoles, decision, reason });

  const updated = await queryOne<ApprovalRow>(
    `UPDATE approvals SET decision = $1, status = $1, decided_by = $2, decision_reason = $3, decided_at = now()
     WHERE id = $4 RETURNING *`,
    [decision, decidedBy, reason ?? null, approvalId],
  );

  await writeAuditLog({
    userId: decidedBy,
    action: `APPROVAL_${decision}`,
    entity: approval.entity,
    entityId: approval.entity_id,
    newValue: { gate: approval.gate, decision },
    reason,
  });

  return updated!;
}
