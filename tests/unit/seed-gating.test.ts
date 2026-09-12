import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const SEEDS_DIR = path.join(__dirname, "..", "..", "database", "seeds");
const NON_PRODUCTION_PATTERN = /dev|test|demo/i;

/**
 * Regression guard for a critical production-safety property: no seed file
 * that creates a login-capable account may run against a production
 * database by default. scripts/seed.js enforces this by skipping any file
 * matching NON_PRODUCTION_PATTERN unless SEED_INCLUDE_TEST_DATA=true.
 */
describe("seed file production safety", () => {
  const files = fs.readdirSync(SEEDS_DIR).filter((f) => f.endsWith(".sql"));

  it("has at least one seed file that ships in production (roles/settings)", () => {
    const productionFiles = files.filter((f) => !NON_PRODUCTION_PATTERN.test(f));
    expect(productionFiles.length).toBeGreaterThan(0);
  });

  it("no production (non dev/test/demo) seed file inserts into the users table", () => {
    const productionFiles = files.filter((f) => !NON_PRODUCTION_PATTERN.test(f));
    for (const file of productionFiles) {
      const sql = fs.readFileSync(path.join(SEEDS_DIR, file), "utf8");
      expect(sql, `${file} must not create user accounts — it runs in production`).not.toMatch(/INSERT INTO users/i);
    }
  });

  it("the dev owner account file is excluded from the default (production) seed run", () => {
    const devOwnerFile = files.find((f) => /dev.*owner/i.test(f));
    expect(devOwnerFile, "expected a dev-only owner account seed file to exist").toBeTruthy();
    expect(NON_PRODUCTION_PATTERN.test(devOwnerFile!)).toBe(true);
  });
});
