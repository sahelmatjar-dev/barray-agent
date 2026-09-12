import { IntegrationNotConfiguredError } from "../errors";
import { RawListing, SourcingProvider, SourcingQuery } from "./provider";

/**
 * Clean placeholder for a marketplace connector that is not yet wired to a
 * live, ToS-compliant data source (official API or an approved feed).
 *
 * Do NOT scrape Alibaba/Made-in-China HTML directly — both prohibit
 * unauthorized scraping in their terms of service. Wire this provider to:
 *   - an official partner/API integration, or
 *   - a licensed data feed / search API, or
 *   - manually-entered listings (platform = "MANUAL") via the dashboard.
 *
 * WF-001-opportunity-discovery.json calls providers through this same
 * interface, so swapping a placeholder for a real integration requires no
 * workflow changes — only environment configuration.
 */
export class PlaceholderSourcingProvider implements SourcingProvider {
  constructor(
    public readonly name: string,
    private requiredEnvVars: string[],
    private env: NodeJS.ProcessEnv = process.env,
  ) {}

  async search(_query: SourcingQuery): Promise<RawListing[]> {
    const missing = this.requiredEnvVars.filter((key) => !this.env[key]);
    if (missing.length > 0) {
      throw new IntegrationNotConfiguredError(`${this.name} sourcing provider`, missing);
    }
    // Real implementation goes here once credentials/API access are confirmed.
    return [];
  }
}

export function createAlibabaProvider(env: NodeJS.ProcessEnv = process.env): SourcingProvider {
  return new PlaceholderSourcingProvider("Alibaba", ["ALIBABA_API_KEY"], env);
}

export function createMadeInChinaProvider(env: NodeJS.ProcessEnv = process.env): SourcingProvider {
  return new PlaceholderSourcingProvider("Made-in-China", ["MADE_IN_CHINA_API_KEY"], env);
}
