import { query, queryOne } from "../pool";

export interface DonorTruckRow {
  id: string;
  code: string;
  opportunity_id: string;
  vin: string | null;
  model: string;
  configuration: string;
  status: string;
}

export async function getDonorTruck(id: string): Promise<DonorTruckRow | null> {
  return queryOne<DonorTruckRow>(`SELECT * FROM donor_trucks WHERE id = $1`, [id]);
}

export interface PartRow {
  id: string;
  part_code: string;
  part_type: string;
  condition: string;
  estimated_replacement_value: string | null;
  status: string;
}

export async function listPartsForDonor(donorId: string): Promise<PartRow[]> {
  return query<PartRow>(`SELECT * FROM parts WHERE donor_truck_id = $1`, [donorId]);
}
