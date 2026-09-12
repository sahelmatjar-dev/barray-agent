import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAlibabaProvider, createMadeInChinaProvider, IntegrationNotConfiguredError } from "@barray/integrations";
import { assertInternalApiAuth } from "@/lib/internal-auth";

const Schema = z.object({
  brand: z.string(),
  models: z.array(z.string()),
  configurations: z.array(z.string()),
});

export async function POST(request: NextRequest) {
  const authError = assertInternalApiAuth(request);
  if (authError) return authError;

  const parsed = Schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "invalid_input" }, { status: 400 });

  const providers = [createAlibabaProvider(), createMadeInChinaProvider()];
  const results: { provider: string; listingsFound: number; error?: string }[] = [];

  for (const provider of providers) {
    try {
      const listings = await provider.search(parsed.data);
      results.push({ provider: provider.name, listingsFound: listings.length });
    } catch (err) {
      results.push({
        provider: provider.name,
        listingsFound: 0,
        error: err instanceof IntegrationNotConfiguredError ? err.message : (err instanceof Error ? err.message : "unknown error"),
      });
    }
  }

  return NextResponse.json({ ok: true, entityId: null, providers: results });
}
