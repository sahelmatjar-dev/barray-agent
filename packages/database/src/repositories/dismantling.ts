import { query, queryOne, withTransaction } from "../pool";

/** WF-016: creates the donor truck (if one doesn't already exist for this
 * opportunity) plus its dismantling job. Hard rules (no engine/gearbox
 * opening, no harness cutting, label connectors, drain fluids, before/after
 * photos) are tracked as booleans the mechanic must tick in the dashboard
 * before the job can be marked COMPLETE — never auto-set true here. */
export async function createDismantlingJobForOpportunity(opportunityId: string): Promise<{ donorId: string; donorCode: string; jobId: string }> {
  return withTransaction(async (client) => {
    const { rows: existingDonor } = await client.query<{ id: string; code: string }>(
      `SELECT id, code FROM donor_trucks WHERE opportunity_id = $1`,
      [opportunityId],
    );

    let donorId: string;
    let donorCode: string;
    if (existingDonor.length > 0) {
      donorId = existingDonor[0].id;
      donorCode = existingDonor[0].code;
    } else {
      const { rows: oppRows } = await client.query(
        `SELECT vin, brand, model, configuration, year FROM opportunities WHERE id = $1`,
        [opportunityId],
      );
      const opp = oppRows[0];
      const { rows: donorRows } = await client.query<{ id: string; code: string }>(
        `INSERT INTO donor_trucks (opportunity_id, vin, brand, model, configuration, year, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'AWAITING_DISMANTLING') RETURNING id, code`,
        [opportunityId, opp.vin, opp.brand, opp.model, opp.configuration, opp.year],
      );
      donorId = donorRows[0].id;
      donorCode = donorRows[0].code;
    }

    const { rows: jobRows } = await client.query<{ id: string }>(
      `INSERT INTO dismantling_jobs (donor_truck_id, status) VALUES ($1, 'PENDING') RETURNING id`,
      [donorId],
    );

    return { donorId, donorCode, jobId: jobRows[0].id };
  });
}

export async function listDismantlingJobs() {
  return query(
    `SELECT dj.*, d.code AS donor_code FROM dismantling_jobs dj
     JOIN donor_trucks d ON d.id = dj.donor_truck_id ORDER BY dj.created_at DESC`,
  );
}

export async function getDismantlingJob(id: string) {
  return queryOne(`SELECT * FROM dismantling_jobs WHERE id = $1`, [id]);
}

export async function listDismantlingItems(jobId: string) {
  return query(
    `SELECT di.*, p.part_code, p.part_type FROM dismantling_items di
     JOIN parts p ON p.id = di.part_id WHERE di.dismantling_job_id = $1`,
    [jobId],
  );
}
