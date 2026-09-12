import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAiProviderFromEnv, generateWeeklyReportNarrative } from "@barray/ai";
import { buildWeeklyReportData } from "@/lib/reports";
import { assertInternalApiAuth } from "@/lib/internal-auth";

const Schema = z.object({ locale: z.enum(["ar", "fr", "en"]).default("ar") });

export async function POST(request: NextRequest) {
  const authError = assertInternalApiAuth(request);
  if (authError) return authError;

  const parsed = Schema.safeParse(await request.json().catch(() => ({ locale: "ar" })));
  if (!parsed.success) return NextResponse.json({ error: "invalid_input" }, { status: 400 });

  const reportData = await buildWeeklyReportData(parsed.data.locale);

  let narrative: string | null = null;
  try {
    const provider = createAiProviderFromEnv();
    narrative = await generateWeeklyReportNarrative(provider, reportData);
  } catch {
    // Deterministic figures still return even if no AI provider is configured.
  }

  return NextResponse.json({ ok: true, entityId: null, reportData, narrative });
}
