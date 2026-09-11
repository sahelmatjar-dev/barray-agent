import { LandedCostBreakdown } from "@barray/shared";
import { query, queryOne } from "../pool";

export async function listLandedCosts() {
  return query(
    `SELECT lc.*, d.code AS donor_code FROM landed_costs lc
     JOIN donor_trucks d ON d.id = lc.donor_id ORDER BY lc.calculated_at DESC`,
  );
}

export async function getLandedCostForDonor(donorId: string) {
  return queryOne(`SELECT * FROM landed_costs WHERE donor_id = $1`, [donorId]);
}

export async function upsertLandedCost(donorId: string, breakdown: LandedCostBreakdown): Promise<void> {
  await query(
    `INSERT INTO landed_costs (
       donor_id, purchase_price, inspection, dismantling, packing, china_transport,
       export_fees, freight, insurance, destination_charges, customs_duty, vat,
       customs_broker, morocco_transport, miscellaneous, total_landed_cost, calculated_at
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16, now())
     ON CONFLICT (donor_id) DO UPDATE SET
       purchase_price = EXCLUDED.purchase_price, inspection = EXCLUDED.inspection,
       dismantling = EXCLUDED.dismantling, packing = EXCLUDED.packing,
       china_transport = EXCLUDED.china_transport, export_fees = EXCLUDED.export_fees,
       freight = EXCLUDED.freight, insurance = EXCLUDED.insurance,
       destination_charges = EXCLUDED.destination_charges, customs_duty = EXCLUDED.customs_duty,
       vat = EXCLUDED.vat, customs_broker = EXCLUDED.customs_broker,
       morocco_transport = EXCLUDED.morocco_transport, miscellaneous = EXCLUDED.miscellaneous,
       total_landed_cost = EXCLUDED.total_landed_cost, calculated_at = now()`,
    [
      donorId, breakdown.purchasePrice, breakdown.inspection, breakdown.dismantling, breakdown.packing,
      breakdown.chinaTransport, breakdown.exportFees, breakdown.freight, breakdown.insurance,
      breakdown.destinationCharges, breakdown.customsDuty, breakdown.vat, breakdown.customsBroker,
      breakdown.moroccoTransport, breakdown.miscellaneous, breakdown.totalLandedCost,
    ],
  );
}
