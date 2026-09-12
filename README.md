# EL BARRAY RA — SITRAK China Sourcing OS

An operations system for sourcing used SINOTRUK SITRAK trucks (C7H, G7, C9H)
in China as donor trucks for spare parts: discovery → supplier verification →
compatibility check → RFQ → quote analysis → negotiation → inspection →
owner approval → purchase → dismantling → packing → logistics → customs
review → shipping → receiving → inventory → claims → ROI analysis.

n8n runs the automation behind the scenes. **The owner interacts primarily
with the Dashboard.**

## System overview

- **Owner Command Center** — every pending `APPROVE_SUPPLIER` /
  `APPROVE_INSPECTION` / `APPROVE_PURCHASE` decision in one place, each card
  showing compatibility/trust/mechanical/fraud scores, landed cost, parts
  value and expected savings, with Approve / Reject / Request more info.
- **Deterministic engines** (`packages/shared`) — compatibility scoring,
  supplier trust scoring, fraud detection, inspection mechanical score,
  best-value quote ranking, landed cost, ROI, the opportunity state machine,
  and the four hard approval gates. AI never performs these calculations —
  see `docs/safety-rules.md`.
- **AI provider abstraction** (`packages/ai`) — one interface over Anthropic
  and OpenAI, used only for language tasks: email/quote extraction, document
  classification, risk explanation, negotiation drafting, report narration.
- **n8n workflows** (`n8n/workflows/*.json`) — 27 real, importable workflows
  covering every pipeline stage, each with a trigger, idempotency check,
  main logic, and a shared error handler. See `n8n/docs/README.md`.
- **Dashboard** (`apps/dashboard`) — Next.js, Arabic by default (also French
  and English), RTL-aware, role-based access (OWNER, PROCUREMENT_MANAGER,
  FINANCE, MECHANIC, LOGISTICS, WAREHOUSE, VIEWER). Every page in the sidebar
  (Dashboard, Owner Command Center, Opportunities, Suppliers, Fleet, RFQs,
  Quotes, Negotiations, Inspections, Purchases, Payments, Donor Trucks,
  Dismantling, Packing, Logistics, Shipments, Customs, Receiving, Warehouse,
  Inventory, Claims, Financial Analytics, Reports, AI Assistant, Audit Log,
  Settings) renders real Postgres data, not a mock.
- **In-app AI assistant** (`/assistant`) — answers questions in Arabic,
  French or English by classifying intent deterministically and retrieving
  the exact matching rows from Postgres; it never guesses an answer outside
  its supported intents (see `packages/shared/src/assistant-intent.ts`).
- **Donor part QR codes** — each part on a donor truck's page gets a
  generated QR code that opens `/parts/[id]`, showing condition, inventory
  status, and full VIN → part → fleet-truck installation traceability.

## Architecture

```
apps/dashboard        Next.js app: auth, all UI pages, /api/* (including
                       /api/internal/* that n8n workflows call)
packages/shared        Deterministic engines + types + state machine (no I/O)
packages/database       Postgres pool, repositories, audit logging
packages/ai             AI provider abstraction (Anthropic/OpenAI) + tasks
packages/integrations   Gmail/Drive/Telegram REST clients, sourcing providers
n8n/workflows           27 importable workflow JSON files
n8n/credentials-example How to configure n8n credentials (no secrets)
n8n/docs                Import order, error-handling pattern, workflow index
database/migrations     13 numbered SQL migrations (59 tables)
database/seeds          Roles + owner user + clearly-marked TEST sample data
docker/                 Dockerfiles for the dashboard and the migration job
docs/                   Safety rules, state machine, sourcing providers
scripts/                migrate.js, seed.js, reset.js, n8n workflow generator
tests/                  Unit tests (packages/shared, n8n JSON validation) + e2e
```

Data flow: n8n triggers/schedules → calls the dashboard's internal API
(`/api/internal/*`) for anything that touches Postgres or a scoring engine →
the dashboard writes Postgres directly for gate decisions the owner makes in
the UI. This keeps all deterministic logic in one place (`packages/shared`)
regardless of whether it was triggered by a cron job or a click.

## Prerequisites

- Node.js ≥ 20, npm ≥ 10
- Docker + Docker Compose v2 (for the full stack) — or a local Postgres 16
  for dashboard-only development
