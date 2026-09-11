import { query } from "./pool";

export interface AuditLogEntry {
  userId: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  oldValue?: unknown;
  newValue?: unknown;
  reason?: string;
  workflowId?: string;
}

/** Every approval, bank-data change, and customs override must call this. */
export async function writeAuditLog(entry: AuditLogEntry): Promise<void> {
  await query(
    `INSERT INTO audit_logs (user_id, action, entity, entity_id, old_value, new_value, reason, workflow_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      entry.userId,
      entry.action,
      entry.entity,
      entry.entityId,
      entry.oldValue ? JSON.stringify(entry.oldValue) : null,
      entry.newValue ? JSON.stringify(entry.newValue) : null,
      entry.reason ?? null,
      entry.workflowId ?? null,
    ],
  );
}
