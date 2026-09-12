import { InspectionFinding } from "@barray/shared";
import { query, queryOne, withTransaction } from "../pool";

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

export interface OpportunityWithoutOpenInspection {
  id: string; code: string; model: string; configuration: string;
}

/** Opportunities at INSPECTION_PENDING that don't already have an inspection
 * recorded — used to populate the "new inspection" form's opportunity picker. */
export async function listOpportunitiesAwaitingInspection(): Promise<OpportunityWithoutOpenInspection[]> {
  return query<OpportunityWithoutOpenInspection>(
    `SELECT o.id, o.code, o.model, o.configuration FROM opportunities o
     WHERE o.status = 'INSPECTION_PENDING'
       AND NOT EXISTS (SELECT 1 FROM inspections i WHERE i.opportunity_id = o.id)
     ORDER BY o.discovered_at`,
  );
}

export interface CreateInspectionInput {
  opportunityId: string;
  inspectorName: string;
  findings: InspectionFinding[];
  mechanicalScore: number;
  recommendation: "PASS" | "MANUAL_REVIEW" | "REJECT";
}

/** Persists a completed structured inspection. The mechanical score and
 * recommendation are always computed by the caller via
 * @barray/shared calculateMechanicalScore — this function only stores the
 * result, it never recomputes or overrides it (docs/safety-rules.md). */
export async function createInspectionWithFindings(input: CreateInspectionInput): Promise<string> {
  return withTransaction(async (client) => {
    const { rows } = await client.query<{ id: string }>(
      `INSERT INTO inspections (opportunity_id, inspector_name, inspection_date, mechanical_score, recommendation, status)
       VALUES ($1, $2, CURRENT_DATE, $3, $4, 'COMPLETE') RETURNING id`,
      [input.opportunityId, input.inspectorName, input.mechanicalScore, input.recommendation],
    );
    const inspectionId = rows[0].id;

    for (const finding of input.findings) {
      await client.query(
        `INSERT INTO inspection_findings (inspection_id, category, item_code, result) VALUES ($1, $2, $3, $4)`,
        [inspectionId, finding.category, finding.item_code, finding.result],
      );
    }

    await client.query(`UPDATE opportunities SET status = 'INSPECTION_COMPLETE', mechanical_score = $1 WHERE id = $2`, [
      input.mechanicalScore, input.opportunityId,
    ]);

    return inspectionId;
  });
}
