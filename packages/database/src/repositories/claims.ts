import { query, queryOne, withTransaction } from "../pool";

/** WF-025: assembles a DRAFT claim from a receiving discrepancy. Never sent
 * automatically — auto_send_enabled defaults to false and status stays
 * DRAFT until a human reviews it (see the enforce_claim_send_gate trigger). */
export async function createClaimDraftForReceivingItem(receivingItemId: string): Promise<string> {
  return withTransaction(async (client) => {
    const { rows } = await client.query<{
      receiving_report_id: string; package_id: string | null; part_id: string | null;
      condition_on_arrival: string | null; donor_id: string | null; purchase_order_id: string | null;
    }>(
      `SELECT ri.receiving_report_id, ri.package_id, ri.part_id, ri.condition_on_arrival,
              pkg.donor_id, po.id AS purchase_order_id
       FROM receiving_items ri
       LEFT JOIN packages pkg ON pkg.id = ri.package_id
       LEFT JOIN donor_trucks d ON d.id = pkg.donor_id
       LEFT JOIN purchase_orders po ON po.opportunity_id = d.opportunity_id
       WHERE ri.id = $1`,
      [receivingItemId],
    );
    if (rows.length === 0) throw new Error(`Receiving item ${receivingItemId} not found`);
    const item = rows[0];

    const claimType = item.condition_on_arrival === "MISSING" ? "MISSING_ITEM" : "DAMAGE";

    const { rows: claimRows } = await client.query<{ id: string }>(
      `INSERT INTO claims (donor_id, receiving_report_id, purchase_order_id, claim_type, status)
       VALUES ($1, $2, $3, $4, 'DRAFT') RETURNING id`,
      [item.donor_id, item.receiving_report_id, item.purchase_order_id, claimType],
    );
    const claimId = claimRows[0].id;

    await client.query(
      `INSERT INTO claim_items (claim_id, package_id, part_id, description)
       VALUES ($1, $2, $3, $4)`,
      [claimId, item.package_id, item.part_id, `Discrepancy on receiving: ${item.condition_on_arrival ?? "UNKNOWN"}`],
    );

    return claimId;
  });
}

export async function listClaims() {
  return query(
    `SELECT cl.*, d.code AS donor_code FROM claims cl
     LEFT JOIN donor_trucks d ON d.id = cl.donor_id ORDER BY cl.created_at DESC`,
  );
}

export async function getClaim(id: string) {
  return queryOne(`SELECT * FROM claims WHERE id = $1`, [id]);
}

export async function listClaimItems(claimId: string) {
  return query(`SELECT * FROM claim_items WHERE claim_id = $1`, [claimId]);
}
