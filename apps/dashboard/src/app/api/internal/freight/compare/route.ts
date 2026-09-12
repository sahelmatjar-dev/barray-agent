import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { listFreightQuotesForDonor, totalFreightQuoteCost, FreightCostFields } from "@barray/database";
import { assertInternalApiAuth } from "@/lib/internal-auth";

const Schema = z.object({ donorId: z.string().uuid() });

export async function POST(request: NextRequest) {
  const authError = assertInternalApiAuth(request);
  if (authError) return authError;

  const parsed = Schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_input" }, { status: 400 });

  const quotes = await listFreightQuotesForDonor(parsed.data.donorId);
  const ranked = (quotes as Record<string, unknown>[])
    .map((q) => ({ id: q.id, forwarderName: q.forwarder_name, totalCost: totalFreightQuoteCost(q as unknown as FreightCostFields), currency: q.currency }))
    .sort((a, b) => a.totalCost - b.totalCost);

  // Suggests the lowest total — a human still selects it (freight_quotes.status = 'SELECTED'), never auto-picked here.
  return NextResponse.json({ ok: true, entityId: parsed.data.donorId, ranked, suggestedId: ranked[0]?.id ?? null });
}
