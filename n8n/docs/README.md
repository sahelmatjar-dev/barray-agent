# n8n workflows — EL BARRAY RA SITRAK Sourcing OS

27 workflow files live in `n8n/workflows/WF-0NN-*.json`, one per pipeline
stage. They share one structural skeleton (see
`scripts/generate-n8n-workflows.js`, the generator that produced them from
`scripts/n8n-workflow-specs.js`):

```
Trigger  ->  Check Idempotency (Postgres)  ->  IF Already Run
                                                  ├─ true  -> Stop (NoOp)
                                                  └─ false -> Start Workflow Run (Postgres)
                                                               -> Main Logic
                                                               -> Persist Result (audit_logs)
                                                               -> Record Success (Postgres)
```

- **Trigger**: `scheduleTrigger` (cron), `webhook` (called by the dashboard
  or another workflow), or `errorTrigger` (WF-027 only).
- **Idempotency**: every non-error workflow checks `workflow_runs` for a
  prior `SUCCESS` row with the same `(workflow_code, idempotency_key)`
  before doing anything, and records `RUNNING` immediately after — so a
  retried webhook or an overlapping cron tick never double-processes the
  same opportunity/supplier/payment/etc. This mirrors the unique index in
  `database/migrations/001_core.sql`.
- **Main Logic**: for anything that touches a scoring engine, Postgres
  write, or AI call, the node is an `httpRequest` into the dashboard's
  internal API (`apps/dashboard/src/app/api/internal/*`, to be implemented
  per phase) — n8n orchestrates triggers and timing, `@barray/shared` /
  `@barray/database` / `@barray/ai` do the actual work. Notification-only
  steps (RFQ email, freight RFQ email, Telegram alerts) use the relevant
  n8n node directly (Gmail, Telegram) since there's nothing to compute.
- **Error path**: every workflow's `settings.errorWorkflow` points at
  `WF-027-error-handler`. n8n resolves `errorWorkflow` by numeric/string
  workflow ID, which does not exist until you import WF-027 into your
  instance — after importing all 27 files, open each workflow's Settings ▸
  Error Workflow and pick "WF-027 Error Handler" from the dropdown (a
  one-time step; n8n does not support pointing this at a workflow by name
  in an import file).

## Import order

1. Import `WF-027-error-handler.json` first and activate it.
2. Set up the 5 named credentials (`n8n/credentials-example/README.md`).
3. Import `WF-001` through `WF-026`.
4. For each imported workflow: open Settings ▸ Error Workflow ▸ select
   "WF-027 Error Handler"; open each node with a `credentials` block and
   select the matching real credential (the JSON's `PLACEHOLDER_*` ids will
   show as unresolved until you do this).
5. Activate the `scheduleTrigger` workflows (WF-001, WF-008, WF-022,
   WF-026). Webhook-triggered workflows activate automatically once you
   toggle them on — copy each webhook's production URL into the
   corresponding call site in `apps/dashboard` (documented per phase).

## Placeholder / not-yet-configured integrations

`packages/integrations/src/sourcing/placeholder-provider.ts` backs WF-001's
Alibaba/Made-in-China connectors. Until `ALIBABA_API_KEY` /
`MADE_IN_CHINA_API_KEY` are set, `search()` throws
`IntegrationNotConfiguredError` with the exact missing variable name — WF-001
will fail loudly (and record it via WF-027) rather than silently scraping or
fabricating listings. Manual listing entry (`platform = 'MANUAL'` via the
dashboard) always works independent of these connectors.

## Workflow index

| Code | File | Stage |
|---|---|---|
| WF-001 | opportunity-discovery | DISCOVERY |
| WF-002 | listing-normalization | DISCOVERY |
| WF-003 | duplicate-detection | DISCOVERY |
| WF-004 | fleet-compatibility | COMPATIBILITY CHECK |
| WF-005 | supplier-verification | SUPPLIER VERIFICATION |
| WF-006 | fraud-risk | SUPPLIER VERIFICATION |
| WF-007 | rfq-send | RFQ |
| WF-008 | email-intake | RFQ / QUOTE ANALYSIS |
| WF-009 | quote-extraction | QUOTE ANALYSIS |
| WF-010 | quote-ranking | QUOTE ANALYSIS |
| WF-011 | negotiation | NEGOTIATION |
| WF-012 | inspection | INSPECTION |
| WF-013 | approval | OWNER APPROVAL |
| WF-014 | po-generator | PURCHASE |
| WF-015 | payment-verification | PURCHASE |
| WF-016 | dismantling | DISMANTLING |
| WF-017 | packing | PACKING |
| WF-018 | freight-rfq | LOGISTICS |
| WF-019 | freight-comparison | LOGISTICS |
| WF-020 | customs-review | CUSTOMS REVIEW |
| WF-021 | landed-cost | CUSTOMS REVIEW / ROI |
| WF-022 | shipment-tracking | SHIPPING |
| WF-023 | receiving | RECEIVING |
| WF-024 | inventory | INVENTORY |
| WF-025 | claims | CLAIMS |
| WF-026 | weekly-executive-report | REPORTING |
| WF-027 | error-handler | (shared, all stages) |

## Regenerating

Do not hand-edit the generated skeleton parts (idempotency check, error
workflow setting). Edit `scripts/n8n-workflow-specs.js` and re-run:

```bash
node scripts/generate-n8n-workflows.js
npx vitest run tests/unit/n8n-workflows.test.ts
```

The test asserts: all 27 files present, every node type is a real
`n8n-nodes-base.*` type (no fabricated types), every credential reference is
a placeholder (never a real secret), every connection points at a node that
exists, and every non-error workflow has an idempotency check and an
`errorWorkflow` setting.
