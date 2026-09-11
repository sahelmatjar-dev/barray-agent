-- 002_test_sample_data.sql
-- =====================  TEST DATA — SAFE SAMPLE / NOT REAL  =====================
-- Everything in this file is clearly-marked sample data for demos, screenshots
-- and the end-to-end test (tests/e2e/test-sitrak-c7h-001.test.ts). No real
-- supplier, price, VIN or bank data. Safe to delete in production.

-- Sample fleet truck (EL BARRAY RA's own truck that could later receive parts)
INSERT INTO fleet_trucks (
  registration_number, vin, brand, model, configuration, year,
  engine_model, engine_serial, gearbox_model, gearbox_serial,
  front_axle_model, rear_axle_model, ecu_reference, cabin_generation,
  hydraulic_system, notes, status
) VALUES (
  'TEST-12345-A-1', 'TESTVIN0000000001', 'SITRAK', 'C7H', '8x4', 2020,
  'MC13', 'TEST-ENG-0001', 'HW19710', 'TEST-GBX-0001',
  'FAT13', 'STR13-460', 'TEST-ECU-0001', 'GEN2',
  'TEST hydraulic tipper kit',
  'TEST DATA — sample fleet truck used for compatibility-engine demos', 'ACTIVE'
) ON CONFLICT (registration_number) DO NOTHING;

-- Sample supplier
INSERT INTO suppliers (
  legal_name, trade_name, country, province, city,
  business_license_number, legal_existence_verified, years_active,
  is_truck_specialist, third_party_audit, export_evidence, website,
  digital_presence_score, communication_quality_score, notes, status
) VALUES (
  'TEST Shandong Sample Trucks Co., Ltd.', 'TEST Sample Trucks', 'CN', 'Shandong', 'Jinan',
  'TEST-LIC-0001', true, 6,
  true, true, true, 'https://example-test-supplier.invalid',
  80, 85, 'TEST DATA — sample supplier for supplier-trust-engine demos', 'APPROVED'
) ON CONFLICT DO NOTHING;

INSERT INTO supplier_contacts (supplier_id, full_name, role, phone, email, is_primary)
SELECT id, 'TEST Contact Zhang', 'Sales Manager', '+86-000-0000-0000', 'contact@example-test-supplier.invalid', true
FROM suppliers WHERE legal_name = 'TEST Shandong Sample Trucks Co., Ltd.'
ON CONFLICT DO NOTHING;

INSERT INTO supplier_bank_accounts (supplier_id, account_holder_name, is_personal_account, bank_name, account_number, matches_company_name, status)
SELECT id, 'TEST Shandong Sample Trucks Co., Ltd.', false, 'TEST Bank of China', 'TEST0000000000001', true, 'VERIFIED'
FROM suppliers WHERE legal_name = 'TEST Shandong Sample Trucks Co., Ltd.'
ON CONFLICT DO NOTHING;

-- Sample opportunity: TEST-SITRAK-C7H-001 (used by the end-to-end test)
INSERT INTO opportunities (
  supplier_id, platform, listing_url, brand, model, configuration, year,
  mileage_km, vin, engine, horsepower, gearbox, axles,
  asking_price, currency, location_city, location_province, description,
  availability, status
)
SELECT s.id, 'MANUAL', 'https://example-test-listing.invalid/TEST-SITRAK-C7H-001',
  'SITRAK', 'C7H', '8x4', 2021,
  220000, 'TESTVINCN0000001', 'MC13', 540, 'HW19710', 'FAT13 / STR13-460',
  17800, 'USD', 'Jinan', 'Shandong',
  'TEST DATA — sample donor opportunity used for the TEST-SITRAK-C7H-001 end-to-end test.',
  'AVAILABLE', 'DISCOVERED'
FROM suppliers s WHERE s.legal_name = 'TEST Shandong Sample Trucks Co., Ltd.'
ON CONFLICT DO NOTHING;

-- Sample truck_specs (mostly UNKNOWN, as required for real-world listings)
INSERT INTO truck_specs (opportunity_id, vin, chassis_number, engine_model, engine_serial, gearbox_model, is_unknown_fields, status)
SELECT o.id, o.vin, 'UNKNOWN', 'MC13', 'UNKNOWN', 'HW19710', '["chassis_number","engine_serial","gearbox_serial","ecu_reference"]', 'DRAFT'
FROM opportunities o WHERE o.listing_url = 'https://example-test-listing.invalid/TEST-SITRAK-C7H-001'
ON CONFLICT DO NOTHING;

-- Sample RFQ + quote
INSERT INTO rfqs (opportunity_id, supplier_id, status, sent_at)
SELECT o.id, o.supplier_id, 'SENT', now() - interval '10 days'
FROM opportunities o WHERE o.listing_url = 'https://example-test-listing.invalid/TEST-SITRAK-C7H-001'
ON CONFLICT DO NOTHING;

INSERT INTO quotes (
  rfq_id, opportunity_id, supplier_id, truck_price, dismantling_price, packing_price,
  china_inland_transport_price, fob_qingdao_price, cif_tanger_med_price, inspection_price,
  currency, not_officially_scrapped_declared, status
)
SELECT r.id, r.opportunity_id, r.supplier_id, 17800, 600, 450, 300, 19500, 24800, 250,
  'USD', true, 'RANKED'
FROM rfqs r
JOIN opportunities o ON o.id = r.opportunity_id
WHERE o.listing_url = 'https://example-test-listing.invalid/TEST-SITRAK-C7H-001'
ON CONFLICT DO NOTHING;

-- Sample inspection
INSERT INTO inspections (opportunity_id, inspector_name, inspection_date, mechanical_score, recommendation, status)
SELECT o.id, 'TEST Inspector', CURRENT_DATE, 89, 'PASS', 'COMPLETE'
FROM opportunities o WHERE o.listing_url = 'https://example-test-listing.invalid/TEST-SITRAK-C7H-001'
ON CONFLICT DO NOTHING;
