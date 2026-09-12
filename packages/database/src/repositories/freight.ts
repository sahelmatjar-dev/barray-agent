import { query, queryOne } from "../pool";

export async function listFreightForwarders() {
  return query(`SELECT * FROM freight_forwarders ORDER BY name`);
}

export async function listFreightQuotes() {
  return query(
    `SELECT fq.*, ff.name AS forwarder_name, d.code AS donor_code
     FROM freight_quotes fq
     JOIN freight_forwarders ff ON ff.id = fq.freight_forwarder_id
     LEFT JOIN donor_trucks d ON d.id = fq.donor_id
     ORDER BY fq.created_at DESC`,
  );
}

export async function listFreightQuotesForDonor(donorId: string) {
  return query(
    `SELECT fq.*, ff.name AS forwarder_name FROM freight_quotes fq
     JOIN freight_forwarders ff ON ff.id = fq.freight_forwarder_id
     WHERE fq.donor_id = $1 ORDER BY fq.created_at`,
    [donorId],
  );
}

export async function listContainers() {
  return query(
    `SELECT c.*, ff.name AS forwarder_name FROM containers c
     LEFT JOIN freight_forwarders ff ON ff.id = c.freight_forwarder_id
     ORDER BY c.created_at DESC`,
  );
}

export async function getContainer(id: string) {
  return queryOne(`SELECT * FROM containers WHERE id = $1`, [id]);
}

export interface FreightCostFields {
  origin_charges: string | null; china_transport: string | null; ocean_freight: string | null;
  insurance: string | null; destination_charges: string | null; broker_fee: string | null;
  morocco_inland_transport: string | null;
}

/** Deterministic total cost per freight_quote (mirrors packages/shared cost fields, freight-specific subset). */
export function totalFreightQuoteCost(q: FreightCostFields): number {
  return [
    q.origin_charges, q.china_transport, q.ocean_freight, q.insurance,
    q.destination_charges, q.broker_fee, q.morocco_inland_transport,
  ].reduce((sum: number, v) => sum + (v ? Number(v) : 0), 0);
}