- A Google Cloud project (Gmail + Drive OAuth), a Telegram bot token, and an
  Anthropic and/or OpenAI API key for the integrations you want to use live

## Local installation (without Docker)

```bash
npm install
cp .env.example .env   # fill in DATABASE_URL, SESSION_SECRET at minimum
export $(grep -v '^#' .env | xargs)   # or use a tool like direnv

npm run db:migrate      # applies database/migrations/*.sql
npm run db:seed         # roles + settings + a DEV owner login + TEST sample data

npm run dev             # apps/dashboard on http://localhost:3000
```

`npm run db:seed` is a **development convenience only** — it sets
`SEED_INCLUDE_TEST_DATA=true`, which additionally creates a login
`owner@elbarrayra.test` / `ChangeMe123!`. That password hash is public (it's
in this repository), so this account must never exist outside local
dev/CI — see "How to create the first user" below for the production path,
which never uses a hardcoded password.

## Docker setup

```bash
cp .env.example .env
# Fill in at least: N8N_ENCRYPTION_KEY, N8N_BASIC_AUTH_PASSWORD, SESSION_SECRET
# Generate secrets with: openssl rand -hex 32

docker compose up -d --build
```

This starts: `postgres` (not published to the host — only reachable from
other containers), `redis`, `migrate` (runs migrations once, then exits),
`n8n` (bound to `127.0.0.1:5678`, basic-auth protected), and `dashboard`
(bound to `127.0.0.1:3000`). Put a reverse proxy with HTTPS in front for
anything beyond local access (see "Deployment").

The `migrate` service runs `scripts/seed.js` **without**
`SEED_INCLUDE_TEST_DATA` — it only ever applies production-safe seeds
(roles and configurable engine weights). It never creates the dev owner
login or sample data, so a fresh `docker compose up` deployment starts with
zero user accounts. Create the real first user with
`npm run db:create-owner` (below) before you can sign in.

## Database initialization

Migrations are plain numbered SQL files applied by `scripts/migrate.js`
(tracked in a `schema_migrations` table, safe to re-run):

```bash
npm run db:migrate          # apply pending migrations
npm run db:migrate:status   # show applied vs. pending
npm run db:seed             # DEV ONLY: roles + settings + dev owner login + TEST sample data
npm run db:seed:prod        # production-safe: roles + settings only, no accounts
npm run db:reset            # DROP SCHEMA public CASCADE + re-migrate (dev only!)
```

## n8n import instructions

See `n8n/docs/README.md` for the full workflow index and the exact import
order (WF-027 first, then set up credentials, then WF-001–WF-026, then wire
each workflow's Settings ▸ Error Workflow to WF-027 since n8n cannot resolve
that reference from the JSON file alone).

## Credential setup

Copy `.env.example` to `.env` and fill in real values — see that file for
every variable. Never commit `.env`. For n8n specifically, credentials are
created once in the n8n UI (not in workflow JSON) — see
`n8n/credentials-example/README.md`.

### Google OAuth setup (Gmail + Drive)

