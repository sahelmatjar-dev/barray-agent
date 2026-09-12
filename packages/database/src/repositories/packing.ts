import { query, queryOne, withTransaction } from "../pool";

/** WF-017: one package per DONE dismantling item, added to a single (draft)
 * packing list for the donor truck. Weights/dimensions/candidate HS code are
 * left UNKNOWN/null here — they are filled in by the warehouse team, never
 * invented (see docs/safety-rules.md). */
export async function createPackagesForDismantlingJob(dismantlingJobId: string): Promise<{ packingListId: string; packageIds: string[] }> {
  return withTransaction(async (client) => {
    const { rows: jobRows } = await client.query<{ donor_truck_id: string }>(
      `SELECT donor_truck_id FROM dismantling_jobs WHERE id = $1`,
      [dismantlingJobId],
    );
    if (jobRows.length === 0) throw new Error(`Dismantling job ${dismantlingJobId} not found`);
    const donorId = jobRows[0].donor_truck_id;

    const { rows: doneItems } = await client.query<{ part_id: string; part_code: string; description: string | null }>(
      `SELECT di.part_id, p.part_code, p.description FROM dismantling_items di
       JOIN parts p ON p.id = di.part_id WHERE di.dismantling_job_id = $1 AND di.status = 'DONE'`,
      [dismantlingJobId],
    );

    const { rows: listRows } = await client.query<{ id: string }>(
      `INSERT INTO packing_lists (donor_id, status) VALUES ($1, 'DRAFT') RETURNING id`,
      [donorId],
    );
    const packingListId = listRows[0].id;

    const packageIds: string[] = [];
    for (const item of doneItems) {
      const { rows: pkgRows } = await client.query<{ id: string }>(
        `INSERT INTO packages (package_id, donor_id, part_id, part_description, condition, status)
         VALUES ($1, $2, $3, $4, 'UNKNOWN', 'PENDING') RETURNING id`,
        [`${item.part_code}-PKG`, donorId, item.part_id, item.description ?? item.part_code],
      );
      await client.query(`INSERT INTO packing_list_items (packing_list_id, package_id) VALUES ($1, $2)`, [
        packingListId, pkgRows[0].id,
      ]);
      packageIds.push(pkgRows[0].id);
    }

    return { packingListId, packageIds };
  });
}

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
