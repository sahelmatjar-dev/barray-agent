import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  classifyAssistantQuestion, formatAssistantAnswer, scoreCompatibility,
  TruckComponentSpec, UNKNOWN,
} from "@barray/shared";
import {
  listTopOpportunitiesByBestValue, searchOpportunitiesByEngine, findLatestSupplierRejection,
  getOpportunityByCode, getTruckSpecsForOpportunity, getFleetReferenceSpec,
  getDonorLandedCostByCode, listAvailableEnginesInStock, getYtdSavings,
} from "@barray/database";
import { getSession } from "@/lib/auth";

const Schema = z.object({ question: z.string().min(1).max(500) });

function toSpec(row: { engine_model?: string | null; gearbox_model?: string | null; front_axle_model?: string | null; rear_axle_model?: string | null; ecu_reference?: string | null; cabin_generation?: string | null; hydraulic_system?: string | null } | null): TruckComponentSpec {
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
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = Schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_input" }, { status: 400 });

  const intent = classifyAssistantQuestion(parsed.data.question);
  let data: unknown = null;

  switch (intent.type) {
    case "TOP_OPPORTUNITIES":
      data = await listTopOpportunitiesByBestValue(intent.limit);
      break;
    case "SEARCH_BY_ENGINE":
      data = await searchOpportunitiesByEngine(intent.engine);
      break;
    case "SUPPLIER_REJECTION_REASON":
      data = await findLatestSupplierRejection("");
      break;
    case "COMPARE_OPPORTUNITY_TO_FLEET": {
      const opportunity = await getOpportunityByCode(intent.opportunityCode);
      if (opportunity) {
        const specs = await getTruckSpecsForOpportunity(opportunity.id);
        const fleetRef = await getFleetReferenceSpec(opportunity.model, opportunity.configuration);
        data = fleetRef ? scoreCompatibility(toSpec(specs), toSpec(fleetRef)) : null;
      }
      break;
    }
    case "DONOR_LANDED_COST":
      data = await getDonorLandedCostByCode(intent.donorCode);
      break;
    case "AVAILABLE_ENGINES_IN_STOCK":
      data = await listAvailableEnginesInStock();
      break;
    case "YTD_SAVINGS":
      data = await getYtdSavings(intent.year);
      break;
    case "UNKNOWN":
    default:
      data = null;
  }

  const answer = formatAssistantAnswer(intent, data, session.locale);

  return NextResponse.json({ intent: intent.type, answer, data });
}
