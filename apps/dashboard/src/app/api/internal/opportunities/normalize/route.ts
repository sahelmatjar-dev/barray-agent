import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createOpportunityFromListing } from "@barray/database";
import { extractConfiguration, extractCurrency, extractModel, extractPrice, extractYear } from "@barray/shared";
import { assertInternalApiAuth } from "@/lib/internal-auth";

const Schema = z.object({
  platform: z.string(),
  listingUrl: z.string().url(),
  title: z.string(),
  priceText: z.string().nullable().optional(),
  locationText: z.string().nullable().optional(),
  descriptionText: z.string().nullable().optional(),
});

export async function POST(request: NextRequest) {
  const authError = assertInternalApiAuth(request);
  if (authError) return authError;

  const parsed = Schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_input" }, { status: 400 });

  const { platform, listingUrl, title, priceText, locationText, descriptionText } = parsed.data;
  const combinedText = `${title} ${descriptionText ?? ""}`;

  const opportunity = await createOpportunityFromListing({
    platform: platform.toUpperCase(),
    listingUrl,
    brand: "SITRAK",
    model: extractModel(combinedText),
    configuration: extractConfiguration(combinedText),
    year: extractYear(combinedText),
    askingPrice: extractPrice(priceText ?? null),
    currency: extractCurrency(priceText ?? null),
    locationCity: locationText ?? null,
    description: descriptionText ?? null,
  });

  return NextResponse.json({ ok: true, entityId: opportunity.id, code: opportunity.code });
}
