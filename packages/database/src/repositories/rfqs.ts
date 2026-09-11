import { query, queryOne } from "../pool";

export interface RfqRow {
  id: string;
  opportunity_id: string;
  supplier_id: string;
  status: string;
  sent_at: string | null;
  created_at: string;
}

export async function listRfqs(): Promise<(RfqRow & { opportunity_code: string; supplier_name: string })[]> {
  return query(
    `SELECT r.*, o.code AS opportunity_code, s.legal_name AS supplier_name
     FROM rfqs r JOIN opportunities o ON o.id = r.opportunity_id JOIN suppliers s ON s.id = r.supplier_id
     ORDER BY r.created_at DESC`,
  );
}

export async function getRfq(id: string): Promise<RfqRow | null> {
  return queryOne<RfqRow>(`SELECT * FROM rfqs WHERE id = $1`, [id]);
}

export async function listRfqItems(rfqId: string) {
  return query(`SELECT * FROM rfq_items WHERE rfq_id = $1 ORDER BY item_type`, [rfqId]);
}
