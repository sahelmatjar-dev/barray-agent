import { queryOne } from "../pool";

export interface TruckSpecRow {
  id: string;
  opportunity_id: string;
  vin: string | null;
  chassis_number: string | null;
  engine_model: string | null;
  gearbox_model: string | null;
  front_axle_model: string | null;
  rear_axle_model: string | null;
  ecu_reference: string | null;
  cabin_generation: string | null;
  hydraulic_system: string | null;
}

export async function getTruckSpecsForOpportunity(opportunityId: string): Promise<TruckSpecRow | null> {
  return queryOne<TruckSpecRow>(`SELECT * FROM truck_specs WHERE opportunity_id = $1`, [opportunityId]);
}
