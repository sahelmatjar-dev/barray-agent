import { query } from "../pool";

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
