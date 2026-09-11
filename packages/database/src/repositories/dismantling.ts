import { query, queryOne } from "../pool";

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
