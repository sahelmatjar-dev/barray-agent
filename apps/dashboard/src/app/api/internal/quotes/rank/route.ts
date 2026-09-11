import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getOpportunity, listQuotesForOpportunity, updateQuoteBestValue, getSupplier } from "@barray/database";
import { rankQuotesByBestValue, QuoteCandidate } from "@barray/shared";
import { assertInternalApiAuth } from "@/lib/internal-auth";

const Schema = z.object({ opportunityId: z.string().uuid() });

function totalPrice(q: {
  truck_price: string | null; dismantling_price: string | null; packing_price: string | null;
  china_inland_transport_price: string | null; cif_tanger_med_price: string | null;
}): number {
  return [q.truck_price, q.dismantling_price, q.packing_price, q.china_inland_transport_price, q.cif_tanger_med_price]
    .reduce((sum, v) => sum + (v ? Number(v) : 0), 0);
}

export async function POST(request: NextRequest) {
  const authError = assertInternalApiAuth(request);
  if (authError) return authError;

  const parsed = Schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_input" }, { status: 400 });

  const opportunity = await getOpportunity(parsed.data.opportunityId);
  if (!opportunity) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const quotes = await listQuotesForOpportunity(opportunity.id);
  if (quotes.length === 0) return NextResponse.json({ ok: true, entityId: opportunity.id, ranked: [] });

  const candidates: QuoteCandidate[] = [];
  for (const q of quotes) {
    const supplier = await getSupplier(q.supplier_id);
    candidates.push({
      id: q.id,
      compatibilityScore: opportunity.compatibility_score ?? 0,
      mechanicalScore: opportunity.mechanical_score ?? 0,
      supplierTrustScore: supplier?.trust_score ?? 0,
      totalPrice: totalPrice(q),
      mileageKm: opportunity.mileage_km,
      year: opportunity.year,
      documentationCompletenessPct: 100,
      logisticsScore: 70,
    });
  }

  const ranked = rankQuotesByBestValue(candidates);
  for (const r of ranked) {
    await updateQuoteBestValue(r.id, r.score, r.breakdown);
  }

  return NextResponse.json({ ok: true, entityId: opportunity.id, ranked });
}
