/**
 * Single AI provider abstraction. Every AI call in the system — email
 * extraction, quote understanding, document classification, risk
 * explanations, negotiation drafts, report generation — goes through this
 * interface. No file outside packages/ai should import "@anthropic-ai/sdk"
 * or "openai" directly.
 *
 * Deterministic calculations (compatibility, supplier trust, fraud, landed
 * cost, ROI) live in @barray/shared and NEVER call this module.
 */
export interface AiCompletionRequest {
  system?: string;
  prompt: string;
  maxTokens?: number;
  temperature?: number;
  /** JSON schema-ish hint; providers that support structured output use it,
   * others fall back to "respond with JSON only" prompting. */
  jsonMode?: boolean;
}

export interface AiCompletionResult {
  text: string;
  provider: "anthropic" | "openai";
  model: string;
  tokensInput: number;
  tokensOutput: number;
  latencyMs: number;
}

export interface AiProvider {
  readonly name: "anthropic" | "openai";
  complete(request: AiCompletionRequest): Promise<AiCompletionResult>;
}
