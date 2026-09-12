import { query } from "../pool";

export async function createAlert(input: {
  type: string; severity: "INFO" | "WARNING" | "CRITICAL"; entity?: string; entityId?: string;
  title: string; message: string;
}): Promise<void> {
  await query(
    `INSERT INTO alerts (type, severity, entity, entity_id, title, message) VALUES ($1, $2, $3, $4, $5, $6)`,
    [input.type, input.severity, input.entity ?? null, input.entityId ?? null, input.title, input.message],
  );
}
