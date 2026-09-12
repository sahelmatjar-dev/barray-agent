import { query, queryOne } from "../pool";

export async function listCustomsRecords() {
  return query(
    `SELECT cr.*, d.code AS donor_code FROM customs_records cr
     LEFT JOIN donor_trucks d ON d.id = cr.donor_id ORDER BY cr.created_at DESC`,
  );
}

export async function getCustomsRecord(id: string) {
  return queryOne(`SELECT * FROM customs_records WHERE id = $1`, [id]);
}

export async function verifyCustomsRecord(id: string, verifiedBy: string, hsCode: string): Promise<void> {
  await query(
    `UPDATE customs_records SET customs_verified = true, verified_by = $1, verified_at = now(), candidate_hs_code = $2, status = 'VERIFIED' WHERE id = $3`,
    [verifiedBy, hsCode, id],
  );
}

export interface CreateCustomsFlagInput {
  donorId: string;
  coveragePct: number;
  presentComponents: string[];
  flagged: boolean;
  message: string | null;
}

export async function recordCompleteVehicleCheck(input: CreateCustomsFlagInput): Promise<void> {
  await query(
    `INSERT INTO customs_records (donor_id, source, reason, complete_vehicle_flag, complete_vehicle_flag_reason, status)
     VALUES ($1, 'HISTORICAL', $2, $3, $4, $5)`,
    [
      input.donorId,
      `Component coverage ${input.coveragePct}% across [${input.presentComponents.join(", ")}]`,
      input.flagged,
      input.message,
      input.flagged ? "ESCALATED" : "PENDING_REVIEW",
    ],
  );
}
