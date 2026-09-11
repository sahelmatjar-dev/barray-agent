import { AiProvider } from "../provider";

export interface ExtractedQuoteFields {
  truck_price: number | null;
  dismantling_price: number | null;
  packing_price: number | null;
  china_inland_transport_price: number | null;
  fob_qingdao_price: number | null;
  fob_shanghai_price: number | null;
  fob_ningbo_price: number | null;
  cif_tanger_med_price: number | null;
  cif_casablanca_price: number | null;
  inspection_price: number | null;
  currency: string | null;
  not_officially_scrapped_declared: boolean;
  confidence: number; // 0-1, model's own confidence in the extraction
}

const SYSTEM_PROMPT = `You extract structured pricing fields from a supplier's email quote for a used
SITRAK truck export deal. You NEVER invent a number that is not present in the text.
Any field not explicitly stated must be null. Respond with strict JSON matching the schema, no prose.`;

/**
 * AI is used ONLY to understand free-text supplier quotes; it never performs
 * the deterministic best-value ranking (see packages/shared/src/best-value.ts).
 * The caller is responsible for persisting the raw text + extraction alongside
 * this result for audit (quotes.raw_text, quotes.extracted_by_ai).
 */
export async function extractQuoteFromEmail(provider: AiProvider, emailText: string): Promise<ExtractedQuoteFields> {
  const result = await provider.complete({
    system: SYSTEM_PROMPT,
    prompt: `Extract pricing fields as JSON from this supplier email:\n\n"""\n${emailText}\n"""`,
    jsonMode: true,
    maxTokens: 800,
  });

  try {
    return JSON.parse(result.text);
  } catch {
    throw new Error(`AI quote extraction did not return valid JSON: ${result.text.slice(0, 200)}`);
  }
}
