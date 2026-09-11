import { query, queryOne } from "../pool";

export async function listTopOpportunitiesByBestValue(limit: number) {
  return query(
    `SELECT code, model, configuration, year, asking_price, currency, compatibility_score,
            supplier_trust_score, mechanical_score, fraud_risk, best_value_score, ai_recommendation
     FROM opportunities
     WHERE best_value_score IS NOT NULL
     ORDER BY best_value_score DESC
     LIMIT $1`,
    [Math.max(1, Math.min(limit, 20))],
  );
}

export async function searchOpportunitiesByEngine(engine: string) {
  return query(
    `SELECT code, model, configuration, year, engine, horsepower, asking_price, currency, status
     FROM opportunities WHERE engine ILIKE $1 ORDER BY discovered_at DESC LIMIT 20`,
    [`%${engine}%`],
  );
}

export async function findLatestSupplierRejection(searchText: string) {
  return queryOne(
    `SELECT a.reason, a.created_at, s.legal_name
     FROM audit_logs a
     LEFT JOIN suppliers s ON s.id = a.entity_id
     WHERE a.entity = 'supplier' AND a.action = 'APPROVAL_REJECTED'
       AND (s.legal_name ILIKE $1 OR $1 = '')
     ORDER BY a.created_at DESC LIMIT 1`,
    [searchText ? `%${searchText}%` : ""],
  );
}

export async function getDonorLandedCostByCode(donorCode: string) {
  return queryOne(
    `SELECT d.code, lc.* FROM landed_costs lc
     JOIN donor_trucks d ON d.id = lc.donor_id
     WHERE d.code = $1`,
    [donorCode],
  );
}

export async function listAvailableEnginesInStock() {
  return query(
    `SELECT p.part_code, p.condition, p.estimated_replacement_value
     FROM inventory i JOIN parts p ON p.id = i.part_id
     WHERE i.part_status = 'AVAILABLE' AND p.part_type = 'ENGINE'`,
  );
}

export async function getYtdSavings(year: number) {
  return queryOne(
    `SELECT
       COALESCE(SUM(lc.total_landed_cost), 0) AS total_landed_cost,
       COALESCE(SUM(p.estimated_replacement_value), 0) AS total_parts_value
     FROM landed_costs lc
     JOIN donor_trucks d ON d.id = lc.donor_id
     JOIN parts p ON p.donor_truck_id = d.id
     WHERE EXTRACT(YEAR FROM lc.calculated_at) = $1`,
    [year],
  );
}
