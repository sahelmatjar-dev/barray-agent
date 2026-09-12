#!/usr/bin/env node
/**
 * Applies database/seeds/*.sql in order. Safe to re-run (every seed file is
 * idempotent — ON CONFLICT DO NOTHING or an explicit existence guard).
 *
 * Production safety: any seed file whose name contains "dev", "test", or
 * "demo" (case-insensitive) creates non-production data — sample suppliers,
 * a default login with a password published in this repo, etc. Those files
 * are SKIPPED unless SEED_INCLUDE_TEST_DATA=true is explicitly set. This is
 * what keeps `docker compose up` (which runs this script without that
 * variable) from ever creating a default OWNER account with a known
 * password on a production deployment.
 *
 * Local development and the test suite need that data, so
 * `npm run db:seed` sets SEED_INCLUDE_TEST_DATA=true itself — see
 * package.json.
 */
const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

const SEEDS_DIR = path.join(__dirname, "..", "database", "seeds");
const NON_PRODUCTION_PATTERN = /dev|test|demo/i;
const includeTestData = process.env.SEED_INCLUDE_TEST_DATA === "true";

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    const allFiles = fs.readdirSync(SEEDS_DIR).filter((f) => f.endsWith(".sql")).sort();
    const files = includeTestData ? allFiles : allFiles.filter((f) => !NON_PRODUCTION_PATTERN.test(f));
    const skipped = allFiles.filter((f) => !files.includes(f));

    for (const file of files) {
      console.log(`Seeding ${file} ...`);
      const sql = fs.readFileSync(path.join(SEEDS_DIR, file), "utf8");
      await client.query(sql);
    }
    if (skipped.length > 0) {
      console.log(`Skipped (non-production data, set SEED_INCLUDE_TEST_DATA=true to include): ${skipped.join(", ")}`);
    }
    console.log(`Seeded ${files.length} file(s).`);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
