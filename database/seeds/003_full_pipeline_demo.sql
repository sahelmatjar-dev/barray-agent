-- 003_full_pipeline_demo.sql
-- =====================  TEST DATA — SAFE SAMPLE / NOT REAL  =====================
-- A second opportunity (SITRAK G7) carried all the way through the pipeline to
-- CLOSED, with every downstream table populated, so every dashboard page has
-- real rows to render. Everything here is clearly-marked sample data, not real
-- suppliers/prices/documents. Idempotent: guarded by a marker row so re-running
-- `npm run db:seed` does not duplicate the chain.

DO $$
DECLARE
  v_owner_id UUID;
  v_supplier_id UUID;
  v_rejected_supplier_id UUID;
  v_opportunity_id UUID;
  v_opportunity_code TEXT;
  v_rfq_id UUID;
  v_quote_id UUID;
  v_negotiation_id UUID;
  v_inspection_id UUID;
  v_approval_supplier_id UUID;
  v_approval_inspection_id UUID;
  v_approval_purchase_id UUID;
  v_approval_payment_id UUID;
  v_po_id UUID;
  v_bank_account_id UUID;
  v_payment_id UUID;
  v_donor_id UUID;
  v_donor_code TEXT;
  v_part_engine_id UUID;
  v_part_gearbox_id UUID;
  v_part_cabin_id UUID;
  v_part_axle_id UUID;
  v_fleet_truck_id UUID;
  v_dismantling_job_id UUID;
  v_pkg_engine_id UUID;
  v_pkg_gearbox_id UUID;
  v_pkg_cabin_id UUID;
  v_pkg_axle_id UUID;
  v_forwarder_id UUID;
  v_freight_quote_id UUID;
  v_container_id UUID;
  v_packing_list_id UUID;
  v_shipment_id UUID;
  v_warehouse_id UUID;
  v_zone_id UUID;
  v_rack_id UUID;
  v_shelf_id UUID;
  v_inv_engine_id UUID;
  v_receiving_report_id UUID;
  v_claim_id UUID;
