import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAiProviderFromEnv, draftNegotiationMessage } from "@barray/ai";
import { getNegotiationDraftContext, createNegotiationMessage } from "@barray/database";
import { assertInternalApiAuth } from "@/lib/internal-auth";

const Schema = z.object({ negotiationId: z.string().uuid(), locale: z.enum(["ar", "fr", "en"]).default("ar") });

export async function POST(request: NextRequest) {
  const authError = assertInternalApiAuth(request);
  if (authError) return authError;

  const parsed = Schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_input" }, { status: 400 });

  const negotiation = await getNegotiationDraftContext(parsed.data.negotiationId);
  if (!negotiation) return NextResponse.json({ error: "not_found" }, { status: 404 });

  let draftText: string;
  try {
    const provider = createAiProviderFromEnv();
    draftText = await draftNegotiationMessage(provider, {
      opportunityCode: negotiation.opportunity_code,
      supplierName: negotiation.supplier_name,
      askingPrice: Number(negotiation.asking_price),
      currentCounterOffer: negotiation.current_counter_price ? Number(negotiation.current_counter_price) : null,
      targetPrice: Number(negotiation.target_price),
      maximumPrice: Number(negotiation.maximum_price),
      currency: negotiation.currency,
      tone: "firm",
      locale: parsed.data.locale,
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "AI drafting failed" }, { status: 502 });
  }

  // Drafts are always PENDING_APPROVAL — a human sends it, the AI never does (docs/safety-rules.md).
  const messageId = await createNegotiationMessage({
    negotiationId: negotiation.id,
    direction: "OUTBOUND",
    draftedByAi: true,
    proposedPrice: negotiation.current_counter_price ? Number(negotiation.current_counter_price) : null,
    body: draftText,
  });

  return NextResponse.json({ ok: true, entityId: messageId, draftText });
}
