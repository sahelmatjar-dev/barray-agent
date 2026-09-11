import { query, queryOne } from "../pool";

export async function listInspections() {
  return query(
    `SELECT i.*, o.code AS opportunity_code, o.model, o.configuration
     FROM inspections i JOIN opportunities o ON o.id = i.opportunity_id
     ORDER BY i.created_at DESC`,
  );
}

export async function getInspection(id: string) {
  return queryOne(`SELECT * FROM inspections WHERE id = $1`, [id]);
}

export async function listInspectionFindings(inspectionId: string) {
  return query(`SELECT * FROM inspection_findings WHERE inspection_id = $1 ORDER BY category, item_code`, [inspectionId]);
}
