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

export async function listPaymentVerifications(paymentId: string) {
  return query(`SELECT * FROM payment_verifications WHERE payment_id = $1 ORDER BY created_at`, [paymentId]);
}
