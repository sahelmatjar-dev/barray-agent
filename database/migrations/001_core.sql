-- 001_core.sql
-- Core extensions, enums, updated_at trigger, users/roles/RBAC, system tables.

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Generic updated_at trigger function used by every table below.
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------------
-- Opportunity status machine (see docs/state-machine.md). Stored as TEXT with
-- a CHECK constraint (not a Postgres ENUM) so new statuses can be added by
-- migration without an unsafe ALTER TYPE ... ADD VALUE inside a transaction.
-- ---------------------------------------------------------------------------
CREATE TABLE opportunity_statuses (
  code TEXT PRIMARY KEY,
  sort_order INT NOT NULL,
  label_ar TEXT NOT NULL,
  label_fr TEXT NOT NULL,
  label_en TEXT NOT NULL
);

INSERT INTO opportunity_statuses (code, sort_order, label_ar, label_fr, label_en) VALUES
  ('DISCOVERED',            10, 'تم الاكتشاف',          'Découvert',              'Discovered'),
  ('SCREENING',             20, 'قيد الفرز',             'Filtrage',               'Screening'),
  ('SUPPLIER_REVIEW',       30, 'مراجعة المورد',         'Revue fournisseur',      'Supplier review'),
  ('SUPPLIER_APPROVAL',     40, 'بانتظار اعتماد المورد',  'Approbation fournisseur','Supplier approval'),
  ('RFQ_PENDING',           50, 'طلب عرض سعر معلق',      'RFQ en attente',         'RFQ pending'),
  ('RFQ_SENT',              60, 'تم إرسال طلب العرض',    'RFQ envoyé',             'RFQ sent'),
  ('QUOTE_RECEIVED',        70, 'تم استلام العرض',       'Devis reçu',             'Quote received'),
  ('NEGOTIATING',           80, 'قيد التفاوض',           'Négociation',            'Negotiating'),
  ('INSPECTION_PENDING',    90, 'بانتظار الفحص',         'Inspection en attente',  'Inspection pending'),
  ('INSPECTION_COMPLETE',  100, 'اكتمل الفحص',           'Inspection terminée',    'Inspection complete'),
  ('PURCHASE_APPROVAL',    110, 'بانتظار اعتماد الشراء',  'Approbation achat',      'Purchase approval'),
  ('APPROVED',             120, 'معتمد',                'Approuvé',               'Approved'),
  ('REJECTED',             130, 'مرفوض',                'Rejeté',                 'Rejected'),
  ('PURCHASED',            140, 'تم الشراء',             'Acheté',                 'Purchased'),
  ('DISMANTLING',          150, 'قيد التفكيك',           'Démontage',              'Dismantling'),
  ('PACKING',              160, 'قيد التعبئة',           'Emballage',              'Packing'),
  ('READY_TO_SHIP',        170, 'جاهز للشحن',            'Prêt à expédier',        'Ready to ship'),
  ('SHIPPED',              180, 'تم الشحن',              'Expédié',                'Shipped'),
  ('IN_TRANSIT',           190, 'في الطريق',             'En transit',             'In transit'),
  ('CUSTOMS',              200, 'الجمارك',               'Douane',                 'Customs'),
  ('RECEIVING',            210, 'قيد الاستلام',          'Réception en cours',     'Receiving'),
  ('RECEIVED',             220, 'تم الاستلام',           'Reçu',                   'Received'),
  ('CLOSED',               230, 'مغلق',                 'Clôturé',                'Closed'),
  ('FROZEN',               999, 'مجمد',                 'Gelé',                   'Frozen');

-- Allowed forward transitions (+ any status -> FROZEN, handled in app/service layer).
CREATE TABLE opportunity_status_transitions (
  from_status TEXT NOT NULL REFERENCES opportunity_statuses(code),
  to_status TEXT NOT NULL REFERENCES opportunity_statuses(code),
  PRIMARY KEY (from_status, to_status)
);

INSERT INTO opportunity_status_transitions (from_status, to_status) VALUES
  ('DISCOVERED','SCREENING'),
  ('SCREENING','SUPPLIER_REVIEW'),
  ('SCREENING','REJECTED'),
  ('SUPPLIER_REVIEW','SUPPLIER_APPROVAL'),
  ('SUPPLIER_REVIEW','REJECTED'),
  ('SUPPLIER_APPROVAL','RFQ_PENDING'),
  ('SUPPLIER_APPROVAL','REJECTED'),
  ('RFQ_PENDING','RFQ_SENT'),
  ('RFQ_SENT','QUOTE_RECEIVED'),
  ('QUOTE_RECEIVED','NEGOTIATING'),
  ('NEGOTIATING','INSPECTION_PENDING'),
  ('NEGOTIATING','REJECTED'),
  ('INSPECTION_PENDING','INSPECTION_COMPLETE'),
  ('INSPECTION_COMPLETE','PURCHASE_APPROVAL'),
  ('INSPECTION_COMPLETE','REJECTED'),
  ('PURCHASE_APPROVAL','APPROVED'),
  ('PURCHASE_APPROVAL','REJECTED'),
  ('APPROVED','PURCHASED'),
  ('PURCHASED','DISMANTLING'),
  ('DISMANTLING','PACKING'),
  ('PACKING','READY_TO_SHIP'),
  ('READY_TO_SHIP','SHIPPED'),
  ('SHIPPED','IN_TRANSIT'),
  ('IN_TRANSIT','CUSTOMS'),
  ('CUSTOMS','RECEIVING'),
  ('RECEIVING','RECEIVED'),
  ('RECEIVED','CLOSED');

