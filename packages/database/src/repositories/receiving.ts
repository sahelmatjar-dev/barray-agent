import { query, queryOne } from "../pool";

export async function listReceivingReports() {
  return query(
    `SELECT rr.*, c.container_number FROM receiving_reports rr
     LEFT JOIN containers c ON c.id = rr.container_id ORDER BY rr.created_at DESC`,
  );
}

export async function getReceivingReport(id: string) {
  return queryOne(`SELECT * FROM receiving_reports WHERE id = $1`, [id]);
}

export async function listReceivingItems(reportId: string) {
  return query(
    `SELECT ri.*, pkg.package_id AS package_code FROM receiving_items ri
     LEFT JOIN packages pkg ON pkg.id = ri.package_id WHERE ri.receiving_report_id = $1`,
    [reportId],
  );
}
