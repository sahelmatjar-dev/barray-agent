import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getOpportunity, getTruckSpecsForOpportunity, getFleetReferenceSpec, query } from "@barray/database";
import { scoreCompatibility, TruckComponentSpec, UNKNOWN } from "@barray/shared";
import { assertInternalApiAuth } from "@/lib/internal-auth";

const Schema = z.object({ opportunityId: z.string().uuid() });

interface SpecLike {
  engine_model: string | null;
  gearbox_model: string | null;
  front_axle_model: string | null;
  rear_axle_model: string | null;
  ecu_reference: string | null;
  cabin_generation: string | null;
  hydraulic_system: string | null;
}

function toSpec(row: SpecLike | null): TruckComponentSpec {
  return {
    engine_model: row?.engine_model ?? UNKNOWN,
    gearbox_model: row?.gearbox_model ?? UNKNOWN,
    front_axle_model: row?.front_axle_model ?? UNKNOWN,
    rear_axle_model: row?.rear_axle_model ?? UNKNOWN,
    ecu_reference: row?.ecu_reference ?? UNKNOWN,
    cabin_generation: row?.cabin_generation ?? UNKNOWN,
    hydraulic_system: row?.hydraulic_system ?? UNKNOWN,
  };
}

export async function POST(request: NextRequest) {
  const authError = assertInternalApiAuth(request);
  if (authError) return authError;

  const parsed = Schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_input" }, { status: 400 });

  const opportunity = await getOpportunity(parsed.data.opportunityId);
  if (!opportunity) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const truckSpecs = await getTruckSpecsForOpportunity(opportunity.id);
  const fleetReference = await getFleetReferenceSpec(opportunity.model, opportunity.configuration);
  if (!fleetReference) {
    return NextResponse.json({ error: "no_fleet_reference", message: `No ACTIVE fleet truck for ${opportunity.model} ${opportunity.configuration}` }, { status: 422 });
  }

  const result = scoreCompatibility(toSpec(truckSpecs), toSpec(fleetReference));

  await query(`UPDATE opportunities SET compatibility_score = $1, compatibility_breakdown = $2 WHERE id = $3`, [
    result.score, JSON.stringify(result.reasons), opportunity.id,
  ]);

  return NextResponse.json({ ok: true, entityId: opportunity.id, score: result.score, reasons: result.reasons });
}
