import { query, queryOne } from "../pool";

export async function listNegotiations() {
  return query(
    `SELECT n.*, o.code AS opportunity_code, s.legal_name AS supplier_name
     FROM negotiations n JOIN opportunities o ON o.id = n.opportunity_id JOIN suppliers s ON s.id = n.supplier_id
     ORDER BY n.created_at DESC`,
  );
}

export async function getNegotiation(id: string) {
  return queryOne(`SELECT * FROM negotiations WHERE id = $1`, [id]);
}

export interface NegotiationDraftContext {
  id: string; opportunity_code: string; supplier_name: string;
  asking_price: string; target_price: string; maximum_price: string;
  current_counter_price: string | null; currency: string;
}

export async function getNegotiationDraftContext(id: string): Promise<NegotiationDraftContext | null> {
  return queryOne<NegotiationDraftContext>(
    `SELECT n.id, o.code AS opportunity_code, s.legal_name AS supplier_name,
            n.asking_price, n.target_price, n.maximum_price, n.current_counter_price, n.currency
     FROM negotiations n
     JOIN opportunities o ON o.id = n.opportunity_id
     JOIN suppliers s ON s.id = n.supplier_id
     WHERE n.id = $1`,
    [id],
  );
}

export async function listNegotiationMessages(negotiationId: string) {
  return query(`SELECT * FROM negotiation_messages WHERE negotiation_id = $1 ORDER BY created_at`, [negotiationId]);
}

export async function createNegotiationMessage(input: {
  negotiationId: string; direction: "OUTBOUND" | "INBOUND"; draftedByAi: boolean;
  proposedPrice: number | null; body: string;
}) {
  // AI-drafted outbound messages always start PENDING_APPROVAL — a human
  // sends them, the AI never does (see docs/safety-rules.md).
  const status = input.draftedByAi && input.direction === "OUTBOUND" ? "PENDING_APPROVAL" : "DRAFT";
  const row = await queryOne<{ id: string }>(
    `INSERT INTO negotiation_messages (negotiation_id, direction, drafted_by_ai, proposed_price, body, status)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
    [input.negotiationId, input.direction, input.draftedByAi, input.proposedPrice, input.body, status],
  );
  return row!.id;
}
