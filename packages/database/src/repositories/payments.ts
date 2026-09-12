import { query, queryOne } from "../pool";

export async function listPayments() {
  return query(
    `SELECT p.*, po.code AS purchase_order_code
     FROM payments p JOIN purchase_orders po ON po.id = p.purchase_order_id
     ORDER BY p.created_at DESC`,
  );
}

export async function getPayment(id: string) {
  return queryOne(`SELECT * FROM payments WHERE id = $1`, [id]);
}

export interface PaymentVerificationContext {
  payment_id: string;
  amount: string;
  po_agreed_price: string;
  supplier_id: string;
  supplier_status: string;
  bank_account_id: string | null;
  account_holder_name: string | null;
  is_personal_account: boolean | null;
  matches_company_name: boolean | null;
  bank_account_updated_at: string | null;
}

export async function getPaymentVerificationContext(paymentId: string): Promise<PaymentVerificationContext | null> {
  return queryOne<PaymentVerificationContext>(
    `SELECT
       p.id AS payment_id, p.amount, po.agreed_price AS po_agreed_price,
       s.id AS supplier_id, s.status AS supplier_status,
       ba.id AS bank_account_id, ba.account_holder_name, ba.is_personal_account,
       ba.matches_company_name, ba.updated_at AS bank_account_updated_at
     FROM payments p
     JOIN purchase_orders po ON po.id = p.purchase_order_id
     JOIN suppliers s ON s.id = po.supplier_id
     LEFT JOIN supplier_bank_accounts ba ON ba.id = p.beneficiary_bank_account_id
     WHERE p.id = $1`,
    [paymentId],
  );
}

export async function listPaymentVerifications(paymentId: string) {
  return query(`SELECT * FROM payment_verifications WHERE payment_id = $1 ORDER BY created_at`, [paymentId]);
}

export interface PaymentVerificationInput {
  paymentId: string;
  checkType: "BANK_NAME_MATCH" | "ACCOUNT_NOT_PERSONAL" | "ACCOUNT_UNCHANGED" | "AMOUNT_MATCHES_PO" | "SUPPLIER_NOT_FROZEN";
  passed: boolean;
  details: string;
}

export async function recordPaymentVerification(input: PaymentVerificationInput): Promise<void> {
  await query(
    `INSERT INTO payment_verifications (payment_id, check_type, passed, details) VALUES ($1, $2, $3, $4)`,
    [input.paymentId, input.checkType, input.passed, input.details],
  );
}

export async function setPaymentStatus(paymentId: string, status: string): Promise<void> {
  await query(`UPDATE payments SET status = $1 WHERE id = $2`, [status, paymentId]);
}

/** RELEASE PAYMENT is the most sensitive gate: this is the ONLY function
 * that may set status = 'RELEASED', and the DB trigger `enforce_payment_release_gate`
 * still requires release_approval_id to reference a decided RELEASE_PAYMENT approval. */
export async function releasePayment(paymentId: string, approvalId: string, releasedBy: string): Promise<void> {
  await query(
    `UPDATE payments SET status = 'RELEASED', release_approval_id = $1, released_by = $2, released_at = now() WHERE id = $3`,
    [approvalId, releasedBy, paymentId],
  );
}
