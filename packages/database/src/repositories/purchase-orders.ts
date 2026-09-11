import { query, queryOne } from "../pool";

export async function listPurchaseOrders() {
  return query(
    `SELECT po.*, o.code AS opportunity_code, s.legal_name AS supplier_name
     FROM purchase_orders po JOIN opportunities o ON o.id = po.opportunity_id JOIN suppliers s ON s.id = po.supplier_id
     ORDER BY po.created_at DESC`,
  );
}

export async function getPurchaseOrder(id: string) {
  return queryOne(`SELECT * FROM purchase_orders WHERE id = $1`, [id]);
}

export async function listPurchaseOrderItems(purchaseOrderId: string) {
  return query(`SELECT * FROM purchase_order_items WHERE purchase_order_id = $1`, [purchaseOrderId]);
}

/** WF-014: the approval must already be a decided APPROVE_PURCHASE approval
 * before status can move past DRAFT — enforced again by the DB trigger
 * `enforce_po_approval_gate` in 008_approvals_purchase.sql. */
export async function createPurchaseOrderFromApproval(input: {
  opportunityId: string; supplierId: string; approvalId: string; agreedPrice: number;
  currency: string; description: string;
}): Promise<{ id: string; code: string }> {
  const row = await queryOne<{ id: string; code: string }>(
    `INSERT INTO purchase_orders (opportunity_id, supplier_id, approval_id, agreed_price, currency, status)
     VALUES ($1, $2, $3, $4, $5, 'APPROVED') RETURNING id, code`,
    [input.opportunityId, input.supplierId, input.approvalId, input.agreedPrice, input.currency],
  );
  await query(
    `INSERT INTO purchase_order_items (purchase_order_id, description, quantity, unit_price, currency)
     VALUES ($1, $2, 1, $3, $4)`,
    [row!.id, input.description, input.agreedPrice, input.currency],
  );
  return row!;
}
