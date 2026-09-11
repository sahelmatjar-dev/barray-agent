-- 003_suppliers.sql

CREATE TABLE suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  legal_name TEXT NOT NULL,
  trade_name TEXT,
  country TEXT NOT NULL DEFAULT 'CN',
  province TEXT,
  city TEXT,
  business_license_number TEXT,
  legal_existence_verified BOOLEAN NOT NULL DEFAULT false,
  years_active INT,
  is_truck_specialist BOOLEAN NOT NULL DEFAULT false,
  third_party_audit BOOLEAN NOT NULL DEFAULT false,
  export_evidence BOOLEAN NOT NULL DEFAULT false,
  website TEXT,
  digital_presence_score INT CHECK (digital_presence_score BETWEEN 0 AND 100),
  communication_quality_score INT CHECK (communication_quality_score BETWEEN 0 AND 100),
  trust_score INT CHECK (trust_score BETWEEN 0 AND 100),
  trust_risk_group TEXT CHECK (trust_risk_group IN ('LOW_RISK','ACCEPTABLE','MANUAL_REVIEW','HIGH_RISK')),
  trust_score_breakdown JSONB,
  fraud_risk TEXT CHECK (fraud_risk IN ('LOW','MEDIUM','HIGH','CRITICAL')),
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING_REVIEW' CHECK (status IN (
    'PENDING_REVIEW','APPROVED','REJECTED','SUSPENDED','FROZEN'
  )),
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_suppliers_updated_at BEFORE UPDATE ON suppliers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE INDEX idx_suppliers_status ON suppliers (status);

CREATE TABLE supplier_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  role TEXT,
  phone TEXT,
  wechat TEXT,
  email TEXT,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','INACTIVE')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_supplier_contacts_updated_at BEFORE UPDATE ON supplier_contacts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE INDEX idx_supplier_contacts_supplier ON supplier_contacts (supplier_id);

CREATE TABLE supplier_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  document_id UUID REFERENCES documents(id),
  doc_type TEXT NOT NULL CHECK (doc_type IN (
    'BUSINESS_LICENSE','EXPORT_LICENSE','AUDIT_REPORT','ID_CARD','OTHER'
  )),
  verified BOOLEAN NOT NULL DEFAULT false,
  verified_by UUID REFERENCES users(id),
  verified_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','VERIFIED','REJECTED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_supplier_documents_updated_at BEFORE UPDATE ON supplier_documents
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE INDEX idx_supplier_documents_supplier ON supplier_documents (supplier_id);

-- Bank accounts: every change is audit-logged (see packages/shared bank-account service).
-- A change of "verified" active account, or a personal-name account, feeds fraud detection.
CREATE TABLE supplier_bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  account_holder_name TEXT NOT NULL,
  is_personal_account BOOLEAN NOT NULL DEFAULT false,
  bank_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  swift_code TEXT,
  bank_branch TEXT,
  matches_company_name BOOLEAN,
  is_active BOOLEAN NOT NULL DEFAULT true,
  status TEXT NOT NULL DEFAULT 'UNVERIFIED' CHECK (status IN ('UNVERIFIED','VERIFIED','FLAGGED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_supplier_bank_accounts_updated_at BEFORE UPDATE ON supplier_bank_accounts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE INDEX idx_supplier_bank_accounts_supplier ON supplier_bank_accounts (supplier_id);