1. Google Cloud Console → APIs & Services → Create OAuth client ID (Web application).
2. Enable the Gmail API and Google Drive API for the project.
3. Add scopes: `gmail.send`, `gmail.readonly`, `gmail.modify`, `drive.file`.
4. Run the OAuth consent flow once (e.g. via `n8n`'s built-in OAuth2 helper,
   or Google's OAuth Playground) to obtain a refresh token.
5. Set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN` in `.env`.

### Gmail setup

RFQs and negotiation emails are threaded by `gmail_thread_id` per
opportunity (see `rfqs.gmail_thread_id`, `negotiation_messages.gmail_message_id`).
`packages/integrations/src/gmail/client.ts` sends via the Gmail REST API.

### Drive setup

Documents are filed under `EL BARRAY RA/China Sourcing/<YEAR>/<DONOR_ID>/<NN Category>/`
— see `packages/integrations/src/drive/folder-hierarchy.ts` for the exact,
deterministic 18-category structure and `drive/client.ts` for the REST client.

### Telegram setup

Create a bot via [@BotFather](https://t.me/BotFather), set
`TELEGRAM_BOT_TOKEN`, and set `TELEGRAM_OWNER_CHAT_ID` to the owner's chat ID
(message the bot once, then check `https://api.telegram.org/bot<token>/getUpdates`).

### AI configuration

Set `AI_PROVIDER=anthropic` or `AI_PROVIDER=openai`, plus the matching API
key (`ANTHROPIC_API_KEY` / `OPENAI_API_KEY`). All AI calls go through
`packages/ai/src/factory.ts` — no other file should import a vendor SDK
directly.

## How to create the first user

Production deployments start with zero user accounts (see "Docker setup"
above — the `migrate` service never seeds a login). Create the real OWNER
account with `scripts/create-owner.js`, which requires a real email and a
strong password (≥ 12 characters) and refuses to run twice for the same
email:

```bash
# Local / bare-metal:
OWNER_EMAIL=you@company.com OWNER_PASSWORD='a-strong-unique-password' \
  npm run db:create-owner

# Docker Compose:
docker compose run --rm \
  -e OWNER_EMAIL=you@company.com -e OWNER_PASSWORD='a-strong-unique-password' \
  dashboard node scripts/create-owner.js
```

For local development only, `npm run db:seed` also creates
`owner@elbarrayra.test` / `ChangeMe123!` — that password hash is published
in this repository, so this account must never be reachable from anything
but a local/CI database (see `database/seeds/002_dev_owner_account.sql`).

After first login, change the password by updating `users.password_hash`
with a freshly bcrypt-hashed value (a dedicated "change password" UI is on
the roadmap — see Settings page). To add more users, insert into `users`
and link a row in `user_roles` to one of the seeded `roles`.

## How to add fleet trucks

Dashboard → Fleet → (Add Truck UI ships alongside Phase 2's write APIs) or
directly:

```sql
INSERT INTO fleet_trucks (registration_number, brand, model, configuration, engine_model, gearbox_model, front_axle_model, rear_axle_model, ecu_reference, cabin_generation, hydraulic_system)
VALUES ('12345-A-1', 'SITRAK', 'C7H', '8x4', 'MC13', 'HW19710', 'FAT13', 'STR13-460', 'BOSCH-EDC17', 'GEN2', 'Tipper kit A');
```

This becomes the reference spec the compatibility engine compares
candidate donor trucks against for that model/configuration
(`packages/database/src/repositories/fleet.ts` `getFleetReferenceSpec`).

## How to import workflows

n8n UI → Workflows → Import from File → select each
`n8n/workflows/WF-0NN-*.json`. See `n8n/docs/README.md` for order and the
credential/error-workflow wiring you do once after import.

## How to run tests

```bash
npm test                 # all unit tests (no database required)
DATABASE_URL=postgresql://barray:change-me@localhost:5432/barray_sourcing npm test
                          # also runs the E2E test (tests/e2e), which needs a
                          # migrated + seeded database — the E2E suite
                          # self-skips if DATABASE_URL is unset
```

Covered: compatibility scoring, supplier scoring, fraud detection,
landed-cost calculations, ROI, approval gates, bank-account-change blocking,
opportunity state transitions, inventory movement, the AI assistant's intent
classification and answer formatting, n8n workflow JSON structure (all 27
files), the full `TEST-SITRAK-C7H-001` pipeline end to end (`DISCOVERED` →
... → `CLOSED`), and a SQL regression suite for the assistant's aggregate
queries (`tests/e2e/assistant-queries.test.ts` — guards against fan-out
double-counting when joining a 1-row-per-donor table to a many-rows table).

## How to deploy

Target: a Linux VPS running Docker Compose.

1. `git clone` the repo on the VPS, `cp .env.example .env` and fill in
   production secrets.
2. `docker compose up -d --build`.
3. Put a reverse proxy (Caddy, nginx, or Traefik) in front with a real TLS
   certificate, proxying `/` to `127.0.0.1:3000` (dashboard) and a
   separate subdomain to `127.0.0.1:5678` (n8n, kept behind its own basic
   auth **and** the proxy's auth/IP allowlist — never expose the n8n editor
   publicly without both).
4. Never publish Postgres's port — `docker-compose.yml` already omits a host
   port mapping for it by design.
5. Point DNS, issue certificates (e.g. `certbot` or Caddy's automatic HTTPS),
   and confirm `https://your-domain/login` loads before switching over.

## Backups

- **PostgreSQL**: `docker compose exec postgres pg_dump -U $POSTGRES_USER $POSTGRES_DB | gzip > backup-$(date +%F).sql.gz`,
  scheduled via cron/systemd timer, stored off-box (e.g. encrypted to
  object storage).
- **n8n workflows**: export via n8n's UI ("Download") or CLI
  (`n8n export:workflow --all --output=n8n-backup.json`) after any change;
  also keep `n8n/workflows/*.json` in git as the source of truth.
- **n8n encryption key**: `N8N_ENCRYPTION_KEY` — back this up separately and
  securely; losing it makes existing n8n-stored credentials unrecoverable.
- **Google Drive documents**: covered by Google's own durability; for an
  extra local copy, use `rclone` against the `EL BARRAY RA` Drive folder on
  a schedule.
- **Environment secrets**: keep `.env` in a password manager or secrets
  vault, never in git (already gitignored).

## Restore

1. Provision a fresh VPS/container, deploy the same `docker-compose.yml`.
2. `gunzip -c backup.sql.gz | docker compose exec -T postgres psql -U $POSTGRES_USER $POSTGRES_DB`.
3. Restore `N8N_ENCRYPTION_KEY` into `.env` before starting `n8n` (must match
   the key used when its credentials were encrypted).
4. Re-import n8n workflows if the volume wasn't restored from a Docker
   volume backup: `n8n import:workflow --input=n8n-backup.json`.

## Troubleshooting

- **Migrations fail on a fresh DB**: confirm `DATABASE_URL` points at an
  empty database (or run `npm run db:reset` in dev) — migrations assume a
  clean `public` schema on first run.
- **`next build` fails on `@barray/*` imports**: confirm
  `apps/dashboard/next.config.ts` still lists all four workspace packages
  under `transpilePackages` (they ship as TypeScript source, not prebuilt JS).
  If a package name changes, add it here too — build will not fail in dev
  mode but will error during `next build`.
- **n8n workflow shows "credential not found" after import**: expected —
  the JSON only carries placeholder credential IDs (see
  `n8n/credentials-example/README.md`); select your real credential in each
  node once after import.
- **A sourcing/Gmail/Drive/Telegram call throws `IntegrationNotConfiguredError`**:
  the error message names the exact missing environment variable — set it
  and retry; nothing silently falls back to scraping or fake data.
- **`RELEASE PAYMENT` button is missing**: only `OWNER` and `FINANCE` roles
  can see or use it (`packages/shared/src/approval-gates.ts` `canViewReleasePaymentAction`) — this is intentional, not a bug.

## Final delivery checklist

- [x] `docker compose config` validates the full stack (daemon-dependent
      steps — actually starting containers — require a Docker daemon, which
      this development sandbox does not have; validated instead by running
      Postgres and the dashboard natively, see below)
- [x] PostgreSQL initializes and all 13 migrations apply cleanly and idempotently
- [x] Dashboard loads (`next build` succeeds for all 45 routes; verified live
      with `next start` + curl smoke tests against every sidebar page)
- [x] Authentication works (login, session cookie, RBAC-gated actions and
      views — e.g. Payments hides amounts from non-OWNER/FINANCE roles)
- [x] Seed data loads: `TEST-SITRAK-C7H-001` (fresh, DISCOVERED, used by the
      E2E test) and a second fully-closed demo pipeline (`EBR-CN-001`,
      SITRAK G7) exercising every downstream table — negotiation, inspection,
      all four approval gates, PO, payment, dismantling, packing, freight,
      shipment, a GIR 2(a)-flagged customs record, warehouse inventory with
      an installed part, receiving, and a claim. Idempotent — re-running
      `npm run db:seed` never duplicates rows (regression-tested)
- [x] Every dashboard page works against real data (Opportunities, Suppliers,
      Fleet, RFQs, Quotes, Negotiations, Inspections, Purchases, Payments,
      Donor Trucks + generated part QR codes, Dismantling, Packing,
      Logistics, Shipments, Customs, Receiving, Warehouse, Inventory,
      Claims, Financial Analytics, Reports, AI Assistant, Audit Log, Settings)
- [x] Approval gates work (DB triggers + role checks, unit + e2e tested)
- [x] Scoring engines work (60+ unit tests across all 8 engines)
- [x] n8n workflows import-valid (structural validation test, 189 assertions
      across 27 files — actual import into a running n8n instance requires a
      Docker daemon this sandbox doesn't have; do this once during your first
      `docker compose up`)
- [x] Tests pass (273/273: unit + n8n structure + full E2E pipeline +
      assistant query regression tests)
- [x] Production build succeeds (`next build`, ESLint clean)
- [x] README is complete
