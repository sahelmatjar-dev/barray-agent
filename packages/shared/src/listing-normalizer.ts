/**
 * Deterministic normalization of a raw scraped/manual listing's free text
 * into the fixed model/configuration enums the schema expects. Never guesses
 * a value the text doesn't support — returns "OTHER" (a real schema value,
 * not a fabricated one) when nothing matches.
 */
export type SitrakModel = "C7H" | "G7" | "C9H" | "OTHER";
export type TruckConfiguration = "8x4" | "6x4" | "4x2" | "OTHER";

export function extractModel(text: string): SitrakModel {
  const upper = text.toUpperCase();
  if (/\bC7H\b/.test(upper)) return "C7H";
  if (/\bG7\b/.test(upper)) return "G7";
  if (/\bC9H\b/.test(upper)) return "C9H";
  return "OTHER";
}

export function extractConfiguration(text: string): TruckConfiguration {
  if (/8\s*[x×]\s*4/i.test(text)) return "8x4";
  if (/6\s*[x×]\s*4/i.test(text)) return "6x4";
  if (/4\s*[x×]\s*2/i.test(text)) return "4x2";
  return "OTHER";
}

export function extractYear(text: string): number | null {
  const match = text.match(/\b(19|20)\d{2}\b/);
  return match ? Number(match[0]) : null;
}

/** Extracts a plausible price from free text (e.g. "$17,800", "17800 USD").
 * Returns null rather than a guessed figure when no clear number is present. */
export function extractPrice(text: string | null): number | null {
  if (!text) return null;
  const match = text.replace(/,/g, "").match(/\d{3,7}(\.\d+)?/);
  return match ? Number(match[0]) : null;
}

export function extractCurrency(text: string | null): string {
  if (!text) return "USD";
  if (/USD|\$/.test(text)) return "USD";
  if (/RMB|CNY|¥/.test(text)) return "CNY";
  if (/EUR|€/.test(text)) return "EUR";
  return "USD";
}
