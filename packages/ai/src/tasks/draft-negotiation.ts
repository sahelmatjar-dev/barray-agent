import { AiProvider } from "../provider";

export interface DraftNegotiationInput {
  opportunityCode: string;
  supplierName: string;
  askingPrice: number;
  currentCounterOffer: number | null;
  targetPrice: number;
  maximumPrice: number;
  currency: string;
  tone: "firm" | "friendly" | "final";
  locale: "ar" | "fr" | "en";
}

const SYSTEM_PROMPT = `You draft a supplier negotiation email for a truck export deal. You may propose
a counter-price, but you must NEVER propose or accept a price above the given maximumPrice, and you
must NEVER state or imply that the deal is confirmed, that payment will be sent, or that a contract
is signed — negotiation drafts always require human review and approval before sending.`;

/** Returns a draft only. Sending requires human approval (negotiation_messages.status = PENDING_APPROVAL). */
export async function draftNegotiationMessage(provider: AiProvider, input: DraftNegotiationInput): Promise<string> {
  const result = await provider.complete({
    system: SYSTEM_PROMPT,
    prompt: `Draft a ${input.tone} negotiation email in locale "${input.locale}" for opportunity ${input.opportunityCode}
with supplier ${input.supplierName}.
Asking price: ${input.askingPrice} ${input.currency}
Current counter-offer on the table: ${input.currentCounterOffer ?? "none yet"}
Our target price: ${input.targetPrice} ${input.currency}
Our absolute maximum price (NEVER exceed or reveal this number): ${input.maximumPrice} ${input.currency}
Do not mention the maximum price to the supplier. Do not confirm any purchase.`,
    maxTokens: 600,
    temperature: 0.4,
  });
  return result.text.trim();
}
