-- 006_negotiations.sql

CREATE TABLE negotiations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id UUID NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  quote_id UUID REFERENCES quotes(id),
  supplier_id UUID NOT NULL REFERENCES suppliers(id),
  asking_price NUMERIC(14,2) NOT NULL,
  ideal_price NUMERIC(14,2) NOT NULL,
  target_price NUMERIC(14,2) NOT NULL,
  maximum_price NUMERIC(14,2) NOT NULL,
  current_offer_price NUMERIC(14,2),
  current_counter_price NUMERIC(14,2),
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'NEGOTIATING' CHECK (status IN (
    'NEGOTIATING','TARGET_REACHED','MAXIMUM_EXCEEDED','MANUAL_REVIEW','CLOSED'
  )),
  CONSTRAINT chk_price_order CHECK (ideal_price <= target_price AND target_price <= maximum_price),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_negotiations_updated_at BEFORE UPDATE ON negotiations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE INDEX idx_negotiations_opportunity ON negotiations (opportunity_id);

-- Guard rail at the DB layer: the system may never record accepting a price
-- above maximum_price, and never a status implying an autonomous purchase commitment.
CREATE OR REPLACE FUNCTION enforce_negotiation_ceiling()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.current_counter_price IS NOT NULL AND NEW.current_counter_price > NEW.maximum_price THEN
    NEW.status := 'MAXIMUM_EXCEEDED';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_negotiations_ceiling BEFORE INSERT OR UPDATE ON negotiations
  FOR EACH ROW EXECUTE FUNCTION enforce_negotiation_ceiling();

CREATE TABLE negotiation_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  negotiation_id UUID NOT NULL REFERENCES negotiations(id) ON DELETE CASCADE,
  direction TEXT NOT NULL CHECK (direction IN ('OUTBOUND','INBOUND')),
  drafted_by_ai BOOLEAN NOT NULL DEFAULT false,
  approved_by UUID REFERENCES users(id),
  proposed_price NUMERIC(14,2),
  body TEXT NOT NULL,
  gmail_message_id TEXT,
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','PENDING_APPROVAL','SENT','RECEIVED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_negotiation_messages_updated_at BEFORE UPDATE ON negotiation_messages
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE INDEX idx_negotiation_messages_negotiation ON negotiation_messages (negotiation_id);
