import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAiProviderFromEnv, extractQuoteFromEmail } from "@barray/ai";
import { createQuoteFromExtraction, getOpportunity } from "@barray/database";
import { assertInternalApiAuth } from "@/lib/internal-auth";

const Schema = z.object({ opportunityId: z.string().uuid(), rfqId: z.string().uuid(), emailText: z.string() });

export async function POST(request: NextRequest) {
  const authError = assertInternalApiAuth(request);
  if (authError) return authError;

  const parsed = Schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_input" }, { status: 400 });

  const opportunity = await getOpportunity(parsed.data.opportunityId);
  if (!opportunity || !opportunity.supplier_id) return NextResponse.json({ error: "not_found" }, { status: 404 });

  let extracted;
  try {
    const provider = createAiProviderFromEnv();
    extracted = await extractQuoteFromEmail(provider, parsed.data.emailText);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "AI extraction failed" }, { status: 502 });
  }

  const quoteId = await createQuoteFromExtraction({
    rfqId: parsed.data.rfqId,
    opportunityId: parsed.data.opportunityId,
    supplierId: opportunity.supplier_id,
    truckPrice: extracted.truck_price,
    dismantlingPrice: extracted.dismantling_price,
    packingPrice: extracted.packing_price,
    chinaInlandTransportPrice: extracted.china_inland_transport_price,
    fobQingdaoPrice: extracted.fob_qingdao_price,
    fobShanghaiPrice: extracted.fob_shanghai_price,
    fobNingboPrice: extracted.fob_ningbo_price,
    cifTangerMedPrice: extracted.cif_tanger_med_price,
    cifCasablancaPrice: extracted.cif_casablanca_price,
    inspectionPrice: extracted.inspection_price,
    currency: extracted.currency,
    notOfficiallyScrappedDeclared: extracted.not_officially_scrapped_declared,
    rawText: parsed.data.emailText,
    confidence: extracted.confidence,
  });

  return NextResponse.json({ ok: true, entityId: quoteId, extracted });
}
