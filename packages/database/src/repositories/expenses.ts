import { query, queryOne } from "../pool";

export interface ExpenseTotals {
  inspection: number;
  dismantling: number;
  packing: number;
  chinaTransport: number;
  exportFees: number;
  freight: number;
  insurance: number;
  destinationCharges: number;
  customsDuty: number;
  vat: number;
  customsBroker: number;
  moroccoTransport: number;
  miscellaneous: number;
}

const CATEGORY_MAP: Record<string, keyof ExpenseTotals> = {
  INSPECTION: "inspection",
  DISMANTLING: "dismantling",
  PACKING: "packing",
  CHINA_TRANSPORT: "chinaTransport",
  EXPORT_FEES: "exportFees",
  FREIGHT: "freight",
  INSURANCE: "insurance",
  DESTINATION_CHARGES: "destinationCharges",
  CUSTOMS_DUTY: "customsDuty",
  VAT: "vat",
  CUSTOMS_BROKER: "customsBroker",
  MOROCCO_TRANSPORT: "moroccoTransport",
  MISCELLANEOUS: "miscellaneous",
};

export async function sumExpensesForDonor(donorId: string): Promise<ExpenseTotals> {
  const rows = await query<{ category: string; total: string }>(
    `SELECT category, COALESCE(SUM(amount), 0) AS total FROM expenses WHERE donor_id = $1 GROUP BY category`,
    [donorId],
  );
  const totals: ExpenseTotals = {
    inspection: 0, dismantling: 0, packing: 0, chinaTransport: 0, exportFees: 0,
    freight: 0, insurance: 0, destinationCharges: 0, customsDuty: 0, vat: 0,
    customsBroker: 0, moroccoTransport: 0, miscellaneous: 0,
  };
  for (const row of rows) {
    const key = CATEGORY_MAP[row.category];
    if (key) totals[key] = Number(row.total);
  }
  return totals;
}

export async function getPurchasePriceForDonor(donorId: string): Promise<number> {
  const row = await queryOne<{ agreed_price: string }>(
    `SELECT po.agreed_price FROM purchase_orders po
     JOIN donor_trucks d ON d.opportunity_id = po.opportunity_id
     WHERE d.id = $1 LIMIT 1`,
    [donorId],
  );
  return row ? Number(row.agreed_price) : 0;
}
