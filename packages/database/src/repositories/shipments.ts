import { query, queryOne } from "../pool";

export async function listShipments() {
  return query(
    `SELECT s.*, c.container_number FROM shipments s
     JOIN containers c ON c.id = s.container_id ORDER BY s.created_at DESC`,
  );
}

export async function getShipment(id: string) {
  return queryOne(`SELECT * FROM shipments WHERE id = $1`, [id]);
}

export async function listShipmentEvents(shipmentId: string) {
  return query(`SELECT * FROM shipment_events WHERE shipment_id = $1 ORDER BY event_at`, [shipmentId]);
}

/** ETA drift alert threshold (days) — WF-022 shipment-tracking uses the same rule. */
export const ETA_DRIFT_ALERT_DAYS = 2;

export function etaDriftDays(eta: string | null, originalEta: string | null): number | null {
  if (!eta || !originalEta) return null;
  const diffMs = new Date(eta).getTime() - new Date(originalEta).getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

export interface ShipmentDriftAlert {
  shipmentId: string; containerNumber: string; driftDays: number;
}

/** WF-022: finds every active shipment whose ETA has drifted more than
 * ETA_DRIFT_ALERT_DAYS from its original estimate. Pure read — the caller
 * decides what to do (write an alert row), keeping this testable without I/O side effects. */
export async function findShipmentsWithEtaDrift(): Promise<ShipmentDriftAlert[]> {
  const shipments = await query<{ id: string; container_number: string; eta: string | null; original_eta: string | null }>(
    `SELECT s.id, c.container_number, s.eta, s.original_eta FROM shipments s
     JOIN containers c ON c.id = s.container_id
     WHERE s.status NOT IN ('DELIVERED')`,
  );
  const alerts: ShipmentDriftAlert[] = [];
  for (const s of shipments) {
    const drift = etaDriftDays(s.eta, s.original_eta);
    if (drift !== null && Math.abs(drift) > ETA_DRIFT_ALERT_DAYS) {
      alerts.push({ shipmentId: s.id, containerNumber: s.container_number, driftDays: drift });
    }
  }
  return alerts;
}
