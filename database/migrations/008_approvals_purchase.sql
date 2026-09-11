-- 008_approvals_purchase.sql
-- The four hard human approval gates: APPROVE SUPPLIER, APPROVE INSPECTION,
-- APPROVE PURCHASE, RELEASE PAYMENT. No workflow may write these rows except
-- through an authenticated user action (see packages/shared/src/approval-gates.ts).

CREATE TABLE approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gate TEXT NOT NULL CHECK (gate IN (
    'APPROVE_SUPPLIER','APPROVE_INSPECTION','APPROVE_PURCHASE','RELEASE_PAYMENT'
  )),
  entity TEXT NOT NULL, -- 'supplier' | 'inspection' | 'opportunity' | 'payment'
  entity_id UUID NOT NULL,
  requested_by UUID REFERENCES users(id),
  decided_by UUID REFERENCES users(id),
  decision TEXT NOT NULL DEFAULT 'PENDING' CHECK (decision IN (
    'PENDING','APPROVED','REJECTED','MORE_INFO_REQUESTED'
  )),
  decision_reason TEXT,
  snapshot JSONB NOT NULL, -- full context shown to the approver at decision time
  decided_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','APPROVED','REJECTED','MORE_INFO_REQUESTED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_approvals_updated_at BEFORE UPDATE ON approvals
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE INDEX idx_approvals_entity ON approvals (entity, entity_id);
CREATE INDEX idx_approvals_gate_status ON approvals (gate, status);

CREATE TABLE purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  opportunity_id UUID NOT NULL REFERENCES opportunities(id),
  supplier_id UUID NOT NULL REFERENCES suppliers(id),
  approval_id UUID REFERENCES approvals(id), -- must reference an APPROVE_PURCHASE approval
  agreed_price NUMERIC(14,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  incoterm TEXT CHECK (incoterm IN ('FOB','CIF','EXW','OTHER')),
  delivery_port TEXT,
  contract_document_id UUID REFERENCES documents(id),
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN (
    'DRAFT','PENDING_APPROVAL','APPROVED','ISSUED','FULFILLED','CANCELLED'
  )),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_purchase_orders_updated_at BEFORE UPDATE ON purchase_orders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE INDEX idx_purchase_orders_opportunity ON purchase_orders (opportunity_id);

-- A PO can never be marked APPROVED/ISSUED without a linked, decided, APPROVED approval row.
CREATE OR REPLACE FUNCTION enforce_po_approval_gate()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IN ('APPROVED','ISSUED') THEN
    IF NEW.approval_id IS NULL THEN
      RAISE EXCEPTION 'Purchase order % cannot be % without an APPROVE_PURCHASE approval', NEW.code, NEW.status;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM approvals
      WHERE id = NEW.approval_id AND gate = 'APPROVE_PURCHASE' AND decision = 'APPROVED'
    ) THEN
      RAISE EXCEPTION 'Purchase order % approval_id does not reference a decided APPROVE_PURCHASE approval', NEW.code;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_purchase_orders_gate BEFORE INSERT OR UPDATE ON purchase_orders
  FOR EACH ROW EXECUTE FUNCTION enforce_po_approval_gate();

CREATE TABLE purchase_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  unit_price NUMERIC(14,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_po_items_po ON purchase_order_items (purchase_order_id);

-- Payments: final release is NEVER automated. release_approval_id must reference
-- a decided RELEASE_PAYMENT approval before status can move to RELEASED.
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id),
  release_approval_id UUID REFERENCES approvals(id),
  amount NUMERIC(14,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  payment_type TEXT NOT NULL CHECK (payment_type IN ('DEPOSIT','BALANCE','FULL')),
  beneficiary_bank_account_id UUID REFERENCES supplier_bank_accounts(id),
  method TEXT CHECK (method IN ('WIRE','LC','OTHER')),
  reference TEXT,
  released_by UUID REFERENCES users(id),
  released_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'PENDING_VERIFICATION' CHECK (status IN (
    'PENDING_VERIFICATION','VERIFIED','PENDING_RELEASE','RELEASED','REJECTED','FROZEN'
  )),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_payments_updated_at BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE INDEX idx_payments_po ON payments (purchase_order_id);

CREATE OR REPLACE FUNCTION enforce_payment_release_gate()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'RELEASED' THEN
    IF NEW.release_approval_id IS NULL THEN
      RAISE EXCEPTION 'Payment % cannot be RELEASED without a RELEASE_PAYMENT approval', NEW.id;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM approvals
      WHERE id = NEW.release_approval_id AND gate = 'RELEASE_PAYMENT' AND decision = 'APPROVED'
    ) THEN
      RAISE EXCEPTION 'Payment % release_approval_id does not reference a decided RELEASE_PAYMENT approval', NEW.id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_payments_gate BEFORE INSERT OR UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION enforce_payment_release_gate();

CREATE TABLE payment_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  check_type TEXT NOT NULL CHECK (check_type IN (
    'BANK_NAME_MATCH','ACCOUNT_NOT_PERSONAL','ACCOUNT_UNCHANGED','AMOUNT_MATCHES_PO','SUPPLIER_NOT_FROZEN'
  )),
  passed BOOLEAN NOT NULL,
  details TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_payment_verifications_payment ON payment_verifications (payment_id);
