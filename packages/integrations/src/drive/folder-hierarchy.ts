/**
 * Deterministic Google Drive folder hierarchy for one donor truck's documents:
 *   EL BARRAY RA/China Sourcing/<YEAR>/<DONOR_ID>/<NN Category>
 */
export const DRIVE_ROOT_FOLDER = "EL BARRAY RA";
export const DRIVE_PROGRAM_FOLDER = "China Sourcing";

export const DONOR_DOCUMENT_CATEGORIES = [
  "01 Supplier",
  "02 Truck",
  "03 VIN",
  "04 Photos",
  "05 Videos",
  "06 Inspection",
  "07 RFQ",
  "08 Quotation",
  "09 Negotiation",
  "10 Contract",
  "11 Invoice",
  "12 Payment",
  "13 Dismantling",
  "14 Packing",
  "15 Shipping",
  "16 Customs",
  "17 Receiving",
  "18 Claims",
] as const;

export type DonorDocumentCategory = (typeof DONOR_DOCUMENT_CATEGORIES)[number];

export function buildDonorFolderPath(year: number, donorId: string): string[] {
  return [DRIVE_ROOT_FOLDER, DRIVE_PROGRAM_FOLDER, String(year), donorId];
}

export function buildDonorCategoryFolderPath(year: number, donorId: string, category: DonorDocumentCategory): string[] {
  return [...buildDonorFolderPath(year, donorId), category];
}
