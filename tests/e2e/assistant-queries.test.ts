/**
 * Regression coverage for the AI assistant's retrieval queries
 * (packages/database/src/repositories/assistant.ts) against the seeded
 * full-pipeline demo donor truck. Guards against SQL fan-out bugs — e.g.
 * joining a 1-row-per-donor table (landed_costs) to a many-rows-per-donor
 * table (parts) and summing the 1-row value, which silently multiplies it
 * by the part count.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Client } from "pg";
import { getYtdSavings, getDonorLandedCostByCode } from "../../packages/database/src/repositories/assistant";
import { getLandedCostForDonor } from "../../packages/database/src/repositories/landed-costs";
import { getPool } from "../../packages/database/src/pool";

const hasDb = Boolean(process.env.DATABASE_URL);
const d = hasDb ? describe : describe.skip;

d("assistant retrieval queries (fan-out regression)", () => {
  let client: Client;

  beforeAll(async () => {
    client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();
  });

  afterAll(async () => {
    await client.end();
    await getPool().end();
  });

  it("getYtdSavings does not multiply landed cost by the donor's part count", async () => {
    const { rows } = await client.query(
      `SELECT lc.total_landed_cost, d.id AS donor_id
       FROM landed_costs lc JOIN donor_trucks d ON d.id = lc.donor_id
       WHERE EXTRACT(YEAR FROM lc.calculated_at) = EXTRACT(YEAR FROM now())`,
    );
    expect(rows.length).toBeGreaterThan(0);

    const expectedTotalLandedCost = rows.reduce((sum, r) => sum + Number(r.total_landed_cost), 0);

    const result = await getYtdSavings(new Date().getFullYear());
    expect(Number((result as { total_landed_cost: string }).total_landed_cost)).toBeCloseTo(expectedTotalLandedCost, 2);
  });

  it("getDonorLandedCostByCode returns the exact stored total for one donor", async () => {
    const { rows } = await client.query(`SELECT code FROM donor_trucks LIMIT 1`);
    const donorCode = rows[0].code as string;

    const donorId = (await client.query(`SELECT id FROM donor_trucks WHERE code = $1`, [donorCode])).rows[0].id;
    const direct = await getLandedCostForDonor(donorId);
    const viaAssistant = await getDonorLandedCostByCode(donorCode);

    expect(viaAssistant).not.toBeNull();
    expect((viaAssistant as { total_landed_cost: string }).total_landed_cost).toBe(
      (direct as { total_landed_cost: string }).total_landed_cost,
    );
  });
});
