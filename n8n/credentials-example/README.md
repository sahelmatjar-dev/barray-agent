# n8n credentials — set these up in the n8n UI, never in workflow JSON

No workflow JSON file in `n8n/workflows/` contains a real credential. Every
Postgres/Gmail/Drive/Telegram/HTTP node references a **named credential** by
a placeholder ID (`PLACEHOLDER_POSTGRES_CRED`, etc.) that n8n cannot resolve
until you create the real credential locally and repoint each node at it
(n8n → node → Credential dropdown → select your credential; do this once per
credential type, n8n reuses it across all workflows that reference the same
name).

## 1. Barray Postgres

- Type: **Postgres**
- Host: `postgres` (the compose service name) or your DB host
- Database: value of `POSTGRES_DB`
- User / Password: value of `POSTGRES_USER` / `POSTGRES_PASSWORD`
- Port: `5432`
- SSL: disable for the bundled compose network; enable for a managed/remote Postgres

## 2. Barray Gmail (OAuth2)

- Type: **Gmail OAuth2 API**
- Follow n8n's "Connect using OAuth2" flow with the `GOOGLE_CLIENT_ID` /
  `GOOGLE_CLIENT_SECRET` from your `.env` (see README.md "Google OAuth setup")
- Scopes needed: `gmail.send`, `gmail.readonly`, `gmail.modify` (for thread labeling)

## 3. Barray Google Drive

- Type: **Google Drive OAuth2 API**
- Same Google Cloud OAuth client as Gmail; scope: `drive.file`
- Used to build the `EL BARRAY RA/China Sourcing/YEAR/DONOR_ID/...` hierarchy
  (see `packages/integrations/src/drive/folder-hierarchy.ts`)

## 4. Barray Telegram Bot

- Type: **Telegram API**
- Access Token: value of `TELEGRAM_BOT_TOKEN` (create the bot via @BotFather)
- Used for owner alerts (ETA slip, CRITICAL fraud freeze, pending approvals)

## 5. Barray Dashboard API (HTTP Header Auth)

- Type: **Header Auth**
- Header name: `Authorization`
- Header value: `Bearer <a long-lived service token — see README "Credential setup">`
- Used by every `httpRequest` node that calls into `apps/dashboard`'s
  internal API (`/api/internal/*`), which is the only place allowed to run
  the deterministic @barray/shared engines against Postgres.

## Never commit real values

This directory intentionally contains no `.json` credential exports. If you
export credentials from an n8n instance for backup, encrypt the file and
store it outside git (see README.md "Backups").
