import { query, queryOne } from "../pool";

export interface SystemSettingRow {
  id: string;
  key: string;
  value: unknown;
  description: string | null;
  updated_at: string;
}

export async function listSystemSettings(): Promise<SystemSettingRow[]> {
  return query<SystemSettingRow>(`SELECT * FROM system_settings ORDER BY key`);
}

export async function getSystemSetting(key: string): Promise<SystemSettingRow | null> {
  return queryOne<SystemSettingRow>(`SELECT * FROM system_settings WHERE key = $1`, [key]);
}

export async function updateSystemSetting(key: string, value: unknown, updatedBy: string): Promise<void> {
  await query(`UPDATE system_settings SET value = $1, updated_by = $2 WHERE key = $3`, [
    JSON.stringify(value), updatedBy, key,
  ]);
}
