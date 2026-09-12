import { NextRequest, NextResponse } from "next/server";
import { findShipmentsWithEtaDrift, createAlert } from "@barray/database";
import { assertInternalApiAuth } from "@/lib/internal-auth";

export async function POST(request: NextRequest) {
  const authError = assertInternalApiAuth(request);
  if (authError) return authError;

  const drifted = await findShipmentsWithEtaDrift();

  for (const alert of drifted) {
    await createAlert({
      type: "SHIPMENT_ETA_DRIFT",
      severity: "WARNING",
      entity: "shipment",
      entityId: alert.shipmentId,
      title: `ETA drift on container ${alert.containerNumber}`,
      message: `Container ${alert.containerNumber} ETA has drifted ${alert.driftDays > 0 ? "+" : ""}${alert.driftDays} days from the original estimate.`,
    });
  }

  return NextResponse.json({ ok: true, entityId: null, alertsCreated: drifted.length, drifted });
}
