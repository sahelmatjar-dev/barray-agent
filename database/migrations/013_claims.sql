-- 013_claims.sql
-- Claim drafts are always created in DRAFT status. Sending to the supplier or
-- forwarder is a manual action unless auto-send is explicitly enabled in
-- system_settings (see docs/safety-rules.md).

CREATE TABLE claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  donor_id UUID REFERENCES donor_trucks(id),
  receiving_report_id UUID REFERENCES receiving_reports(id),
  purchase_order_id UUID REFERENCES purchase_orders(id),
  claim_type TEXT NOT NULL CHECK (claim_type IN ('DAMAGE','MISSING_ITEM','WRONG_ITEM','OTHER')),
  claim_amount NUMERIC(14,2),
  currency TEXT NOT NULL DEFAULT 'USD',
  supporting_document_ids UUID[] NOT NULL DEFAULT '{}', -- PO, invoice, packing list, photos
  auto_send_enabled BOOLEAN NOT NULL DEFAULT false,
  sent_at TIMESTAMPTZ,
  sent_by UUID REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN (
    'DRAFT','PENDING_REVIEW','SENT','ACKNOWLEDGED','RESOLVED','REJECTED'
  )),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_claims_updated_at BEFORE UPDATE ON claims
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE INDEX idx_claims_donor ON claims (donor_id);

-- A claim can never be SENT unless auto_send_enabled OR sent_by is a real user
-- (i.e. someone manually triggered the send).
CREATE OR REPLACE FUNCTION enforce_claim_send_gate()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'SENT' AND NEW.auto_send_enabled = false AND NEW.sent_by IS NULL THEN
    RAISE EXCEPTION 'Claim % cannot be SENT automatically unless auto_send_enabled is true', NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_claims_gate BEFORE INSERT OR UPDATE ON claims
  FOR EACH ROW EXECUTE FUNCTION enforce_claim_send_gate();

CREATE TABLE claim_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id UUID NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
  package_id UUID REFERENCES packages(id),
  part_id UUID REFERENCES parts(id),
  description TEXT NOT NULL,
  amount NUMERIC(14,2),
  currency TEXT NOT NULL DEFAULT 'USD',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_claim_items_claim ON claim_items (claim_id);
