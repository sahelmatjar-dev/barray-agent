#!/usr/bin/env node
/**
 * Fails CI loudly, before lint/typecheck/tests run, if the test environment
 * is missing what the app actually requires to boot (see apps/dashboard/src/lib/session.ts,
 * internal-auth.ts). Every value here is a CI-only placeholder, never a real
 * secret — see .env.example for what a real deployment must set instead.
 *
 * Deliberately does NOT require AI/Google/Telegram/sourcing-connector
 * credentials: those integrations must run in their "not configured" mode
 * during CI (see packages/integrations/src/errors.ts,
 * IntegrationNotConfiguredError) rather than being faked as present.
 */
const REQUIRED = [
  { name: "DATABASE_URL", validate: (v) => v.startsWith("postgresql://"), hint: "must be a postgresql:// connection string" },
  { name: "SESSION_SECRET", validate: (v) => v.length >= 32, hint: "must be at least 32 characters (see lib/session.ts)" },
  { name: "INTERNAL_API_TOKEN", validate: (v) => v.length >= 16, hint: "must be at least 16 characters" },
  { name: "APP_BASE_URL", validate: (v) => v.startsWith("http://") || v.startsWith("https://"), hint: "must be a URL" },
];

const FORBIDDEN_IN_CI = [
  "ANTHROPIC_API_KEY",
  "OPENAI_API_KEY",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "GOOGLE_REFRESH_TOKEN",
  "TELEGRAM_BOT_TOKEN",
  "ALIBABA_API_KEY",
  "MADE_IN_CHINA_API_KEY",
];

let failed = false;

for (const { name, validate, hint } of REQUIRED) {
  const value = process.env[name];
  if (!value) {
    console.error(`[check-env] Missing required test environment variable: ${name} (${hint})`);
    failed = true;
    continue;
  }
  if (!validate(value)) {
    console.error(`[check-env] Invalid ${name}: ${hint}`);
    failed = true;
  }
}

const leaked = FORBIDDEN_IN_CI.filter((name) => Boolean(process.env[name]));
if (leaked.length > 0) {
  console.error(
    `[check-env] Real integration credentials must never be set in CI: ${leaked.join(", ")}. ` +
      "These integrations must run in their explicit not-configured mode in CI (IntegrationNotConfiguredError), never mocked as present.",
  );
  failed = true;
}

if (failed) {
  process.exit(1);
}

console.log("[check-env] All required test environment variables are present and valid; no production integration credentials are set.");
