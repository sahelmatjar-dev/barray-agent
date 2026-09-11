#!/usr/bin/env node
/** Drops and recreates the public schema, then re-applies all migrations. Local/dev use only. */
const { Client } = require("pg");
const { execSync } = require("child_process");

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  await client.query("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
  await client.end();
  execSync("node " + __dirname + "/migrate.js up", { stdio: "inherit" });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
