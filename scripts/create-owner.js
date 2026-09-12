#!/usr/bin/env node
/**
 * Production-safe way to create the first real OWNER user. Unlike the
 * dev-only seed (database/seeds/002_dev_owner_account.sql, which never runs
 * against a production database — see scripts/seed.js), this always
 * requires the operator to supply a real email and a strong password; it
 * never uses a hardcoded default.
 *
 * Usage:
 *   OWNER_EMAIL=you@company.com OWNER_PASSWORD='a-strong-password' \
 *     node scripts/create-owner.js
 *
 * Refuses to run with a weak password, and refuses to create a second
 * account for the same email (use the dashboard to manage users afterward).
 */
const bcrypt = require("bcryptjs");
const { Client } = require("pg");

const MIN_PASSWORD_LENGTH = 12;

async function main() {
  const email = process.env.OWNER_EMAIL;
  const password = process.env.OWNER_PASSWORD;
  const fullName = process.env.OWNER_NAME || "Owner";

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    console.error("Set OWNER_EMAIL to a valid email address.");
    process.exit(1);
  }
  if (!password || password.length < MIN_PASSWORD_LENGTH) {
    console.error(`Set OWNER_PASSWORD to a string of at least ${MIN_PASSWORD_LENGTH} characters.`);
    process.exit(1);
  }

  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    const { rows: existing } = await client.query("SELECT id FROM users WHERE email = $1", [email]);
    if (existing.length > 0) {
      console.error(`A user with email ${email} already exists. Refusing to overwrite it.`);
      process.exit(1);
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const { rows } = await client.query(
      `INSERT INTO users (email, full_name, password_hash, locale, status) VALUES ($1, $2, $3, 'ar', 'ACTIVE') RETURNING id`,
      [email, fullName, passwordHash],
    );
    const userId = rows[0].id;

    const { rows: roleRows } = await client.query("SELECT id FROM roles WHERE code = 'OWNER'");
    if (roleRows.length === 0) {
      console.error("No OWNER role found — run `npm run db:migrate && npm run db:seed:prod` first.");
      process.exit(1);
    }
    await client.query("INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)", [userId, roleRows[0].id]);

    console.log(`Created OWNER user ${email}.`);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
