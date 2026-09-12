#!/usr/bin/env node
/**
 * Sanity-checks that `npm run db:seed` actually loaded the data the rest of
 * CI (and the local dev workflow) depends on. Run against the same
 * DATABASE_URL the migrate/seed steps just used.
 */
const { Client } = require("pg");

const EXPECTED_ROLE_CODES = ["OWNER", "PROCUREMENT_MANAGER", "FINANCE", "MECHANIC", "LOGISTICS", "WAREHOUSE", "VIEWER"];

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    const { rows: roleRows } = await client.query("SELECT code FROM roles ORDER BY code");
    const roleCodes = roleRows.map((r) => r.code).sort();
    assertEqual("roles", roleCodes, [...EXPECTED_ROLE_CODES].sort());

    const { rows: userRows } = await client.query("SELECT count(*)::int AS n FROM users");
    assert(userRows[0].n >= 1, `expected at least 1 seeded user, found ${userRows[0].n}`);

    const { rows: oppRows } = await client.query(
      "SELECT code, status FROM opportunities WHERE listing_url = $1",
      ["https://example-test-listing.invalid/TEST-SITRAK-C7H-001"],
    );
    assert(oppRows.length === 1, 'expected seeded opportunity "TEST-SITRAK-C7H-001" to exist');

    const { rows: settingRows } = await client.query("SELECT count(*)::int AS n FROM system_settings");
    assert(settingRows[0].n >= 5, `expected at least 5 seeded system_settings rows, found ${settingRows[0].n}`);

    console.log("[validate-seed] Seed data looks correct: roles, users, TEST-SITRAK-C7H-001 opportunity, and system_settings are all present.");
  } finally {
    await client.end();
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(`[validate-seed] ${message}`);
}

function assertEqual(label, actual, expected) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  assert(a === e, `${label} mismatch: expected ${e}, got ${a}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
