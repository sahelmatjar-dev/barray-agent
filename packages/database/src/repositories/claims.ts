import { query, queryOne } from "../pool";

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
