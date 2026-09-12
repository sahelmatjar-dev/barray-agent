import { query } from "../pool";

export interface DonorRoiRow {
  donor_code: string;
  total_landed_cost: string;
  total_parts_value: string;
  usable_component_count: string;
}

/** Raw figures per donor; @barray/shared calculateRoi turns these into
 * savings/ROI% — this repository never computes the ratio itself. */
export async function listDonorRoiInputs(): Promise<DonorRoiRow[]> {
  return query<DonorRoiRow>(
    `SELECT d.code AS donor_code,
            lc.total_landed_cost,
            COALESCE(SUM(p.estimated_replacement_value), 0) AS total_parts_value,
            COUNT(p.id) FILTER (WHERE p.status NOT IN ('SCRAPPED', 'DAMAGED')) AS usable_component_count
     FROM donor_trucks d
     JOIN landed_costs lc ON lc.donor_id = d.id
     LEFT JOIN parts p ON p.donor_truck_id = d.id
     GROUP BY d.code, lc.total_landed_cost
     ORDER BY d.code`,
  );
}

export interface WeeklyReportCounts {
  new_opportunities: number;
  negotiations_in_progress: number;
  inspections_completed: number;
  purchases_this_week: number;
  containers_in_transit: number;
  inventory_available_parts: number;
  open_claims: number;
}

export async function getWeeklyReportCounts(): Promise<WeeklyReportCounts> {
  const [newOpps, negotiations, inspections, purchases, containers, inventory, claims] = await Promise.all([
    query<{ count: string }>(`SELECT count(*) FROM opportunities WHERE discovered_at > now() - interval '7 days'`),
    query<{ count: string }>(`SELECT count(*) FROM negotiations WHERE status = 'NEGOTIATING'`),
    query<{ count: string }>(`SELECT count(*) FROM inspections WHERE status IN ('COMPLETE', 'APPROVED') AND updated_at > now() - interval '7 days'`),
    query<{ count: string }>(`SELECT count(*) FROM purchase_orders WHERE created_at > now() - interval '7 days'`),
    query<{ count: string }>(`SELECT count(*) FROM containers WHERE status IN ('SHIPPED', 'LOADED')`),
    query<{ count: string }>(`SELECT count(*) FROM inventory WHERE part_status = 'AVAILABLE'`),
    query<{ count: string }>(`SELECT count(*) FROM claims WHERE status NOT IN ('RESOLVED', 'REJECTED')`),
  ]);
  return {
    new_opportunities: Number(newOpps[0]?.count ?? 0),
    negotiations_in_progress: Number(negotiations[0]?.count ?? 0),
    inspections_completed: Number(inspections[0]?.count ?? 0),
    purchases_this_week: Number(purchases[0]?.count ?? 0),
    containers_in_transit: Number(containers[0]?.count ?? 0),
    inventory_available_parts: Number(inventory[0]?.count ?? 0),
    open_claims: Number(claims[0]?.count ?? 0),
  };
}

export async function listBestOpportunities(limit = 5) {
  return query(
    `SELECT code, model, best_value_score FROM opportunities WHERE best_value_score IS NOT NULL ORDER BY best_value_score DESC LIMIT $1`,
    [limit],
  );
}

export async function listSupplierRisks() {
  return query(
    `SELECT legal_name, trust_risk_group FROM suppliers WHERE trust_risk_group IN ('MANUAL_REVIEW', 'HIGH_RISK')`,
  );
}

export async function getFinancialExposure() {
  const rows = await query<{ total: string }>(
    `SELECT COALESCE(SUM(agreed_price), 0) AS total FROM purchase_orders WHERE status NOT IN ('CANCELLED')`,
  );
  return Number(rows[0]?.total ?? 0);
}
