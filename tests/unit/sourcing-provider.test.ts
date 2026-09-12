import { describe, expect, it } from "vitest";
import { IntegrationNotConfiguredError } from "../../packages/integrations/src/errors";
import { createAlibabaProvider } from "../../packages/integrations/src/sourcing/placeholder-provider";

describe("PlaceholderSourcingProvider", () => {
  it("throws a clear, actionable error when credentials are missing", async () => {
    const provider = createAlibabaProvider({} as NodeJS.ProcessEnv);
    await expect(provider.search({ brand: "SITRAK", models: ["C7H"], configurations: ["8x4"] })).rejects.toThrow(
      IntegrationNotConfiguredError,
    );
  });

  it("does not throw once the required env var is present (still returns no live data yet)", async () => {
    const provider = createAlibabaProvider({ ALIBABA_API_KEY: "test-key" } as NodeJS.ProcessEnv);
    const results = await provider.search({ brand: "SITRAK", models: ["C7H"], configurations: ["8x4"] });
    expect(results).toEqual([]);
  });
});
