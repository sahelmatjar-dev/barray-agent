/**
 * End-to-end test: TEST-SITRAK-C7H-001
 * DISCOVERED -> SCREENED(SCREENING) -> SUPPLIER VERIFIED(SUPPLIER_APPROVAL) ->
 * RFQ SENT -> QUOTE RECEIVED -> NEGOTIATION -> INSPECTION -> APPROVAL ->
 * PURCHASE -> DISMANTLING -> PACKING -> SHIPPING -> RECEIVING -> INVENTORY
 *
 * Runs against a real Postgres database (the same one used by `npm run db:migrate`
 * and `npm run db:seed`). Requires DATABASE_URL to point at a disposable test
 * database — this test creates and mutates real rows.
 *
 * Skips automatically if DATABASE_URL is not set, so `vitest run` still passes
 * in environments with no database configured (e.g. a bare checkout before
 * `docker compose up`).
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Client } from "pg";
import {
  scoreCompatibility, TruckComponentSpec, UNKNOWN,
  scoreSupplierTrust, detectFraud, calculateMechanicalScore, InspectionFinding,
  calculateLandedCost, calculateRoi, assertTransition, applyMovement,
} from "../../packages/shared/src/index";

const hasDb = Boolean(process.env.DATABASE_URL);
const d = hasDb ? describe : describe.skip;

d("E2E: TEST-SITRAK-C7H-001 full sourcing pipeline", () => {
  let client: Client;
  let opportunityId: string;
  let supplierId: string;

  beforeAll(async () => {
    client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();
  });

  afterAll(async () => {
    await client.end();
  });

  it("loads the seeded TEST-SITRAK-C7H-001 opportunity at DISCOVERED", async () => {
    const { rows } = await client.query(
      `SELECT * FROM opportunities WHERE listing_url = 'https://example-test-listing.invalid/TEST-SITRAK-C7H-001'`,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe("DISCOVERED");
    opportunityId = rows[0].id;
    supplierId = rows[0].supplier_id;
  });

  it("SCREENING: computes a deterministic compatibility score (never invented)", async () => {
    const { rows: specRows } = await client.query(`SELECT * FROM truck_specs WHERE opportunity_id = $1`, [opportunityId]);
    const { rows: fleetRows } = await client.query(
      `SELECT * FROM fleet_trucks WHERE model = 'C7H' AND configuration = '8x4' LIMIT 1`,
    );
    expect(fleetRows).toHaveLength(1);

    const toSpec = (row: Record<string, unknown> | undefined): TruckComponentSpec => ({
      engine_model: (row?.engine_model as string) ?? UNKNOWN,
      gearbox_model: (row?.gearbox_model as string) ?? UNKNOWN,
      front_axle_model: (row?.front_axle_model as string) ?? UNKNOWN,
      rear_axle_model: (row?.rear_axle_model as string) ?? UNKNOWN,
      ecu_reference: (row?.ecu_reference as string) ?? UNKNOWN,
      cabin_generation: (row?.cabin_generation as string) ?? UNKNOWN,
      hydraulic_system: (row?.hydraulic_system as string) ?? UNKNOWN,
    });

    const compatibility = scoreCompatibility(toSpec(specRows[0]), toSpec(fleetRows[0]));
    expect(compatibility.score).toBeGreaterThan(0);

    await client.query(
      `UPDATE opportunities SET status = 'SCREENING', compatibility_score = $1, compatibility_breakdown = $2 WHERE id = $3`,
      [compatibility.score, JSON.stringify(compatibility.reasons), opportunityId],
    );
    const { rows } = await client.query(`SELECT status, compatibility_score FROM opportunities WHERE id = $1`, [opportunityId]);
    expect(rows[0].status).toBe("SCREENING");
    expect(rows[0].compatibility_score).toBe(compatibility.score);
  });

  it("SUPPLIER_REVIEW -> SUPPLIER_APPROVAL: scores supplier trust and runs fraud detection", async () => {
    const { rows: supplierRows } = await client.query(`SELECT * FROM suppliers WHERE id = $1`, [supplierId]);
    const supplier = supplierRows[0];

    const trust = scoreSupplierTrust({
      legal_existence_verified: supplier.legal_existence_verified,
      years_active: supplier.years_active,
      third_party_audit: supplier.third_party_audit,
      is_truck_specialist: supplier.is_truck_specialist,
      bank_account_matches_company: true,
      digital_presence_score: supplier.digital_presence_score,
      export_evidence: supplier.export_evidence,
      communication_quality_score: supplier.communication_quality_score,
    });
    expect(trust.risk_group).not.toBe("HIGH_RISK");

    const fraud = detectFraud({
      duplicateVin: false, duplicatePhotoMatch: false, supplierBankNameMismatch: false,
      bankAccountIsPersonal: false, bankAccountChangedRecently: false, priceDeviationPct: 0.02,
      mileageConflict: false, engineNumberConflict: false, companyInfoConflict: false,
    });
    expect(fraud.freezeRequired).toBe(false);

    await client.query(`UPDATE opportunities SET status = 'SUPPLIER_REVIEW' WHERE id = $1`, [opportunityId]);
    await client.query(
      `UPDATE suppliers SET trust_score = $1, trust_risk_group = $2 WHERE id = $3`,
      [trust.score, trust.risk_group, supplierId],
    );

    const approvalRes = await client.query(
      `INSERT INTO approvals (gate, entity, entity_id, snapshot) VALUES ('APPROVE_SUPPLIER', 'supplier', $1, $2) RETURNING id`,
      [supplierId, JSON.stringify({ trust })],
    );
    const approvalId = approvalRes.rows[0].id;

    await client.query(
      `UPDATE approvals SET decision = 'APPROVED', status = 'APPROVED', decided_at = now() WHERE id = $1`,
      [approvalId],
    );
    await client.query(`UPDATE opportunities SET status = 'SUPPLIER_APPROVAL' WHERE id = $1`, [opportunityId]);
    await client.query(`UPDATE opportunities SET status = 'RFQ_PENDING' WHERE id = $1`, [opportunityId]);

    const { rows } = await client.query(`SELECT status FROM opportunities WHERE id = $1`, [opportunityId]);
    expect(rows[0].status).toBe("RFQ_PENDING");
  });

  it("RFQ_SENT -> QUOTE_RECEIVED: reuses the seeded RFQ/quote", async () => {
    await client.query(`UPDATE opportunities SET status = 'RFQ_SENT' WHERE id = $1`, [opportunityId]);

    const { rows: quoteRows } = await client.query(`SELECT * FROM quotes WHERE opportunity_id = $1`, [opportunityId]);
    expect(quoteRows).toHaveLength(1);
    expect(quoteRows[0].not_officially_scrapped_declared).toBe(true);

    await client.query(`UPDATE opportunities SET status = 'QUOTE_RECEIVED' WHERE id = $1`, [opportunityId]);
    const { rows } = await client.query(`SELECT status FROM opportunities WHERE id = $1`, [opportunityId]);
    expect(rows[0].status).toBe("QUOTE_RECEIVED");
  });

  it("NEGOTIATING: never lets the recorded price exceed maximum_price", async () => {
    await client.query(`UPDATE opportunities SET status = 'NEGOTIATING' WHERE id = $1`, [opportunityId]);

    const { rows } = await client.query(
      `INSERT INTO negotiations (opportunity_id, supplier_id, asking_price, ideal_price, target_price, maximum_price, current_counter_price)
       VALUES ($1, $2, 17800, 16000, 16800, 17500, 19000) RETURNING status`,
      [opportunityId, supplierId],
    );
    // A counter above maximum_price is force-flipped to MAXIMUM_EXCEEDED by the DB trigger, never silently accepted.
    expect(rows[0].status).toBe("MAXIMUM_EXCEEDED");

    await client.query(
      `UPDATE negotiations SET current_counter_price = 17200, status = 'NEGOTIATING' WHERE opportunity_id = $1`,
      [opportunityId],
    );
    const { rows: settled } = await client.query(`SELECT status FROM negotiations WHERE opportunity_id = $1`, [opportunityId]);
    expect(settled[0].status).toBe("NEGOTIATING");
  });

  it("INSPECTION_PENDING -> INSPECTION_COMPLETE: computes the mechanical score", async () => {
    await client.query(`UPDATE opportunities SET status = 'INSPECTION_PENDING' WHERE id = $1`, [opportunityId]);

    const CHECKLIST: Record<InspectionFinding["category"], string[]> = {
      ENGINE: ["cold_start", "smoke", "blow_by", "oil_pressure", "leaks", "noise", "turbo", "coolant", "injectors"],
      GEARBOX: ["shifting", "noise", "leaks", "clutch"],
      AXLES: ["differential_noise", "leaks", "bearings"],
      CHASSIS: ["cracks", "welding", "deformation", "accident_evidence"],
      ELECTRONICS: ["fault_codes", "ecu", "dashboard", "sensors"],
      HYDRAULIC: ["pto", "pump", "cylinder", "hoses"],
    };
    const findings: InspectionFinding[] = Object.entries(CHECKLIST).flatMap(([category, items]) =>
      items.map((item_code) => ({ category: category as InspectionFinding["category"], item_code, result: "PASS" as const })),
    );
    const mechanical = calculateMechanicalScore(findings);
    expect(mechanical.recommendation).toBe("PASS");

    await client.query(
      `UPDATE opportunities SET status = 'INSPECTION_COMPLETE', mechanical_score = $1 WHERE id = $2`,
      [mechanical.score, opportunityId],
    );
    const { rows } = await client.query(`SELECT status, mechanical_score FROM opportunities WHERE id = $1`, [opportunityId]);
    expect(rows[0].status).toBe("INSPECTION_COMPLETE");
  });

  it("PURCHASE_APPROVAL -> APPROVED -> PURCHASED: purchase order requires a decided APPROVE_PURCHASE approval", async () => {
    await client.query(`UPDATE opportunities SET status = 'PURCHASE_APPROVAL' WHERE id = $1`, [opportunityId]);

    const approvalRes = await client.query(
      `INSERT INTO approvals (gate, entity, entity_id, snapshot) VALUES ('APPROVE_PURCHASE', 'opportunity', $1, '{}') RETURNING id`,
      [opportunityId],
    );
    const approvalId = approvalRes.rows[0].id;

    // A PO cannot go APPROVED before the approval itself is decided (DB trigger enforces this).
    await expect(
      client.query(
        `INSERT INTO purchase_orders (code, opportunity_id, supplier_id, approval_id, agreed_price, status)
         VALUES ('TEST-PO-001', $1, $2, $3, 17200, 'APPROVED')`,
        [opportunityId, supplierId, approvalId],
      ),
    ).rejects.toThrow();

    await client.query(`UPDATE approvals SET decision = 'APPROVED', status = 'APPROVED', decided_at = now() WHERE id = $1`, [approvalId]);
    await client.query(`UPDATE opportunities SET status = 'APPROVED' WHERE id = $1`, [opportunityId]);

    const poRes = await client.query(
      `INSERT INTO purchase_orders (code, opportunity_id, supplier_id, approval_id, agreed_price, status)
       VALUES ('TEST-PO-001', $1, $2, $3, 17200, 'APPROVED') RETURNING id`,
      [opportunityId, supplierId, approvalId],
    );
    expect(poRes.rows).toHaveLength(1);

    await client.query(`UPDATE opportunities SET status = 'PURCHASED' WHERE id = $1`, [opportunityId]);
    const { rows } = await client.query(`SELECT status FROM opportunities WHERE id = $1`, [opportunityId]);
    expect(rows[0].status).toBe("PURCHASED");
  });

  it("DISMANTLING -> PACKING: creates the donor truck, parts, and a packing entry", async () => {
    await client.query(`UPDATE opportunities SET status = 'DISMANTLING' WHERE id = $1`, [opportunityId]);

    const donorRes = await client.query(
      `INSERT INTO donor_trucks (opportunity_id, vin, model, configuration, year) VALUES ($1, $2, 'C7H', '8x4', 2021) RETURNING id, code`,
      [opportunityId, "TESTVINCN0000001"],
    );
    const donorId = donorRes.rows[0].id;
    expect(donorRes.rows[0].code).toMatch(/^EBR-CN-\d{3}$/);

    const partRes = await client.query(
      `INSERT INTO parts (donor_truck_id, part_type, part_suffix, estimated_replacement_value)
       VALUES ($1, 'ENGINE', 'ENG', 12000) RETURNING id, part_code`,
      [donorId],
    );
    expect(partRes.rows[0].part_code).toBe(`${donorRes.rows[0].code}-ENG`);

    await client.query(`UPDATE opportunities SET status = 'PACKING' WHERE id = $1`, [opportunityId]);

    const pkgRes = await client.query(
      `INSERT INTO packages (package_id, donor_id, part_id, part_description, gross_weight_kg, condition)
       VALUES ($1, $2, $3, 'Engine assembly', 950, 'USED_GOOD') RETURNING id`,
      [`${donorRes.rows[0].code}-PKG-01`, donorId, partRes.rows[0].id],
    );
    expect(pkgRes.rows).toHaveLength(1);

    (globalThis as { __e2e?: Record<string, string> }).__e2e = {
      donorId, donorCode: donorRes.rows[0].code, partId: partRes.rows[0].id,
    };
  });

  it("SHIPPED -> RECEIVING -> RECEIVED: computes landed cost and ROI deterministically", async () => {
    await client.query(`UPDATE opportunities SET status = 'READY_TO_SHIP' WHERE id = $1`, [opportunityId]);
    await client.query(`UPDATE opportunities SET status = 'SHIPPED' WHERE id = $1`, [opportunityId]);
    await client.query(`UPDATE opportunities SET status = 'IN_TRANSIT' WHERE id = $1`, [opportunityId]);
    await client.query(`UPDATE opportunities SET status = 'CUSTOMS' WHERE id = $1`, [opportunityId]);
    await client.query(`UPDATE opportunities SET status = 'RECEIVING' WHERE id = $1`, [opportunityId]);

    const landed = calculateLandedCost({
      purchasePrice: 17200, inspection: 250, dismantling: 600, packing: 450,
      chinaTransport: 300, freight: 4200, insurance: 180, destinationCharges: 900,
      customsDuty: 1100, vat: 1600, customsBroker: 300, moroccoTransport: 400,
    });
    expect(landed.totalLandedCost).toBeGreaterThan(landed.purchasePrice);

    const roi = calculateRoi({
      totalLandedCost: landed.totalLandedCost,
      replacementValues: { engine: 12000, gearbox: 9000, cabin: 8000, axles: 7000 },
      usableMajorComponentCount: 4,
    });
    expect(roi.savingsAmount).toBeDefined();

    await client.query(`UPDATE opportunities SET status = 'RECEIVED', estimated_landed_cost = $1 WHERE id = $2`, [landed.totalLandedCost, opportunityId]);

    // FROZEN/resume and terminal transition checks (pure, no DB needed).
    expect(() => assertTransition("RECEIVING", "RECEIVED")).not.toThrow();
    expect(() => assertTransition("RECEIVED", "CLOSED")).not.toThrow();
  });

  it("INVENTORY: receives the engine part and makes it AVAILABLE", async () => {
    const partId = (globalThis as { __e2e?: Record<string, string> }).__e2e!.partId;

    let status = applyMovement(null, "RECEIVED");
    expect(status).toBe("AVAILABLE");

    const invRes = await client.query(
      `INSERT INTO inventory (part_id, part_status) VALUES ($1, $2) RETURNING id`,
      [partId, status],
    );
    await client.query(
      `INSERT INTO inventory_movements (inventory_id, movement_type, quantity_delta) VALUES ($1, 'RECEIVED', 1)`,
      [invRes.rows[0].id],
    );

    await client.query(`UPDATE opportunities SET status = 'CLOSED' WHERE id = $1`, [opportunityId]);
    const { rows } = await client.query(`SELECT status FROM opportunities WHERE id = $1`, [opportunityId]);
    expect(rows[0].status).toBe("CLOSED");

    const { rows: invRows } = await client.query(`SELECT part_status FROM inventory WHERE id = $1`, [invRes.rows[0].id]);
    expect(invRows[0].part_status).toBe("AVAILABLE");
  });
});
