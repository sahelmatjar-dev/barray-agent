/** Client-side preview helpers only. The database is the authority for real
 * IDs (see triggers in 004_opportunities.sql and 009_donor_dismantling.sql);
 * these functions must never be used to persist an ID, only to preview one
 * in the UI before the server assigns it. */

export function previewOpportunityCode(year: number, sequence: number): string {
  return `EBR-OPP-${year}-${String(sequence).padStart(4, "0")}`;
}

export function previewDonorTruckCode(sequence: number): string {
  return `EBR-CN-${String(sequence).padStart(3, "0")}`;
}

export const PART_SUFFIXES = {
  ENGINE: "ENG",
  GEARBOX: "GBX",
  FRONT_AXLE_1: "FAX1",
  FRONT_AXLE_2: "FAX2",
  REAR_AXLE_1: "RAX1",
  REAR_AXLE_2: "RAX2",
  CABIN: "CAB",
  ECU: "ECU",
  HYDRAULIC: "HYD",
} as const;

export function previewPartCode(donorCode: string, partType: keyof typeof PART_SUFFIXES): string {
  return `${donorCode}-${PART_SUFFIXES[partType]}`;
}
