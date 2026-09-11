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
