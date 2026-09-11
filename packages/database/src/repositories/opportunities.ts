import { assertTransition, OpportunityStatus } from "@barray/shared";
import { query, queryOne, withTransaction } from "../pool";
import { writeAuditLog } from "../audit";

export interface OpportunityRow {
  id: string;
  code: string;
  supplier_id: string | null;
  brand: string;
  model: string;
  configuration: string;
  year: number | null;
  mileage_km: number | null;
  vin: string | null;
  asking_price: string | null;
  currency: string;
  compatibility_score: number | null;
  supplier_trust_score: number | null;
  mechanical_score: number | null;
  fraud_risk: string | null;
  best_value_score: number | null;
  estimated_landed_cost: string | null;
  estimated_parts_value: string | null;
  status: OpportunityStatus;
  frozen_from_status: OpportunityStatus | null;
  created_at: string;
  updated_at: string;
}

export async function listOpportunities(filters: { status?: OpportunityStatus } = {}): Promise<OpportunityRow[]> {
  if (filters.status) {
    return query<OpportunityRow>(
      `SELECT * FROM opportunities WHERE status = $1 ORDER BY discovered_at DESC`,
      [filters.status],
    );
  }
  return query<OpportunityRow>(`SELECT * FROM opportunities ORDER BY discovered_at DESC`);
}

export async function getOpportunity(id: string): Promise<OpportunityRow | null> {
  return queryOne<OpportunityRow>(`SELECT * FROM opportunities WHERE id = $1`, [id]);
}

export async function getOpportunityByCode(code: string): Promise<OpportunityRow | null> {
  return queryOne<OpportunityRow>(`SELECT * FROM opportunities WHERE code = $1`, [code]);
}

export interface NormalizedListingInput {
  platform: string; listingUrl: string; brand: string; model: string; configuration: string;
  year: number | null; askingPrice: number | null; currency: string; locationCity: string | null;
  description: string | null;
}

/** WF-002: inserts a normalized listing as a new DISCOVERED opportunity.
 * Fields the raw listing didn't have parse out to null/UNKNOWN — this
 * function never fabricates a value that wasn't in the source text. */
export async function createOpportunityFromListing(input: NormalizedListingInput): Promise<{ id: string; code: string }> {
  // Idempotency for repeated discovery of the same listing is handled by the
  // caller (n8n's workflow_runs check, keyed on listingUrl) — see WF-002.
  const row = await queryOne<{ id: string; code: string }>(
    `INSERT INTO opportunities (platform, listing_url, brand, model, configuration, year, asking_price, currency, location_city, description, availability, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'UNKNOWN', 'DISCOVERED')
     RETURNING id, code`,
    [input.platform, input.listingUrl, input.brand, input.model, input.configuration, input.year, input.askingPrice, input.currency, input.locationCity, input.description],
  );
  return row!;
}

/** WF-003: flags (never silently merges) a duplicate VIN across opportunities. */
export async function markDuplicateIfVinExists(opportunityId: string): Promise<string | null> {
  const current = await queryOne<{ vin: string | null }>(`SELECT vin FROM opportunities WHERE id = $1`, [opportunityId]);
  if (!current?.vin) return null;

  const duplicate = await queryOne<{ id: string }>(
    `SELECT id FROM opportunities WHERE vin = $1 AND id != $2 ORDER BY discovered_at ASC LIMIT 1`,
    [current.vin, opportunityId],
  );
  if (!duplicate) return null;

  await query(`UPDATE opportunities SET duplicate_of = $1 WHERE id = $2`, [duplicate.id, opportunityId]);
  return duplicate.id;
}

/** Owner Command Center: everything currently sitting at a human approval gate. */
export async function listDecisionsWaiting(): Promise<OpportunityRow[]> {
  return query<OpportunityRow>(
    `SELECT * FROM opportunities
     WHERE status IN ('SUPPLIER_APPROVAL', 'INSPECTION_COMPLETE', 'PURCHASE_APPROVAL')
     ORDER BY updated_at ASC`,
  );
}

/**
 * Transitions an opportunity's status, validating against the shared state
 * machine BEFORE hitting Postgres (which enforces the same rule again via
 * trigger as a backstop) and writing an audit log entry.
 */
export async function transitionOpportunityStatus(
  id: string,
  toStatus: OpportunityStatus,
  actorUserId: string | null,
  reason?: string,
): Promise<OpportunityRow> {
  return withTransaction(async (client) => {
    const { rows } = await client.query<OpportunityRow>(
      `SELECT * FROM opportunities WHERE id = $1 FOR UPDATE`,
      [id],
    );
    const current = rows[0];
    if (!current) throw new Error(`Opportunity ${id} not found`);

    assertTransition(current.status, toStatus, current.frozen_from_status);

    const { rows: updatedRows } = await client.query<OpportunityRow>(
      `UPDATE opportunities SET status = $1, status_reason = $2 WHERE id = $3 RETURNING *`,
      [toStatus, reason ?? null, id],
    );

    await writeAuditLog({
      userId: actorUserId,
      action: "STATUS_TRANSITION",
      entity: "opportunity",
      entityId: id,
      oldValue: { status: current.status },
      newValue: { status: toStatus },
      reason,
    });

    return updatedRows[0];
  });
}
