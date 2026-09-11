import { AiProvider } from "./provider";
import { AnthropicProvider } from "./providers/anthropic";
import { OpenAiProvider } from "./providers/openai";

export interface AiProviderConfig {
  provider: "anthropic" | "openai";
  anthropicApiKey?: string;
  anthropicModel?: string;
  openaiApiKey?: string;
  openaiModel?: string;
}

/**
 * Reads AI_PROVIDER (+ *_API_KEY) and returns the configured provider.
 * This is the ONLY place that decides which vendor SDK gets instantiated.
 */
export function createAiProvider(config: AiProviderConfig): AiProvider {
  if (config.provider === "anthropic") {
    return new AnthropicProvider(config.anthropicApiKey ?? "", config.anthropicModel);
  }
  if (config.provider === "openai") {
    return new OpenAiProvider(config.openaiApiKey ?? "", config.openaiModel);
  }
  throw new Error(`Unknown AI_PROVIDER "${config.provider}". Use "anthropic" or "openai".`);
}

export function createAiProviderFromEnv(env: NodeJS.ProcessEnv = process.env): AiProvider {
  const provider = (env.AI_PROVIDER as "anthropic" | "openai") || "anthropic";
  return createAiProvider({
    provider,
    anthropicApiKey: env.ANTHROPIC_API_KEY,
    anthropicModel: env.ANTHROPIC_MODEL,
    openaiApiKey: env.OPENAI_API_KEY,
    openaiModel: env.OPENAI_MODEL,
  });
}
