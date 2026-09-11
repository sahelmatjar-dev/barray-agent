import { query, queryOne } from "../pool";
import { writeAuditLog } from "../audit";

export interface SupplierRow {
  id: string;
  legal_name: string;
  trade_name: string | null;
  country: string;
  trust_score: number | null;
  trust_risk_group: string | null;
  fraud_risk: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export async function listSuppliers(): Promise<SupplierRow[]> {
  return query<SupplierRow>(`SELECT * FROM suppliers ORDER BY created_at DESC`);
}

export async function getSupplier(id: string): Promise<SupplierRow | null> {
  return queryOne<SupplierRow>(`SELECT * FROM suppliers WHERE id = $1`, [id]);
}

export interface SupplierContactRow {
  id: string;
  full_name: string;
  role: string | null;
  phone: string | null;
  email: string | null;
  is_primary: boolean;
}

export async function listSupplierContacts(supplierId: string): Promise<SupplierContactRow[]> {
  return query<SupplierContactRow>(
    `SELECT id, full_name, role, phone, email, is_primary FROM supplier_contacts WHERE supplier_id = $1 ORDER BY is_primary DESC`,
    [supplierId],
  );
}

export interface SupplierBankAccountRow {
  id: string;
  account_holder_name: string;
  is_personal_account: boolean;
  bank_name: string;
  account_number: string;
  matches_company_name: boolean | null;
  is_active: boolean;
  status: string;
}

export async function listSupplierBankAccounts(supplierId: string): Promise<SupplierBankAccountRow[]> {
  return query<SupplierBankAccountRow>(
    `SELECT id, account_holder_name, is_personal_account, bank_name, account_number, matches_company_name, is_active, status
     FROM supplier_bank_accounts WHERE supplier_id = $1 ORDER BY created_at DESC`,
    [supplierId],
  );
}

export async function updateSupplierTrustScore(
  id: string,
  score: number,
  riskGroup: string,
  breakdown: Record<string, number>,
): Promise<void> {
  await query(
    `UPDATE suppliers SET trust_score = $1, trust_risk_group = $2, trust_score_breakdown = $3 WHERE id = $4`,
    [score, riskGroup, JSON.stringify(breakdown), id],
  );
}

/** Every bank account change on a supplier must be audit-logged (critical event). */
export async function addSupplierBankAccount(
  supplierId: string,
  account: { accountHolderName: string; isPersonalAccount: boolean; bankName: string; accountNumber: string },
  actorUserId: string | null,
): Promise<string> {
  const existing = await query<{ id: string; account_number: string }>(
    `SELECT id, account_number FROM supplier_bank_accounts WHERE supplier_id = $1 AND is_active = true`,
    [supplierId],
  );

  const row = await queryOne<{ id: string }>(
    `INSERT INTO supplier_bank_accounts (supplier_id, account_holder_name, is_personal_account, bank_name, account_number)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [supplierId, account.accountHolderName, account.isPersonalAccount, account.bankName, account.accountNumber],
  );

  await writeAuditLog({
    userId: actorUserId,
    action: "BANK_ACCOUNT_ADDED",
    entity: "supplier",
    entityId: supplierId,
    oldValue: existing[0] ? { account_number: existing[0].account_number } : null,
    newValue: { account_number: account.accountNumber },
    reason: "Bank account change — see docs/safety-rules.md critical events",
  });

  return row!.id;
}
