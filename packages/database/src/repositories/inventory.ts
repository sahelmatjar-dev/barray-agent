import { MovementType, PartStatus } from "@barray/shared";
import { query, queryOne, withTransaction } from "../pool";

export interface InventoryRow {
  id: string;
  part_id: string;
  part_status: PartStatus;
}

export async function getInventoryForPart(partId: string): Promise<InventoryRow | null> {
  return queryOne<InventoryRow>(`SELECT * FROM inventory WHERE part_id = $1`, [partId]);
}

/** Applies a movement and writes the audit trail row. Caller has already
 * validated the transition with @barray/shared's canApplyMovement/applyMovement. */
export async function applyInventoryMovement(
  partId: string,
  movementType: MovementType,
  newStatus: PartStatus,
  performedBy: string | null,
  warehouseLocationId?: string | null,
): Promise<string> {
  return withTransaction(async (client) => {
    const { rows: existing } = await client.query<InventoryRow>(`SELECT * FROM inventory WHERE part_id = $1 FOR UPDATE`, [partId]);

    let inventoryId: string;
    if (existing.length === 0) {
      const { rows } = await client.query<{ id: string }>(
        `INSERT INTO inventory (part_id, warehouse_location_id, part_status) VALUES ($1, $2, $3) RETURNING id`,
        [partId, warehouseLocationId ?? null, newStatus],
      );
      inventoryId = rows[0].id;
    } else {
      inventoryId = existing[0].id;
      await client.query(`UPDATE inventory SET part_status = $1 WHERE id = $2`, [newStatus, inventoryId]);
    }

    await client.query(
      `INSERT INTO inventory_movements (inventory_id, movement_type, to_location_id, quantity_delta, performed_by)
       VALUES ($1, $2, $3, 1, $4)`,
      [inventoryId, movementType, warehouseLocationId ?? null, performedBy],
    );

    return inventoryId;
  });
}

export async function listAvailableInventory(): Promise<{ id: string; part_code: string; part_type: string }[]> {
  return query(
    `SELECT i.id, p.part_code, p.part_type FROM inventory i JOIN parts p ON p.id = i.part_id WHERE i.part_status = 'AVAILABLE'`,
  );
}
