#!/usr/bin/env node
/**
 * Minimal, dependency-light SQL migration runner.
 * Applies database/migrations/*.sql in filename order inside a transaction each,
 * tracking applied files in a schema_migrations table. Idempotent: re-running
 * skips files already applied.
 *
 * Usage:
 *   node scripts/migrate.js up
 *   node scripts/migrate.js status
 */
const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

const MIGRATIONS_DIR = path.join(__dirname, "..", "database", "migrations");

async function ensureMigrationsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
}

async function getAppliedMigrations(client) {
  const { rows } = await client.query("SELECT filename FROM schema_migrations");
  return new Set(rows.map((r) => r.filename));
}

async function run(cmd) {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await ensureMigrationsTable(client);
    const applied = await getAppliedMigrations(client);
    const files = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith(".sql"))
      .sort();

    if (cmd === "status") {
      for (const f of files) {
        console.log(`${applied.has(f) ? "[applied] " : "[pending] "}${f}`);
      }
      return;
    }

    let appliedCount = 0;
    for (const file of files) {
      if (applied.has(file)) continue;
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), "utf8");
      console.log(`Applying ${file} ...`);
      await client.query("BEGIN");
      try {
        await client.query(sql);
        await client.query("INSERT INTO schema_migrations (filename) VALUES ($1)", [file]);
        await client.query("COMMIT");
        appliedCount++;
      } catch (err) {
        await client.query("ROLLBACK");
        console.error(`Migration failed: ${file}`);
        throw err;
      }
    }
    console.log(appliedCount === 0 ? "Already up to date." : `Applied ${appliedCount} migration(s).`);
  } finally {
    await client.end();
  }
}

const cmd = process.argv[2] || "up";
run(cmd).catch((err) => {
  console.error(err);
  process.exit(1);
});
