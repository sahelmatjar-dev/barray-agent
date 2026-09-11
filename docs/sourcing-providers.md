# Adding a sourcing provider

Sourcing connectors implement one interface —
`packages/integrations/src/sourcing/provider.ts`:

```ts
export interface SourcingProvider {
  readonly name: string;
  search(query: SourcingQuery): Promise<RawListing[]>;
}
```

`WF-001-opportunity-discovery.json` calls providers through this interface
via the dashboard's internal API, so adding a new source requires **zero**
n8n workflow changes — only a new provider implementation and an
environment variable.

## Compliance first

Do not scrape Alibaba, Made-in-China, or any marketplace's HTML directly —
both explicitly prohibit unauthorized automated scraping in their terms of
service, and the "ABSOLUTE SAFETY RULES" for this system extend to how data
is sourced, not just how it's used. Acceptable sources:

- An official partner/affiliate API (apply through the platform).
- A licensed third-party data feed or search API that has scraping rights.
- Direct supplier websites where their own terms allow automated access
  (check `robots.txt` and terms of service per-site before adding one).
- Manual entry via the dashboard (`platform = 'MANUAL'`) — always available,
  requires no connector at all.

## Current status

`packages/integrations/src/sourcing/placeholder-provider.ts` provides
`createAlibabaProvider()` and `createMadeInChinaProvider()`, both wired to
throw `IntegrationNotConfiguredError` naming the exact missing environment
variable (`ALIBABA_API_KEY`, `MADE_IN_CHINA_API_KEY`) until real,
ToS-compliant API access is configured. This is intentional: the system
never falls back to scraping just because an API key is missing.

## Implementing a real provider

1. Create `packages/integrations/src/sourcing/<name>.ts` implementing
   `SourcingProvider`.
2. Map the source's raw response into `RawListing[]` — do not pre-fill any
   `opportunities` field here; that normalization is WF-002's job
   (`packages/shared` + the dashboard's `/api/internal/opportunities/normalize`
   endpoint), which is the only place allowed to decide what counts as
   `UNKNOWN` vs. a real value.
3. Add the new provider to the discovery endpoint's provider list.
4. Document the required credential(s) in `.env.example` and
   `n8n/credentials-example/README.md` if the provider needs one exposed to
   n8n directly (most providers are called by the dashboard, not n8n).
