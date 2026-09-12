import { query } from "../pool";

export async function listWarehouses() {
  return query(`SELECT * FROM warehouses ORDER BY name`);
}

export async function listWarehouseLocations(warehouseId: string) {
  return query(
    `SELECT * FROM warehouse_locations WHERE warehouse_id = $1 ORDER BY level, code`,
    [warehouseId],
  );
}
