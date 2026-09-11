import { query, queryOne } from "../pool";

export async function listPackages() {
  return query(
    `SELECT pkg.*, d.code AS donor_code FROM packages pkg
     JOIN donor_trucks d ON d.id = pkg.donor_id ORDER BY pkg.created_at DESC`,
  );
}

export async function getPackage(id: string) {
  return queryOne(`SELECT * FROM packages WHERE id = $1`, [id]);
}

export async function listPackingLists() {
  return query(
    `SELECT pl.*, d.code AS donor_code, c.container_number
     FROM packing_lists pl
     JOIN donor_trucks d ON d.id = pl.donor_id
     LEFT JOIN containers c ON c.id = pl.container_id
     ORDER BY pl.created_at DESC`,
  );
}

export async function listPackingListItems(packingListId: string) {
  return query(
    `SELECT pli.*, pkg.package_id AS package_code, pkg.part_description
     FROM packing_list_items pli JOIN packages pkg ON pkg.id = pli.package_id
     WHERE pli.packing_list_id = $1`,
    [packingListId],
  );
}