BEGIN
  -- Idempotency guard: if the demo chain already exists, do nothing.
  IF EXISTS (SELECT 1 FROM opportunities WHERE listing_url = 'https://example-test-listing.invalid/TEST-SITRAK-G7-002') THEN
    RETURN;
  END IF;

  SELECT id INTO v_owner_id FROM users WHERE email = 'owner@elbarrayra.test';
  SELECT id INTO v_fleet_truck_id FROM fleet_trucks WHERE registration_number = 'TEST-12345-A-1';

  -- ---- Suppliers -----------------------------------------------------------
  INSERT INTO suppliers (
    legal_name, trade_name, country, province, city, business_license_number,
    legal_existence_verified, years_active, is_truck_specialist, third_party_audit,
    export_evidence, website, digital_presence_score, communication_quality_score,
    trust_score, trust_risk_group, fraud_risk, notes, status, approved_by, approved_at
  ) VALUES (
    'TEST Ningbo Heavy Truck Parts Co., Ltd.', 'TEST Ningbo Heavy Truck', 'CN', 'Zhejiang', 'Ningbo',
    'TEST-LIC-0002', true, 9, true, true,
    true, 'https://example-test-supplier-2.invalid', 90, 92,
    95, 'LOW_RISK', 'LOW', 'TEST DATA — fully approved demo supplier for the closed pipeline', 'APPROVED', v_owner_id, now() - interval '60 days'
  ) RETURNING id INTO v_supplier_id;

  INSERT INTO supplier_contacts (supplier_id, full_name, role, phone, email, is_primary)
  VALUES (v_supplier_id, 'TEST Contact Li', 'Export Manager', '+86-000-0000-0002', 'contact@example-test-supplier-2.invalid', true);

  INSERT INTO supplier_bank_accounts (supplier_id, account_holder_name, is_personal_account, bank_name, account_number, matches_company_name, status)
  VALUES (v_supplier_id, 'TEST Ningbo Heavy Truck Parts Co., Ltd.', false, 'TEST Bank of Ningbo', 'TEST0000000000002', true, 'VERIFIED')
  RETURNING id INTO v_bank_account_id;

  -- A rejected supplier, so the AI assistant's "why was this supplier rejected" demo has real data.
  INSERT INTO suppliers (
    legal_name, country, business_license_number, legal_existence_verified, years_active,
    is_truck_specialist, third_party_audit, export_evidence, digital_presence_score,
    communication_quality_score, trust_score, trust_risk_group, fraud_risk, notes, status
  ) VALUES (
    'TEST Guangzhou Quick Trucks Ltd.', 'CN', NULL, false, 1,
    false, false, false, 20, 30, 38, 'HIGH_RISK', 'HIGH',
    'TEST DATA — deliberately low-trust supplier used to demonstrate a rejection', 'REJECTED'
  ) RETURNING id INTO v_rejected_supplier_id;

  INSERT INTO audit_logs (user_id, action, entity, entity_id, old_value, new_value, reason)
  VALUES (
    v_owner_id, 'APPROVAL_REJECTED', 'supplier', v_rejected_supplier_id,
    '{"status":"PENDING_REVIEW"}', '{"status":"REJECTED"}',
    'Trust score 38/100 (HIGH_RISK): no business license on file, no export evidence, single year of activity.'
  );

  -- ---- Opportunity, fully scored ---------------------------------------------
  INSERT INTO opportunities (
    supplier_id, platform, listing_url, brand, model, configuration, year,
    mileage_km, vin, engine, horsepower, gearbox, axles, asking_price, currency,
    fob_price, cif_price, location_city, location_province, description, availability,
    compatibility_score, supplier_trust_score, mechanical_score, fraud_risk,
    best_value_score, ai_recommendation, estimated_landed_cost, estimated_parts_value, status
  ) VALUES (
    v_supplier_id, 'MANUAL', 'https://example-test-listing.invalid/TEST-SITRAK-G7-002',
    'SITRAK', 'G7', '8x4', 2020,
    260000, 'TESTVINCN0000002', 'WP13', 480, 'HW19710', 'FAT13 / STR13-460',
    15200, 'USD', 16800, 22100, 'Ningbo', 'Zhejiang',
    'TEST DATA — sample closed-pipeline opportunity demonstrating every downstream stage.',
    'SOLD', 91, 95, 88, 'LOW', 84, 'BUY — strong compatibility and trust, savings above target.',
    24650, 37000, 'DISCOVERED'
  ) RETURNING id, code INTO v_opportunity_id, v_opportunity_code;

  INSERT INTO truck_specs (opportunity_id, vin, chassis_number, engine_model, engine_serial, gearbox_model, gearbox_serial, front_axle_model, rear_axle_model, ecu_reference, cabin_generation, hydraulic_system, status)
  VALUES (v_opportunity_id, 'TESTVINCN0000002', 'TEST-CHASSIS-0002', 'MC13', 'TEST-ENG-0002', 'HW19710', 'TEST-GBX-0002', 'FAT13', 'STR13-460', 'TEST-ECU-0002', 'GEN2', 'TEST hydraulic tipper kit', 'CONFIRMED');

  -- Walk the opportunity through the full status machine (each step is a legal transition).
  UPDATE opportunities SET status = 'SCREENING' WHERE id = v_opportunity_id;
  UPDATE opportunities SET status = 'SUPPLIER_REVIEW' WHERE id = v_opportunity_id;
  UPDATE opportunities SET status = 'SUPPLIER_APPROVAL' WHERE id = v_opportunity_id;
  UPDATE opportunities SET status = 'RFQ_PENDING' WHERE id = v_opportunity_id;
  UPDATE opportunities SET status = 'RFQ_SENT' WHERE id = v_opportunity_id;
  UPDATE opportunities SET status = 'QUOTE_RECEIVED' WHERE id = v_opportunity_id;
  UPDATE opportunities SET status = 'NEGOTIATING' WHERE id = v_opportunity_id;
  UPDATE opportunities SET status = 'INSPECTION_PENDING' WHERE id = v_opportunity_id;
  UPDATE opportunities SET status = 'INSPECTION_COMPLETE' WHERE id = v_opportunity_id;
  UPDATE opportunities SET status = 'PURCHASE_APPROVAL' WHERE id = v_opportunity_id;
  UPDATE opportunities SET status = 'APPROVED' WHERE id = v_opportunity_id;
  UPDATE opportunities SET status = 'PURCHASED' WHERE id = v_opportunity_id;
  UPDATE opportunities SET status = 'DISMANTLING' WHERE id = v_opportunity_id;
  UPDATE opportunities SET status = 'PACKING' WHERE id = v_opportunity_id;
  UPDATE opportunities SET status = 'READY_TO_SHIP' WHERE id = v_opportunity_id;
  UPDATE opportunities SET status = 'SHIPPED' WHERE id = v_opportunity_id;
  UPDATE opportunities SET status = 'IN_TRANSIT' WHERE id = v_opportunity_id;
  UPDATE opportunities SET status = 'CUSTOMS' WHERE id = v_opportunity_id;
  UPDATE opportunities SET status = 'RECEIVING' WHERE id = v_opportunity_id;
  UPDATE opportunities SET status = 'RECEIVED' WHERE id = v_opportunity_id;
  UPDATE opportunities SET status = 'CLOSED' WHERE id = v_opportunity_id;

  -- ---- RFQ / Quote -----------------------------------------------------------
  INSERT INTO rfqs (opportunity_id, supplier_id, status, sent_at, follow_up_1_sent_at)
  VALUES (v_opportunity_id, v_supplier_id, 'ANSWERED', now() - interval '55 days', now() - interval '53 days')
  RETURNING id INTO v_rfq_id;

  INSERT INTO rfq_items (rfq_id, item_type, label, is_required, status) VALUES
    (v_rfq_id, 'DATA_FIELD', 'VIN', true, 'RECEIVED'),
    (v_rfq_id, 'VIDEO_REQUEST', 'cold start', true, 'RECEIVED'),
    (v_rfq_id, 'PRICE_REQUEST', 'FOB Qingdao', true, 'RECEIVED'),
    (v_rfq_id, 'DECLARATION', 'NOT OFFICIALLY SCRAPPED VEHICLE', true, 'RECEIVED');

  INSERT INTO quotes (
    rfq_id, opportunity_id, supplier_id, truck_price, dismantling_price, packing_price,
    china_inland_transport_price, fob_qingdao_price, cif_tanger_med_price, inspection_price,
    currency, not_officially_scrapped_declared, best_value_score, status
  ) VALUES (
    v_rfq_id, v_opportunity_id, v_supplier_id, 15200, 550, 420, 280, 16800, 22100, 240,
    'USD', true, 84, 'ACCEPTED'
  ) RETURNING id INTO v_quote_id;

  INSERT INTO quote_items (quote_id, description, unit_price, quantity, currency) VALUES
    (v_quote_id, 'SITRAK G7 8x4 tipper, running condition', 15200, 1, 'USD'),
    (v_quote_id, 'Professional dismantling service', 550, 1, 'USD');

  -- ---- Negotiation -------------------------------------------------------------
  INSERT INTO negotiations (opportunity_id, quote_id, supplier_id, asking_price, ideal_price, target_price, maximum_price, current_offer_price, current_counter_price, status)
  VALUES (v_opportunity_id, v_quote_id, v_supplier_id, 15200, 14200, 14800, 15300, 15200, 14800, 'TARGET_REACHED')
  RETURNING id INTO v_negotiation_id;

  INSERT INTO negotiation_messages (negotiation_id, direction, drafted_by_ai, approved_by, proposed_price, body, status) VALUES
    (v_negotiation_id, 'OUTBOUND', true, v_owner_id, 14800, 'TEST DATA — AI-drafted counter-offer, approved by the owner before sending.', 'SENT'),
    (v_negotiation_id, 'INBOUND', false, NULL, 14800, 'TEST DATA — supplier accepted the counter-offer.', 'RECEIVED');

  -- ---- Inspection ----------------------------------------------------------------
  INSERT INTO inspections (opportunity_id, inspector_name, inspection_date, mechanical_score, recommendation, status)
  VALUES (v_opportunity_id, 'TEST Inspector Wang', CURRENT_DATE - 40, 88, 'PASS', 'APPROVED')
  RETURNING id INTO v_inspection_id;

  INSERT INTO inspection_findings (inspection_id, category, item_code, result, weight) VALUES
    (v_inspection_id, 'ENGINE', 'cold_start', 'PASS', 1),
    (v_inspection_id, 'ENGINE', 'smoke', 'PASS', 1),
    (v_inspection_id, 'ENGINE', 'blow_by', 'WARNING', 1),
    (v_inspection_id, 'GEARBOX', 'shifting', 'PASS', 1),
    (v_inspection_id, 'AXLES', 'differential_noise', 'PASS', 1),
    (v_inspection_id, 'CHASSIS', 'cracks', 'PASS', 1),
    (v_inspection_id, 'ELECTRONICS', 'fault_codes', 'PASS', 1),
    (v_inspection_id, 'HYDRAULIC', 'pump', 'PASS', 1);

  -- ---- Approvals (all four gates, all decided) ------------------------------------
  INSERT INTO approvals (gate, entity, entity_id, requested_by, decided_by, decision, decision_reason, snapshot, decided_at, status)
  VALUES ('APPROVE_SUPPLIER', 'supplier', v_supplier_id, v_owner_id, v_owner_id, 'APPROVED', 'Trust score 95/100, LOW_RISK.', '{"trust_score":95}', now() - interval '58 days', 'APPROVED')
  RETURNING id INTO v_approval_supplier_id;

  INSERT INTO approvals (gate, entity, entity_id, requested_by, decided_by, decision, decision_reason, snapshot, decided_at, status)
  VALUES ('APPROVE_INSPECTION', 'inspection', v_inspection_id, v_owner_id, v_owner_id, 'APPROVED', 'Mechanical score 88/100, PASS.', '{"mechanical_score":88}', now() - interval '38 days', 'APPROVED')
  RETURNING id INTO v_approval_inspection_id;

  INSERT INTO approvals (gate, entity, entity_id, requested_by, decided_by, decision, decision_reason, snapshot, decided_at, status)
  VALUES ('APPROVE_PURCHASE', 'opportunity', v_opportunity_id, v_owner_id, v_owner_id, 'APPROVED', 'Compatibility 91, trust 95, savings 33%.', '{"best_value_score":84}', now() - interval '36 days', 'APPROVED')
  RETURNING id INTO v_approval_purchase_id;

  -- ---- Purchase order --------------------------------------------------------------
  INSERT INTO purchase_orders (code, opportunity_id, supplier_id, approval_id, agreed_price, currency, incoterm, delivery_port, status)
  VALUES ('EBR-PO-2026-0001', v_opportunity_id, v_supplier_id, v_approval_purchase_id, 14800, 'USD', 'FOB', 'Qingdao', 'FULFILLED')
  RETURNING id INTO v_po_id;

  INSERT INTO purchase_order_items (purchase_order_id, description, quantity, unit_price, currency) VALUES
    (v_po_id, 'SITRAK G7 8x4 donor truck', 1, 14800, 'USD');

  -- ---- Payment (requires a decided RELEASE_PAYMENT approval before RELEASED) -------
  INSERT INTO approvals (gate, entity, entity_id, requested_by, decided_by, decision, decision_reason, snapshot, decided_at, status)
  VALUES ('RELEASE_PAYMENT', 'payment', v_po_id, v_owner_id, v_owner_id, 'APPROVED', 'Bank account verified, matches company name, no recent change.', '{}', now() - interval '35 days', 'APPROVED')
  RETURNING id INTO v_approval_payment_id;

  INSERT INTO payments (purchase_order_id, release_approval_id, amount, currency, payment_type, beneficiary_bank_account_id, method, reference, released_by, released_at, status)
  VALUES (v_po_id, v_approval_payment_id, 14800, 'USD', 'FULL', v_bank_account_id, 'WIRE', 'TEST-WIRE-REF-0001', v_owner_id, now() - interval '35 days', 'RELEASED')
  RETURNING id INTO v_payment_id;

  INSERT INTO payment_verifications (payment_id, check_type, passed, details) VALUES
    (v_payment_id, 'BANK_NAME_MATCH', true, 'Account holder matches supplier legal name.'),
    (v_payment_id, 'ACCOUNT_NOT_PERSONAL', true, 'Company account.'),
    (v_payment_id, 'ACCOUNT_UNCHANGED', true, 'No change since last verified payment.'),
    (v_payment_id, 'AMOUNT_MATCHES_PO', true, 'Amount equals PO agreed price.'),
    (v_payment_id, 'SUPPLIER_NOT_FROZEN', true, 'Supplier status is APPROVED.');

  -- ---- Donor truck + parts -----------------------------------------------------
  INSERT INTO donor_trucks (opportunity_id, purchase_order_id, vin, brand, model, configuration, year, status)
  VALUES (v_opportunity_id, v_po_id, 'TESTVINCN0000002', 'SITRAK', 'G7', '8x4', 2020, 'DISMANTLED')
  RETURNING id, code INTO v_donor_id, v_donor_code;

  INSERT INTO parts (donor_truck_id, part_type, part_suffix, description, condition, estimated_replacement_value, status)
  VALUES (v_donor_id, 'ENGINE', 'ENG', 'WP13 engine assembly', 'USED_GOOD', 12500, 'AVAILABLE') RETURNING id INTO v_part_engine_id;
  INSERT INTO parts (donor_truck_id, part_type, part_suffix, description, condition, estimated_replacement_value, status)
  VALUES (v_donor_id, 'GEARBOX', 'GBX', 'HW19710 gearbox', 'USED_GOOD', 8500, 'AVAILABLE') RETURNING id INTO v_part_gearbox_id;
  INSERT INTO parts (donor_truck_id, part_type, part_suffix, description, condition, estimated_replacement_value, status)
  VALUES (v_donor_id, 'CABIN', 'CAB', 'GEN2 cabin, no accident damage', 'USED_GOOD', 7000, 'AVAILABLE') RETURNING id INTO v_part_cabin_id;
  INSERT INTO parts (donor_truck_id, part_type, part_suffix, description, condition, estimated_replacement_value, status)
  VALUES (v_donor_id, 'REAR_AXLE_1', 'RAX1', 'STR13-460 rear axle', 'USED_GOOD', 6500, 'INSTALLED') RETURNING id INTO v_part_axle_id;

  INSERT INTO part_compatibility (part_id, fleet_truck_id, component, match_type, reason_code, score_contribution) VALUES
    (v_part_engine_id, v_fleet_truck_id, 'engine', 'PARTIAL_MATCH', 'engine_partial_match', 12.5),
    (v_part_gearbox_id, v_fleet_truck_id, 'gearbox', 'EXACT_MATCH', 'gearbox_exact_match', 20);

  -- Traceability: donor part actually installed on EL BARRAY RA's fleet truck.
  INSERT INTO part_installations (part_id, fleet_truck_id, installation_date, odometer_at_installation, technician, notes, status)
  VALUES (v_part_axle_id, v_fleet_truck_id, CURRENT_DATE - 5, 185000, 'TEST Technician Amine', 'TEST DATA — rear axle installed after inspection.', 'ACTIVE');

  UPDATE parts SET status = 'INSTALLED' WHERE id = v_part_axle_id;

  -- ---- Dismantling ---------------------------------------------------------------
  INSERT INTO dismantling_jobs (donor_truck_id, assigned_to, rules_acknowledged, fluids_drained, connectors_labeled, status)
  VALUES (v_donor_id, 'TEST Technician Youssef', true, true, true, 'COMPLETE')
  RETURNING id INTO v_dismantling_job_id;

  INSERT INTO dismantling_items (dismantling_job_id, part_id, status) VALUES
    (v_dismantling_job_id, v_part_engine_id, 'DONE'),
    (v_dismantling_job_id, v_part_gearbox_id, 'DONE'),
    (v_dismantling_job_id, v_part_cabin_id, 'DONE'),
    (v_dismantling_job_id, v_part_axle_id, 'DONE');

  -- ---- Packing ---------------------------------------------------------------------
  INSERT INTO packages (package_id, donor_id, part_id, part_description, gross_weight_kg, net_weight_kg, length_cm, width_cm, height_cm, cbm, packing_type, candidate_hs_code, condition, status)
  VALUES (v_donor_code || '-PKG-01', v_donor_id, v_part_engine_id, 'WP13 engine assembly', 980, 900, 130, 90, 100, 1.170, 'WOODEN_CRATE', '8408.90', 'USED_GOOD', 'SHIPPED')
  RETURNING id INTO v_pkg_engine_id;
  INSERT INTO packages (package_id, donor_id, part_id, part_description, gross_weight_kg, net_weight_kg, length_cm, width_cm, height_cm, cbm, packing_type, candidate_hs_code, condition, status)
  VALUES (v_donor_code || '-PKG-02', v_donor_id, v_part_gearbox_id, 'HW19710 gearbox', 420, 390, 100, 80, 80, 0.640, 'WOODEN_CRATE', '8708.40', 'USED_GOOD', 'SHIPPED')
  RETURNING id INTO v_pkg_gearbox_id;
  INSERT INTO packages (package_id, donor_id, part_id, part_description, gross_weight_kg, net_weight_kg, length_cm, width_cm, height_cm, cbm, packing_type, candidate_hs_code, condition, status)
  VALUES (v_donor_code || '-PKG-03', v_donor_id, v_part_cabin_id, 'GEN2 cabin', 650, 600, 220, 200, 180, 7.920, 'BARE', '8707.90', 'USED_GOOD', 'SHIPPED')
  RETURNING id INTO v_pkg_cabin_id;
  INSERT INTO packages (package_id, donor_id, part_id, part_description, gross_weight_kg, net_weight_kg, length_cm, width_cm, height_cm, cbm, packing_type, candidate_hs_code, condition, status)
  VALUES (v_donor_code || '-PKG-04', v_donor_id, v_part_axle_id, 'STR13-460 rear axle', 380, 350, 120, 70, 70, 0.588, 'PALLET', '8708.50', 'USED_GOOD', 'SHIPPED')
  RETURNING id INTO v_pkg_axle_id;

  -- ---- Freight / container / shipment -----------------------------------------------
  INSERT INTO freight_forwarders (name, contact_name, phone, email, status)
  VALUES ('TEST Atlas Forwarding Co.', 'TEST Agent Hassan', '+212-000-000000', 'agent@example-test-forwarder.invalid', 'ACTIVE')
  RETURNING id INTO v_forwarder_id;

  INSERT INTO freight_quotes (freight_forwarder_id, donor_id, container_type, origin_port, destination_port, origin_charges, china_transport, ocean_freight, insurance, destination_charges, broker_fee, morocco_inland_transport, currency, transit_days, status)
  VALUES (v_forwarder_id, v_donor_id, '20GP', 'QINGDAO', 'TANGER_MED', 180, 280, 3200, 150, 700, 250, 350, 'USD', 32, 'SELECTED')
  RETURNING id INTO v_freight_quote_id;

  INSERT INTO containers (container_number, container_type, freight_forwarder_id, freight_quote_id, status)
  VALUES ('TESTU1234567', '20GP', v_forwarder_id, v_freight_quote_id, 'ARRIVED')
  RETURNING id INTO v_container_id;

  INSERT INTO packing_lists (donor_id, container_id, status)
  VALUES (v_donor_id, v_container_id, 'FINAL')
  RETURNING id INTO v_packing_list_id;

  INSERT INTO packing_list_items (packing_list_id, package_id) VALUES
    (v_packing_list_id, v_pkg_engine_id), (v_packing_list_id, v_pkg_gearbox_id),
    (v_packing_list_id, v_pkg_cabin_id), (v_packing_list_id, v_pkg_axle_id);

  INSERT INTO shipments (container_id, booking_number, bl_number, shipping_line, vessel, etd, eta, original_eta, origin_port, destination_port, latest_status, status)
  VALUES (v_container_id, 'TEST-BOOK-0001', 'TEST-BL-0001', 'TEST Ocean Line', 'TEST Vessel Atlas', CURRENT_DATE - 32, CURRENT_DATE - 2, CURRENT_DATE - 4, 'QINGDAO', 'TANGER_MED', 'DELIVERED', 'DELIVERED')
  RETURNING id INTO v_shipment_id;

  INSERT INTO shipment_events (shipment_id, event_type, event_location, event_at) VALUES
    (v_shipment_id, 'BOOKED', 'Qingdao', now() - interval '34 days'),
    (v_shipment_id, 'DEPARTED', 'Qingdao', now() - interval '32 days'),
    (v_shipment_id, 'ARRIVED', 'Tanger Med', now() - interval '2 days');

  -- ---- Customs -----------------------------------------------------------------------
  INSERT INTO customs_records (shipment_id, donor_id, candidate_hs_code, confidence, source, reason, customs_verified, verified_by, verified_at, complete_vehicle_flag, complete_vehicle_flag_reason, status)
  VALUES (
    v_shipment_id, v_donor_id, '8708.99', 65, 'BROKER', 'Broker-suggested code pending final customs classification.',
    true, v_owner_id, now() - interval '1 day', true,
    'Engine + gearbox + cabin + rear axle from the same donor VIN shipped together (57% major-component coverage).',
    'VERIFIED'
  );

  -- ---- Expenses + landed cost (deterministic, matches packages/shared calculateLandedCost) --
  INSERT INTO expenses (donor_id, category, amount, currency) VALUES
    (v_donor_id, 'INSPECTION', 240, 'USD'),
    (v_donor_id, 'DISMANTLING', 550, 'USD'),
    (v_donor_id, 'PACKING', 420, 'USD'),
    (v_donor_id, 'CHINA_TRANSPORT', 280, 'USD'),
    (v_donor_id, 'EXPORT_FEES', 120, 'USD'),
    (v_donor_id, 'FREIGHT', 3200, 'USD'),
    (v_donor_id, 'INSURANCE', 150, 'USD'),
    (v_donor_id, 'DESTINATION_CHARGES', 700, 'USD'),
    (v_donor_id, 'CUSTOMS_DUTY', 950, 'USD'),
    (v_donor_id, 'VAT', 1400, 'USD'),
    (v_donor_id, 'CUSTOMS_BROKER', 250, 'USD'),
    (v_donor_id, 'MOROCCO_TRANSPORT', 350, 'USD'),
    (v_donor_id, 'MISCELLANEOUS', 40, 'USD');

  -- purchase_price 14800 + 240+550+420+280+120+3200+150+700+950+1400+250+350+40 = 23450
  INSERT INTO landed_costs (
    donor_id, purchase_price, inspection, dismantling, packing, china_transport, export_fees,
    freight, insurance, destination_charges, customs_duty, vat, customs_broker, morocco_transport,
    miscellaneous, total_landed_cost, currency, status
  ) VALUES (
    v_donor_id, 14800, 240, 550, 420, 280, 120, 3200, 150, 700, 950, 1400, 250, 350, 40,
    23450, 'USD', 'FINAL'
  );

  -- ---- Warehouse / inventory -----------------------------------------------------------
  INSERT INTO warehouses (name, city, address, status)
  VALUES ('TEST EL BARRAY RA — Laâyoune Warehouse', 'Laâyoune', 'TEST DATA — Zone Industrielle', 'ACTIVE')
  RETURNING id INTO v_warehouse_id;

  INSERT INTO warehouse_locations (warehouse_id, parent_location_id, level, code, status)
  VALUES (v_warehouse_id, NULL, 'ZONE', 'Z1', 'ACTIVE') RETURNING id INTO v_zone_id;
  INSERT INTO warehouse_locations (warehouse_id, parent_location_id, level, code, status)
  VALUES (v_warehouse_id, v_zone_id, 'RACK', 'R1', 'ACTIVE') RETURNING id INTO v_rack_id;
  INSERT INTO warehouse_locations (warehouse_id, parent_location_id, level, code, status)
  VALUES (v_warehouse_id, v_rack_id, 'SHELF', 'S1', 'ACTIVE') RETURNING id INTO v_shelf_id;

  INSERT INTO inventory (part_id, warehouse_location_id, part_status, status)
  VALUES (v_part_engine_id, v_shelf_id, 'AVAILABLE', 'ACTIVE') RETURNING id INTO v_inv_engine_id;
  INSERT INTO inventory (part_id, warehouse_location_id, part_status, status)
  VALUES (v_part_gearbox_id, v_shelf_id, 'AVAILABLE', 'ACTIVE');
  INSERT INTO inventory (part_id, warehouse_location_id, part_status, status)
  VALUES (v_part_cabin_id, v_shelf_id, 'AVAILABLE', 'ACTIVE');
  INSERT INTO inventory (part_id, warehouse_location_id, part_status, status)
  VALUES (v_part_axle_id, v_shelf_id, 'INSTALLED', 'ACTIVE');

  INSERT INTO inventory_movements (inventory_id, movement_type, to_location_id, quantity_delta, performed_by)
  VALUES (v_inv_engine_id, 'RECEIVED', v_shelf_id, 1, v_owner_id);

  -- ---- Receiving ------------------------------------------------------------------------
  INSERT INTO receiving_reports (shipment_id, container_id, received_by, received_at, status)
  VALUES (v_shipment_id, v_container_id, v_owner_id, now() - interval '1 day', 'COMPLETE')
  RETURNING id INTO v_receiving_report_id;

  INSERT INTO receiving_items (receiving_report_id, package_id, part_id, expected_quantity, received_quantity, condition_on_arrival, status) VALUES
    (v_receiving_report_id, v_pkg_engine_id, v_part_engine_id, 1, 1, 'GOOD', 'MATCHED'),
    (v_receiving_report_id, v_pkg_gearbox_id, v_part_gearbox_id, 1, 1, 'GOOD', 'MATCHED'),
    (v_receiving_report_id, v_pkg_cabin_id, v_part_cabin_id, 1, 1, 'DAMAGED', 'DISCREPANCY'),
    (v_receiving_report_id, v_pkg_axle_id, v_part_axle_id, 1, 1, 'GOOD', 'MATCHED');

  -- ---- Claim (resolved minor cabin transport-damage claim) ------------------------------
  INSERT INTO claims (donor_id, receiving_report_id, purchase_order_id, claim_type, claim_amount, currency, sent_at, sent_by, status)
  VALUES (v_donor_id, v_receiving_report_id, v_po_id, 'DAMAGE', 300, 'USD', now() - interval '20 hours', v_owner_id, 'RESOLVED')
  RETURNING id INTO v_claim_id;

  INSERT INTO claim_items (claim_id, package_id, part_id, description, amount, currency) VALUES
    (v_claim_id, v_pkg_cabin_id, v_part_cabin_id, 'Cabin windshield cracked in transit — forwarder insurance claim.', 300, 'USD');

END $$;
