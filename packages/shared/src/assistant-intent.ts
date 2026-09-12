/**
 * Deterministic keyword-based intent classification for the in-app AI
 * assistant. Classification and parameter extraction are plain code — only
 * the final answer phrasing goes through the AI provider (packages/ai
 * tasks/answer-assistant-question.ts), and always from the exact data these
 * intents retrieve. The assistant must not guess, so intent routing must not
 * either.
 */
export type AssistantIntent =
  | { type: "TOP_OPPORTUNITIES"; limit: number }
  | { type: "SEARCH_BY_ENGINE"; engine: string }
  | { type: "SUPPLIER_REJECTION_REASON"; query: string }
  | { type: "COMPARE_OPPORTUNITY_TO_FLEET"; opportunityCode: string }
  | { type: "DONOR_LANDED_COST"; donorCode: string }
  | { type: "AVAILABLE_ENGINES_IN_STOCK" }
  | { type: "YTD_SAVINGS"; year: number }
  | { type: "UNKNOWN"; question: string };

const OPPORTUNITY_CODE_RE = /EBR-OPP-\d{4}-\d{4}/i;
const DONOR_CODE_RE = /EBR-CN-\d{3}/i;
const ENGINE_RE = /\b(MC\d{2}[A-Z]?|WP\d{2,3}[A-Z]?|D\d{2,3}[A-Z]?)\b/i;

export function classifyAssistantQuestion(question: string, now: Date = new Date()): AssistantIntent {
  const q = question.trim();
  const lower = q.toLowerCase();

  const donorMatch = q.match(DONOR_CODE_RE);
  if (donorMatch && /(تكلفة|cost|coût|landed)/i.test(q)) {
    return { type: "DONOR_LANDED_COST", donorCode: donorMatch[0].toUpperCase() };
  }

  const oppMatch = q.match(OPPORTUNITY_CODE_RE);
  if (oppMatch && /(قارن|compare|comparer)/i.test(q)) {
    return { type: "COMPARE_OPPORTUNITY_TO_FLEET", opportunityCode: oppMatch[0].toUpperCase() };
  }

  if (/(افضل|أفضل|best|meilleur)/i.test(q) && /(شاحن|truck|camion)/i.test(q)) {
    const numberMatch = q.match(/\d+/);
    return { type: "TOP_OPPORTUNITIES", limit: numberMatch ? Number(numberMatch[0]) : 5 };
  }

  const engineMatch = q.match(ENGINE_RE);
  if (engineMatch && /(شاحن|truck|camion|تحتوي|contain|contient)/i.test(q)) {
    return { type: "SEARCH_BY_ENGINE", engine: engineMatch[0].toUpperCase() };
  }

  if (/(لماذا رفض|why.*reject|pourquoi.*rejet)/i.test(lower)) {
    return { type: "SUPPLIER_REJECTION_REASON", query: q };
  }

  if (/(محرك|engine|moteur)/i.test(q) && /(مخزن|متوفر|stock|available|disponible)/i.test(q)) {
    return { type: "AVAILABLE_ENGINES_IN_STOCK" };
  }

  if (/(وفرنا|savings|économi|توفير)/i.test(q)) {
    const yearMatch = q.match(/20\d{2}/);
    return { type: "YTD_SAVINGS", year: yearMatch ? Number(yearMatch[0]) : now.getFullYear() };
  }

  return { type: "UNKNOWN", question: q };
}
