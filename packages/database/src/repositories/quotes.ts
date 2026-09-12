import { query, queryOne } from "../pool";

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

export interface ExtractedQuoteInput {
  rfqId: string; opportunityId: string; supplierId: string;
  truckPrice: number | null; dismantlingPrice: number | null; packingPrice: number | null;
  chinaInlandTransportPrice: number | null; fobQingdaoPrice: number | null; fobShanghaiPrice: number | null;
  fobNingboPrice: number | null; cifTangerMedPrice: number | null; cifCasablancaPrice: number | null;
  inspectionPrice: number | null; currency: string | null; notOfficiallyScrappedDeclared: boolean;
  rawText: string; confidence: number;
}

/** WF-009: persists an AI-extracted quote. extracted_by_ai + raw_text are
 * always stored so a human can audit exactly what the AI read (see
 * docs/safety-rules.md — AI extraction is never taken on faith). */
export async function createQuoteFromExtraction(input: ExtractedQuoteInput): Promise<string> {
  const row = await queryOne<{ id: string }>(
    `INSERT INTO quotes (
       rfq_id, opportunity_id, supplier_id, truck_price, dismantling_price, packing_price,
       china_inland_transport_price, fob_qingdao_price, fob_shanghai_price, fob_ningbo_price,
       cif_tanger_med_price, cif_casablanca_price, inspection_price, currency,
       not_officially_scrapped_declared, raw_text, extracted_by_ai, ai_extraction_confidence, status
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,true,$17,
       CASE WHEN $17 < 60 THEN 'NEEDS_CLARIFICATION' ELSE 'RECEIVED' END)
     RETURNING id`,
    [
      input.rfqId, input.opportunityId, input.supplierId, input.truckPrice, input.dismantlingPrice,
      input.packingPrice, input.chinaInlandTransportPrice, input.fobQingdaoPrice, input.fobShanghaiPrice,
      input.fobNingboPrice, input.cifTangerMedPrice, input.cifCasablancaPrice, input.inspectionPrice,
      input.currency ?? "USD", input.notOfficiallyScrappedDeclared, input.rawText, Math.round(input.confidence * 100),
    ],
  );
  return row!.id;
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
