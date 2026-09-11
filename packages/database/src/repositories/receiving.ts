import { query, queryOne, withTransaction } from "../pool";

/** WF-023: creates the receiving report and one item per package on the
 * container's packing list. condition_on_arrival/received_quantity are left
 * for the warehouse team to fill in on physical inspection — never guessed. */
export async function createReceivingReportForContainer(containerId: string): Promise<string> {
  return withTransaction(async (client) => {
    const { rows: shipmentRows } = await client.query<{ id: string }>(
      `SELECT id FROM shipments WHERE container_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [containerId],
    );
    if (shipmentRows.length === 0) throw new Error(`No shipment found for container ${containerId}`);
    const shipmentId = shipmentRows[0].id;

    const { rows: reportRows } = await client.query<{ id: string }>(
      `INSERT INTO receiving_reports (shipment_id, container_id, status) VALUES ($1, $2, 'PENDING') RETURNING id`,
      [shipmentId, containerId],
    );
    const reportId = reportRows[0].id;

    const { rows: packages } = await client.query<{ id: string; part_id: string }>(
      `SELECT pkg.id, pkg.part_id FROM packing_list_items pli
       JOIN packing_lists pl ON pl.id = pli.packing_list_id
       JOIN packages pkg ON pkg.id = pli.package_id
       WHERE pl.container_id = $1`,
      [containerId],
    );

    for (const pkg of packages) {
      await client.query(
        `INSERT INTO receiving_items (receiving_report_id, package_id, part_id, status) VALUES ($1, $2, $3, 'PENDING')`,
        [reportId, pkg.id, pkg.part_id],
      );
    }

    return reportId;
  });
}

export async function listReceivingReports() {
  return query(
    `SELECT rr.*, c.container_number FROM receiving_reports rr
     LEFT JOIN containers c ON c.id = rr.container_id ORDER BY rr.created_at DESC`,
  );
}

export async function getReceivingReport(id: string) {
  return queryOne(`SELECT * FROM receiving_reports WHERE id = $1`, [id]);
}

export async function listReceivingItems(reportId: string) {
  return query(
    `SELECT ri.*, pkg.package_id AS package_code FROM receiving_items ri
     LEFT JOIN packages pkg ON pkg.id = ri.package_id WHERE ri.receiving_report_id = $1`,
    [reportId],
  );
}
