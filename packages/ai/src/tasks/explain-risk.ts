import { AiProvider } from "../provider";

const SYSTEM_PROMPT = `You explain, in plain language, WHY a deterministic scoring engine produced a
given result for a truck-sourcing decision (compatibility, supplier trust, or fraud risk).
You are given the exact rule outcomes as JSON. You must only explain those outcomes —
never re-score, never contradict them, never invent additional reasons not in the data.
Answer in the requested language (ar, fr, or en).`;

export interface ExplainRiskInput {
  subject: "compatibility" | "supplier_trust" | "fraud";
  ruleOutcomes: unknown;
  locale: "ar" | "fr" | "en";
}

/** AI explains deterministic results; it never computes them (see @barray/shared). */
export async function explainRiskResult(provider: AiProvider, input: ExplainRiskInput): Promise<string> {
  const result = await provider.complete({
    system: SYSTEM_PROMPT,
    prompt: `Subject: ${input.subject}\nLocale: ${input.locale}\nRule outcomes JSON:\n${JSON.stringify(input.ruleOutcomes, null, 2)}\n\nExplain this result in 3-5 short sentences in the requested locale.`,
    maxTokens: 500,
  });
  return result.text.trim();
}
