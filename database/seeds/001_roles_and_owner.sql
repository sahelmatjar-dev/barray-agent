-- 001_roles_and_owner.sql
-- Safe to run multiple times (ON CONFLICT DO NOTHING / DO UPDATE).

INSERT INTO roles (code, name_ar, name_fr, name_en, permissions) VALUES
  ('OWNER', 'المالك', 'Propriétaire', 'Owner', '["*"]'),
  ('PROCUREMENT_MANAGER', 'مدير المشتريات', 'Responsable achats', 'Procurement Manager',
    '["opportunities:*","suppliers:*","rfqs:*","quotes:*","negotiations:*"]'),
  ('FINANCE', 'المالية', 'Finance', 'Finance',
    '["payments:*","landed_costs:read","claims:read","reports:read"]'),
  ('MECHANIC', 'الميكانيكي', 'Mécanicien', 'Mechanic',
    '["inspections:*","dismantling:*","fleet:read"]'),
  ('LOGISTICS', 'اللوجستيك', 'Logistique', 'Logistics',
    '["freight:*","shipments:*","customs:read","containers:*"]'),
  ('WAREHOUSE', 'المستودع', 'Entrepôt', 'Warehouse',
    '["inventory:*","receiving:*","warehouses:*"]'),
  ('VIEWER', 'مشاهد', 'Lecteur', 'Viewer', '["*:read"]')
ON CONFLICT (code) DO NOTHING;

-- Default owner account for first login. Password is bcrypt hash of "ChangeMe123!"
-- Rotate it immediately after first login (see README "How to create the first user").
INSERT INTO users (email, full_name, password_hash, locale, status)
VALUES ('owner@elbarrayra.test', 'EL BARRAY RA Owner', '$2a$10$mowNIM/kwR3BGqfv9ykLzOlKPqnKOk239a/lHzsFcbPxSaNQelhxa', 'ar', 'ACTIVE')
ON CONFLICT (email) DO NOTHING;

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u, roles r
WHERE u.email = 'owner@elbarrayra.test' AND r.code = 'OWNER'
ON CONFLICT DO NOTHING;

INSERT INTO system_settings (key, value, description) VALUES
  ('compatibility_weights',
    '{"engine":25,"gearbox":20,"axles":15,"ecu":15,"cabin":10,"hydraulic":10,"other":5}',
    'Compatibility engine weights (must sum to 100)'),
  ('supplier_trust_weights',
    '{"legal_existence":20,"years_active":10,"third_party_audit":15,"truck_specialization":15,"bank_account_match":15,"digital_presence":10,"export_evidence":10,"communication_quality":5}',
    'Supplier trust engine weights (must sum to 100)'),
  ('supplier_trust_risk_bands',
    '{"low_risk_min":85,"acceptable_min":70,"manual_review_min":65}',
    'Supplier trust risk group thresholds'),
  ('best_value_weights',
    '{"compatibility":30,"mechanical":20,"supplier_trust":15,"price":15,"mileage":5,"year":5,"documentation":5,"logistics":5}',
    'Quote best-value score weights (must sum to 100)'),
  ('rfq_follow_up_schedule',
    '{"follow_up_1_hours":48,"follow_up_2_additional_hours":72,"no_response_additional_hours":120}',
    'RFQ follow-up cadence, configurable per company policy'),
  ('ai_provider', '"anthropic"', 'Active AI provider: anthropic | openai')
ON CONFLICT (key) DO NOTHING;
