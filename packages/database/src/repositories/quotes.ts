import { query } from "../pool";

export interface QuoteRow {
  id: string;
  opportunity_id: string;
  supplier_id: string;
  truck_price: string | null;
  dismantling_price: string | null;
  packing_price: string | null;
  china_inland_transport_price: string | null;
  fob_qingdao_price: string | null;
  cif_tanger_med_price: string | null;
  currency: string;
}

export async function listQuotesForOpportunity(opportunityId: string): Promise<QuoteRow[]> {
  return query<QuoteRow>(`SELECT * FROM quotes WHERE opportunity_id = $1`, [opportunityId]);
}

export async function listAllQuotes() {
  return query(
    `SELECT q.*, o.code AS opportunity_code, s.legal_name AS supplier_name
     FROM quotes q JOIN opportunities o ON o.id = q.opportunity_id JOIN suppliers s ON s.id = q.supplier_id
     ORDER BY q.created_at DESC`,
  );
}

export async function updateQuoteBestValue(quoteId: string, score: number, breakdown: Record<string, number>): Promise<void> {
  await query(`UPDATE quotes SET best_value_score = $1, best_value_breakdown = $2, status = 'RANKED' WHERE id = $3`, [
    score, JSON.stringify(breakdown), quoteId,
  ]);
}
