# Production Readiness & Security Audit

**Date:** 2026-09-12
**Scope:** Full repository — database migrations, `packages/*`, `apps/dashboard`,
`n8n/workflows/*`, Docker/Docker Compose, and dependency security.
**Method:** Every check below was actually executed against this codebase in
this session (not inferred from reading code) — commands and results are
reproduced under each section. Every fix was verified live after applying it,
not just by re-reading the diff.

## Verdict

**Conditionally production-ready.** All critical and high-severity issues
found during this audit have been fixed and re-verified. The system may be
deployed to production **once the operator completes the pre-deployment
checklist below** (real secrets, real credentials, a real first user created
via `scripts/create-owner.js` — never the seeded dev account). No known
critical or high-severity issue remains open.

This verdict does not certify the business logic is bug-free or that every
edge case is handled — it certifies that the standard production-readiness
and security checks below pass, and that the specific issues this audit
found are fixed.

---

## 1. Checks executed

| Check | Command | Result |
|---|---|---|
| Migrations from scratch | `DROP DATABASE` + `npm run db:migrate` | ✅ All 14 migrations apply cleanly, 0 errors |
| Migration idempotency | `npm run db:migrate` run twice | ✅ Second run: "Already up to date" |
| Seed idempotency | `npm run db:seed` run twice | ✅ Row counts identical after re-run |
| Seed production-safety | `node scripts/seed.js` (no test-data flag) | ✅ 0 user accounts created, only roles/settings |
| Unit + integration tests | `npx vitest run` | ✅ 285/285 passing (22 test files) |
| n8n workflow JSON validity | `node -e "JSON.parse(...)"` on all 27 files | ✅ All valid JSON |
| n8n structural validation | `tests/unit/n8n-workflows.test.ts` | ✅ 189/189 assertions passing |
| Lint | `npx eslint .` (apps/dashboard) | ✅ 0 errors, 0 warnings |
| Typecheck | `next build` + standalone `tsc --noEmit` per package | ✅ Clean for `apps/dashboard` and all 4 `packages/*` |
| Production build | `next build` | ✅ All 60 routes compile, static pages generated |
| Docker Compose validation | `docker compose config` | ✅ Valid; required secrets (`N8N_ENCRYPTION_KEY`, `N8N_BASIC_AUTH_PASSWORD`, `SESSION_SECRET`) correctly fail the build when unset — no silent empty-secret fallback |
| Dependency audit | `npm audit` | ✅ 0 vulnerabilities (was 5: 1 critical, 1 high, 3 moderate — see finding #6) |

Docker images themselves were **not** built or run in this sandbox — no
Docker daemon is available here (`docker ps` fails with
`connect: no such file or directory`). `docker compose config` (pure
YAML/interpolation validation, no daemon required) passed. The Dockerfiles
were reviewed by hand and fixed where issues were found (#3, #7). **Building
and running the images on a real Docker host is a required step before
go-live** — see the pre-deployment checklist.

---

## 2. Findings and fixes

### Critical

**#1 — Hardcoded fallback session-signing secret.**
`apps/dashboard/src/lib/session.ts` signed and verified session JWTs with
`process.env.SESSION_SECRET || "dev-only-insecure-secret-change-me"`. That
fallback string is public (it's in this repository's git history). Any
deployment that forgot to set `SESSION_SECRET` would silently accept it,
letting anyone who read the source forge a valid session for **any user,
including OWNER** — a full authentication bypass.
*Fix:* removed the fallback. The app now throws (fails closed) if
`SESSION_SECRET` is unset or shorter than 32 characters; login and every
session check fail with a 500/redirect instead of accepting a guessable
secret. Verified live: a short/missing secret makes login return 500 with no
session cookie set; a proper ≥32-char secret logs in normally.

**#2 — Default admin account auto-seeded into every deployment.**
`docker-compose.yml`'s `migrate` service ran `scripts/seed.js`
unconditionally, which created `owner@elbarrayra.test` with a password
(`ChangeMe123!`) whose bcrypt hash is committed to this repository — i.e.
publicly known. Every `docker compose up` deployment got a working,
Internet-guessable OWNER login unless an operator remembered to change it,
with no forcing mechanism.
*Fix:* split the seed data. `database/seeds/001_roles_and_settings.sql`
(roles + configurable weights, no accounts) always runs.
`002_dev_owner_account.sql`, `003_test_sample_data.sql`, and
`004_full_pipeline_demo.sql` are skipped by `scripts/seed.js` unless
`SEED_INCLUDE_TEST_DATA=true` is explicitly set — which
`docker-compose.yml`'s `migrate` service never sets. `npm run db:seed` (the
documented **local development** command) sets that flag itself, so local
dev/CI workflows are unaffected. Added `scripts/create-owner.js` — the
production path — which requires a real email and a ≥12-character password,
hashes it with bcrypt, and refuses to run twice for the same email. Added a
regression test (`tests/unit/seed-gating.test.ts`) asserting no
production-path seed file inserts into `users`. Verified live: a fresh
`node scripts/seed.js` (no flag) creates 0 users; `create-owner.js` correctly
rejects a short password, rejects a missing email, succeeds with a real one,
and refuses a duplicate.

**#3 — No `.dockerignore`.**
`docker/dashboard.Dockerfile`'s build stage runs `COPY . .` against the full
build context. With no `.dockerignore`, a build run on a machine that has a
local `.env` (with real production secrets) or a large `.git` history would
bake both directly into an image layer — recoverable from the image even if
a later layer "removes" the file, since Docker layers are immutable.
*Fix:* added `.dockerignore` excluding `.env*` (keeping only `.env.example`),
`.git`, `node_modules`, `.next`, `dist`, and other local-only artifacts.

### High

**#4 — No brute-force protection on `/api/auth/login`.**
The login endpoint had no attempt limiting — unlimited password guesses per
second against any account.
*Fix:* added an in-process sliding-window rate limiter
(`apps/dashboard/src/lib/rate-limit.ts`, unit-tested) keyed on IP+email: 10
attempts per 5 minutes, returning `429` with `Retry-After` once exceeded.
Verified live: attempts 1–10 return 401 (wrong password), attempt 11 returns
429, and a *correct* password on the 11th attempt is also correctly blocked
(a rate limiter that only blocks wrong guesses isn't a rate limiter). This is
process-local, which matches the current single-`dashboard`-instance
docker-compose topology — see "Residual limitations" if this is ever
horizontally scaled.

**#5 — No security response headers.**
`next.config.ts` set no `Content-Security-Policy`, `X-Frame-Options`,
`X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, or
`Strict-Transport-Security` — a fully open target for clickjacking,
MIME-sniffing, and third-party script/frame injection if any injection
vector were ever found elsewhere.
*Fix:* added all of the above via `next.config.ts`'s `headers()`. The CSP is
a pragmatic default (`'unsafe-inline'` for `script-src`/`style-src`, since
there's no per-request nonce wiring — see "Residual limitations") but still
sets `default-src 'self'`, `frame-ancestors 'none'`, `img-src 'self' data:`
(required for the base64 QR code images on the Donor Trucks page), and
`connect-src 'self'`. Verified live: headers present on every response;
login, dashboard rendering, the QR-code image, and the AI assistant's
`fetch` calls all still work correctly with the new CSP in place.

**#6 — 5 dependency vulnerabilities (1 critical, 1 high, 3 moderate).**
`npm audit` reported a critical advisory in `vitest`/`vite` and a high one in
`vite` itself (both rooted in an `esbuild` dev-server request-smuggling
issue), reachable only through the `vitest@2.1.9` dependency chain.
*Fix:* upgraded `vitest` 2→5 at the root and in `packages/shared` (the only
two places declaring it), which pulls a patched `vite`. Required a clean
`node_modules`/`package-lock.json` reinstall to resolve (a stale partial
install produced a spurious peer-conflict). `npm audit` now reports 0
vulnerabilities. All 285 tests re-verified passing on vitest 5; `next build`
and `eslint` re-verified unaffected (vitest is a dev-only dependency, never
part of the production Docker image).

### Medium

**#7 — `migrate` container ran as root.** Fixed: `docker/migrate.Dockerfile`
now creates and runs as an unprivileged `migrate` user, matching the
dashboard image's existing non-root `nextjs` user.

**#8 — Internal API token compared with `!==` (non-constant-time).**
`assertInternalApiAuth` compared the `Authorization` header to the expected
Bearer token with plain string inequality, which returns as soon as the
first differing byte is found — a theoretical timing side-channel. Fixed
with `crypto.timingSafeEqual`, including an equal-length dummy comparison on
length mismatch so the length check itself doesn't leak via timing.
Re-verified live: internal endpoints still authenticate correctly with the
right token and correctly reject the wrong one.

**#9 — `packages/database`, `packages/ai`, `packages/integrations` had no
standalone `tsconfig.json`.** They were only ever typechecked transitively
through `apps/dashboard`'s build, so any exported function not actually
imported by the dashboard would never be typechecked. Added a
`tsconfig.json` to each (mirroring `packages/shared`'s) and ran
`tsc --noEmit` on all four independently — all clean, confirming no
previously-untypechecked dead code.

---

## 3. Verified secure (no fix needed)

- **SQL injection:** every database call in `packages/database` uses
  parameterized queries (`$1`, `$2`, …); grepped the entire package for
  template-literal SQL construction from external input — none found. The
  only dynamic-identifier SQL (sequence names in the auto-code triggers) is
  built from `to_char(now(), 'YYYY')`, not user input.
- **XSS:** no `dangerouslySetInnerHTML` anywhere in `apps/dashboard`; all
  rendered data goes through React's default escaping.
- **Authorization coverage:** every API route under `apps/dashboard/src/app/api`
  checks either the user session (`getSession()`) or the internal Bearer
  token (`assertInternalApiAuth`), with the sole (correct) exceptions of
  `/api/auth/login` and `/api/auth/logout` themselves. `middleware.ts`
  default-denies every page route not explicitly listed as public.
- **Session cookie:** `httpOnly`, `secure` in production, `sameSite: "lax"`
  (blocks cross-site state-changing requests to our POST/PATCH endpoints).
- **CORS:** no `Access-Control-Allow-Origin` set anywhere — same-origin only
  by default.
- **Secrets hygiene:** no API keys/tokens found hardcoded in source; `.env`
  is gitignored and (after fix #3) dockerignored; `.env.example` contains
  only placeholders.
- **Network exposure:** `docker-compose.yml` never publishes Postgres or
  Redis to the host (`expose` only, no `ports`); n8n's editor is bound to
  `127.0.0.1` and requires basic auth; the dashboard is bound to
  `127.0.0.1` (a reverse proxy is required for remote access, per README).
- **n8n workflow files:** none of the 27 workflow JSON files embed a real
  credential — every `credentials` block uses a `PLACEHOLDER_*` id (enforced
  by `tests/unit/n8n-workflows.test.ts`).
- **Approval-gate enforcement:** defense-in-depth confirmed at both layers —
  `packages/shared/src/approval-gates.ts` (role check) and the
  `enforce_po_approval_gate` / `enforce_payment_release_gate` Postgres
  triggers (independent re-check at the database level).
- **Audit logging:** supplier approval, inspection approval, purchase
  approval, payment release, bank-account changes, and customs verification
  all write an `audit_logs` row.

## 4. Residual limitations (non-blocking, recommended follow-ups)

These are documented tradeoffs, not defects that block production use of
this system as currently scoped:

- **CSP allows `'unsafe-inline'`** for scripts/styles. A stricter
  nonce-based CSP is possible with Next.js middleware but requires wiring a
  per-request nonce through every page — a larger change than this audit's
  scope. Current CSP still blocks third-party origins and all framing.
- **Rate limiting is in-process**, not shared across instances. Correct for
  the current single-`dashboard`-container topology in `docker-compose.yml`.
  If this is ever horizontally scaled behind a load balancer, move the
  counter store to the `redis` service (already provisioned but not yet
  used by the app) so limits are shared.
- **No "change password" UI yet** (already noted in the main README's
  roadmap) — an OWNER must update `users.password_hash` directly (with a
  freshly bcrypt-hashed value) to rotate a password today.
- **A few authenticated, user-facing routes surface `err.message` from a
  failed external call** (e.g. a Gmail send failure) directly in the JSON
  error response. The caller is always an already-authenticated dashboard
  user, so this is low-severity information disclosure at most, not an
  access-control issue — tightening it to a generic message plus
  server-side logging is a reasonable follow-up.
- **File upload validation** (mentioned in the original security
  requirements) has no dedicated code path yet because no file-upload
  feature is implemented — documents are referenced via `drive_file_id`
  from Google Drive, not uploaded through the app directly. Not a
  vulnerability today, but any future direct-upload feature must validate
  file type/size before this claim can be considered met.
- **Docker images were not built/run in this sandbox** (no Docker daemon
  available here). `docker compose config` validates syntax and required
  variables, but an actual `docker compose up --build` on a real Docker
  host is a required pre-go-live step — see the checklist below.

## 5. Pre-deployment checklist

Complete every item before exposing this system to real traffic:

- [ ] Copy `.env.example` to `.env` and fill in **real, unique** values for
      `SESSION_SECRET`, `INTERNAL_API_TOKEN`, `N8N_ENCRYPTION_KEY`,
      `N8N_BASIC_AUTH_PASSWORD`, `POSTGRES_PASSWORD` (all ≥32 random
      characters — `openssl rand -hex 32`).
- [ ] Run `docker compose up -d --build` on the real target host and confirm
      all services report healthy (`docker compose ps`).
- [ ] Create the real OWNER account with `scripts/create-owner.js` (see
      README "How to create the first user"). **Never** enable
      `SEED_INCLUDE_TEST_DATA` against a production database.
- [ ] Put a reverse proxy with a real TLS certificate in front of the
      dashboard and n8n; do not expose either directly.
- [ ] Fill in real `ANTHROPIC_API_KEY`/`OPENAI_API_KEY`, Google OAuth
      credentials, and `TELEGRAM_BOT_TOKEN` for the integrations you intend
      to use live; leave the rest unset (they fail loudly and safely when
      not configured — verified in this audit and in the original build).
- [ ] Import the 27 n8n workflows and wire each one's Settings ▸ Error
      Workflow to the imported WF-027, per `n8n/docs/README.md`.
- [ ] Set up the backup strategy in the README ("Backups") before real data
      accumulates.
- [ ] Re-run this audit's checklist (tests, build, `docker compose config`,
      `npm audit`) after any further dependency or infrastructure change.

## 6. Sign-off

All checks in Section 1 were executed against the current commit in this
session and passed. All critical and high findings in Section 2 are fixed
and re-verified live. No critical or high-severity issue is known to remain
open. This audit does not itself constitute deployment — it clears the code
for deployment once the checklist in Section 5 is completed by the operator.
