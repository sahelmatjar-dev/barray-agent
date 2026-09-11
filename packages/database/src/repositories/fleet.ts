import { query, queryOne } from "../pool";

export interface FleetTruckRow {
  id: string;
  registration_number: string;
  vin: string | null;
  brand: string;
  model: string;
  configuration: string;
  year: number | null;
  engine_model: string | null;
  gearbox_model: string | null;
  front_axle_model: string | null;
  rear_axle_model: string | null;
  ecu_reference: string | null;
  cabin_generation: string | null;
  hydraulic_system: string | null;
  status: string;
}

export async function listFleetTrucks(): Promise<FleetTruckRow[]> {
  return query<FleetTruckRow>(`SELECT * FROM fleet_trucks ORDER BY registration_number`);
}

export async function getFleetTruck(id: string): Promise<FleetTruckRow | null> {
  return queryOne<FleetTruckRow>(`SELECT * FROM fleet_trucks WHERE id = $1`, [id]);
}

/** Reference specs used by the compatibility engine for a given model/configuration. */
export async function getFleetReferenceSpec(model: string, configuration: string): Promise<FleetTruckRow | null> {
  return queryOne<FleetTruckRow>(
    `SELECT * FROM fleet_trucks WHERE model = $1 AND configuration = $2 AND status = 'ACTIVE' LIMIT 1`,
    [model, configuration],
  );
}
