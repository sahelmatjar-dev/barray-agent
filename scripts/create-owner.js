#!/usr/bin/env node
/**
 * Production-safe, interactive way to create the first real OWNER user.
 * Unlike the dev-only seed (database/seeds/002_dev_owner_account.sql, which
 * never runs against a production database — see scripts/seed.js), this
 * always prompts the operator for a real name, email, and password; it
 * never accepts a password via environment variable, command-line
 * argument, or file, so the password never ends up in shell history,
 * `docker-compose.yml`, `.env`, process listings, or git.
 *
 * Usage (bare metal):
 *   DATABASE_URL=postgresql://... node scripts/create-owner.js
 *
 * Usage (Docker — see the dedicated `create-owner` compose service):
 *   docker compose run --rm create-owner
 *
 * Prompts for full name, email, and password (entered twice, masked).
 * Refuses a weak password, refuses a duplicate email, and if an OWNER
 * account already exists, asks for explicit y/N confirmation before
 * creating another one.
 *
 * Input handling is hand-rolled rather than built on Node's `readline`
 * module: `readline`'s `question()` can close the interface as soon as
 * stdin hits EOF, discarding any already-buffered lines a *pending*
 * question hasn't consumed yet — which reliably breaks multiple
 * sequential prompts when the input arrives as one piped burst (exactly
 * how this script is exercised non-interactively, e.g. in CI). The reader
 * below buffers raw stdin itself, so it behaves the same whether input
 * trickles in from a real terminal or arrives all at once from a pipe.
 */
const bcrypt = require("bcryptjs");
const { Client } = require("pg");

const MIN_PASSWORD_LENGTH = 12;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function createReader() {
  const isTTY = Boolean(process.stdin.isTTY);
  if (isTTY) process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.setEncoding("utf8");

  let buffer = "";
  let ended = false;
  const waiters = [];

  function drain() {
    while (waiters.length > 0 && (buffer.length > 0 || ended)) {
      const waiter = waiters.shift();
      if (buffer.length > 0) {
        const ch = buffer[0];
        buffer = buffer.slice(1);
        waiter.resolve(ch);
      } else {
        waiter.resolve(null); // EOF, no more input ever coming
      }
    }
  }

  process.stdin.on("data", (chunk) => {
    buffer += chunk.toString();
    drain();
  });
  process.stdin.on("end", () => {
    ended = true;
    drain();
  });

  function nextChar() {
    return new Promise((resolve) => {
      waiters.push({ resolve });
      drain();
    });
  }

  function onInterrupt() {
    if (isTTY) process.stdin.setRawMode(false);
    process.stdout.write("\n");
    process.exit(130);
  }

  async function readLine({ mask = false } = {}) {
    let line = "";
    for (;;) {
      const ch = await nextChar();
      if (ch === null) return line.length > 0 ? line : null; // EOF
      if (ch === "\n") return line;
      if (ch === "\r") continue; // swallow CR, wait for LF (or EOF)
      if (ch === "\u0003") onInterrupt(); // Ctrl-C
      if (ch === "\u007f" || ch === "\b") {
        if (line.length > 0) {
          line = line.slice(0, -1);
          if (isTTY) process.stdout.write("\b \b");
        }
        continue;
      }
      line += ch;
      if (isTTY) process.stdout.write(mask ? "*" : ch);
    }
  }

  function close() {
    if (isTTY) process.stdin.setRawMode(false);
    process.stdin.pause();
  }

  return { readLine, close };
}

async function promptForOwnerDetails(reader) {
  let fullName = null;
  while (!fullName) {
    process.stdout.write("Full name: ");
    fullName = await reader.readLine();
    if (!fullName) console.error("Name cannot be empty.");
  }

  let email = "";
  while (!EMAIL_PATTERN.test(email)) {
    process.stdout.write("Email: ");
    email = (await reader.readLine()) || "";
    if (!EMAIL_PATTERN.test(email)) console.error("Enter a valid email address.");
  }

  let password = "";
  for (;;) {
    process.stdout.write("Password (min 12 characters): ");
    password = (await reader.readLine({ mask: true })) || "";
    if (password.length < MIN_PASSWORD_LENGTH) {
      console.error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      continue;
    }
    process.stdout.write("Confirm password: ");
    const confirmation = (await reader.readLine({ mask: true })) || "";
    if (confirmation !== password) {
      console.error("Passwords did not match. Try again.");
      continue;
    }
    break;
  }

  return { fullName, email, password };
}

async function confirmExtraOwner(reader, existingEmails) {
  console.log(`An OWNER account already exists: ${existingEmails.join(", ")}`);
  process.stdout.write("Create another OWNER account anyway? [y/N]: ");
  const answer = (await reader.readLine()) || "";
  return /^y(es)?$/i.test(answer.trim());
}

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  const reader = createReader();
  try {
    const { rows: existingOwners } = await client.query(
      `SELECT u.email FROM users u
       JOIN user_roles ur ON ur.user_id = u.id
       JOIN roles r ON r.id = ur.role_id
       WHERE r.code = 'OWNER'`,
    );
    if (existingOwners.length > 0) {
      const proceed = await confirmExtraOwner(
        reader,
        existingOwners.map((r) => r.email),
      );
      if (!proceed) {
        console.log("Cancelled. No account was created.");
        return;
      }
    }

    const { fullName, email, password } = await promptForOwnerDetails(reader);

    const { rows: existing } = await client.query("SELECT id FROM users WHERE email = $1", [email]);
    if (existing.length > 0) {
      console.error(`A user with email ${email} already exists. Refusing to overwrite it.`);
      process.exitCode = 1;
      return;
    }

    const { rows: roleRows } = await client.query("SELECT id FROM roles WHERE code = 'OWNER'");
    if (roleRows.length === 0) {
      console.error("No OWNER role found — run `npm run db:migrate && npm run db:seed:prod` first.");
      process.exitCode = 1;
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const { rows } = await client.query(
      `INSERT INTO users (email, full_name, password_hash, locale, status) VALUES ($1, $2, $3, 'ar', 'ACTIVE') RETURNING id`,
      [email, fullName, passwordHash],
    );
    const userId = rows[0].id;
    await client.query("INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)", [userId, roleRows[0].id]);

    console.log(`Created OWNER user ${email}.`);
  } finally {
    reader.close();
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