-- Every status may transition to FROZEN, and FROZEN may resume to the status it was frozen from,
-- which the application records rather than the DB (see packages/shared/src/state-machine.ts).
INSERT INTO opportunity_status_transitions (from_status, to_status)
SELECT code, 'FROZEN' FROM opportunity_statuses WHERE code NOT IN ('FROZEN','CLOSED','REJECTED');

-- ---------------------------------------------------------------------------
-- Users / Roles / RBAC
-- ---------------------------------------------------------------------------
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  locale TEXT NOT NULL DEFAULT 'ar' CHECK (locale IN ('ar','fr','en')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_login_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','SUSPENDED','DISABLED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE CHECK (code IN (
    'OWNER','PROCUREMENT_MANAGER','FINANCE','MECHANIC','LOGISTICS','WAREHOUSE','VIEWER'
  )),
  name_ar TEXT NOT NULL,
  name_fr TEXT NOT NULL,
  name_en TEXT NOT NULL,
  permissions JSONB NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_roles_updated_at BEFORE UPDATE ON roles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role_id)
);

-- ---------------------------------------------------------------------------
-- System-wide tables: settings, audit, documents, alerts, notifications, runs
-- ---------------------------------------------------------------------------
CREATE TABLE system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value JSONB NOT NULL,
  description TEXT,
  updated_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_system_settings_updated_at BEFORE UPDATE ON system_settings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id UUID,
  old_value JSONB,
  new_value JSONB,
  reason TEXT,
  workflow_id TEXT,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_logs_entity ON audit_logs (entity, entity_id);
CREATE INDEX idx_audit_logs_user ON audit_logs (user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs (created_at);

CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity TEXT NOT NULL,
  entity_id UUID NOT NULL,
  category TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes BIGINT,
  drive_file_id TEXT,
  drive_path TEXT,
  checksum_sha256 TEXT,
  uploaded_by UUID REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','ARCHIVED','DELETED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_documents_entity ON documents (entity, entity_id);
CREATE TRIGGER trg_documents_updated_at BEFORE UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('INFO','WARNING','CRITICAL')),
  entity TEXT,
  entity_id UUID,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','ACKNOWLEDGED','RESOLVED')),
  acknowledged_by UUID REFERENCES users(id),
  acknowledged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_alerts_status ON alerts (status);
CREATE TRIGGER trg_alerts_updated_at BEFORE UPDATE ON alerts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('IN_APP','EMAIL','TELEGRAM')),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  link TEXT,
  read_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','SENT','FAILED','READ')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_notifications_user ON notifications (user_id, status);
CREATE TRIGGER trg_notifications_updated_at BEFORE UPDATE ON notifications
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- AI provider calls (packages/ai) for cost tracking / observability.
CREATE TABLE agent_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purpose TEXT NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('anthropic','openai')),
  model TEXT NOT NULL,
  entity TEXT,
  entity_id UUID,
  input JSONB,
  output JSONB,
  tokens_input INT,
  tokens_output INT,
  latency_ms INT,
  status TEXT NOT NULL DEFAULT 'SUCCESS' CHECK (status IN ('SUCCESS','FAILED')),
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_agent_runs_entity ON agent_runs (entity, entity_id);

-- n8n workflow execution log, written by the WF-*-error-handler pattern.
CREATE TABLE workflow_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_code TEXT NOT NULL,
  n8n_execution_id TEXT,
  entity TEXT,
  entity_id UUID,
  idempotency_key TEXT,
  status TEXT NOT NULL DEFAULT 'RUNNING' CHECK (status IN ('RUNNING','SUCCESS','FAILED','SKIPPED')),
  error TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ
);
CREATE UNIQUE INDEX idx_workflow_runs_idempotency ON workflow_runs (workflow_code, idempotency_key)
  WHERE idempotency_key IS NOT NULL;
CREATE INDEX idx_workflow_runs_entity ON workflow_runs (entity, entity_id);
