import OpenAI from "openai";
import { AiCompletionRequest, AiCompletionResult, AiProvider } from "../provider";

export class OpenAiProvider implements AiProvider {
  readonly name = "openai" as const;
  private client: OpenAI;
  private model: string;

  constructor(apiKey: string, model = "gpt-4o") {
    if (!apiKey) throw new Error("OPENAI_API_KEY is required to use the openai AI provider");
    this.client = new OpenAI({ apiKey });
    this.model = model;
  }

  async complete(request: AiCompletionRequest): Promise<AiCompletionResult> {
    const start = Date.now();
    const response = await this.client.chat.completions.create({
      model: this.model,
      max_tokens: request.maxTokens ?? 1024,
      temperature: request.temperature ?? 0.2,
      response_format: request.jsonMode ? { type: "json_object" } : undefined,
      messages: [
        ...(request.system ? [{ role: "system" as const, content: request.system }] : []),
        { role: "user" as const, content: request.prompt },
      ],
    });

    return {
      text: response.choices[0]?.message?.content ?? "",
      provider: "openai",
      model: this.model,
      tokensInput: response.usage?.prompt_tokens ?? 0,
      tokensOutput: response.usage?.completion_tokens ?? 0,
      latencyMs: Date.now() - start,
    };
  }
}
