#!/usr/bin/env node
/** Applies database/seeds/*.sql in order. Safe to re-run (uses ON CONFLICT DO NOTHING). */
const fs = require("fs");
const path = require("path");
const { Client } = require("pg");

const SEEDS_DIR = path.join(__dirname, "..", "database", "seeds");

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    const files = fs.readdirSync(SEEDS_DIR).filter((f) => f.endsWith(".sql")).sort();
    for (const file of files) {
      console.log(`Seeding ${file} ...`);
      const sql = fs.readFileSync(path.join(SEEDS_DIR, file), "utf8");
      await client.query(sql);
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
