-- 011_shipping_customs.sql

CREATE TABLE shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  container_id UUID NOT NULL REFERENCES containers(id),
  booking_number TEXT,
  bl_number TEXT,
  shipping_line TEXT,
  vessel TEXT,
  etd DATE,
  eta DATE,
  original_eta DATE,
  origin_port TEXT NOT NULL CHECK (origin_port IN ('QINGDAO','SHANGHAI','NINGBO')),
  destination_port TEXT NOT NULL CHECK (destination_port IN ('TANGER_MED','CASABLANCA')),
  latest_status TEXT NOT NULL DEFAULT 'BOOKED' CHECK (latest_status IN (
    'BOOKED','LOADED','DEPARTED','IN_TRANSIT','ARRIVED','DELIVERED','DELAYED'
  )),
  status TEXT NOT NULL DEFAULT 'BOOKED' CHECK (status IN (
    'BOOKED','LOADED','DEPARTED','IN_TRANSIT','ARRIVED','DELIVERED','DELAYED'
  )),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_shipments_updated_at BEFORE UPDATE ON shipments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE INDEX idx_shipments_container ON shipments (container_id);

-- WF-022 raises an alert when |eta - original_eta| > 2 days.
CREATE TABLE shipment_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id UUID NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_location TEXT,
  event_at TIMESTAMPTZ NOT NULL,
  raw_payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_shipment_events_shipment ON shipment_events (shipment_id);

-- Customs classification is NEVER auto-confirmed. candidate_hs_code always
-- requires customs_verified = false until a human sets it true.
CREATE TABLE customs_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id UUID REFERENCES shipments(id),
  donor_id UUID REFERENCES donor_trucks(id),
  package_id UUID REFERENCES packages(id),
  candidate_hs_code TEXT,
  confidence NUMERIC(5,2),
  source TEXT NOT NULL CHECK (source IN ('AI_SUGGESTION','BROKER','MANUAL','HISTORICAL')),
  reason TEXT,
  customs_verified BOOLEAN NOT NULL DEFAULT false,
  verified_by UUID REFERENCES users(id),
  verified_at TIMESTAMPTZ,
  complete_vehicle_flag BOOLEAN NOT NULL DEFAULT false, -- GIR 2(a) risk flag
  complete_vehicle_flag_reason TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING_REVIEW' CHECK (status IN (
    'PENDING_REVIEW','VERIFIED','ESCALATED','CLEARED'
  )),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_customs_records_updated_at BEFORE UPDATE ON customs_records
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE INDEX idx_customs_records_donor ON customs_records (donor_id);

-- A verified record can never silently flip back to a machine-picked code.
CREATE OR REPLACE FUNCTION enforce_customs_verification()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.customs_verified = true AND NEW.verified_by IS NULL THEN
    RAISE EXCEPTION 'customs_records.customs_verified cannot be true without verified_by';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_customs_records_gate BEFORE INSERT OR UPDATE ON customs_records
  FOR EACH ROW EXECUTE FUNCTION enforce_customs_verification();

CREATE TABLE expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  donor_id UUID REFERENCES donor_trucks(id),
  category TEXT NOT NULL CHECK (category IN (
    'INSPECTION','DISMANTLING','PACKING','CHINA_TRANSPORT','EXPORT_FEES','FREIGHT',
    'INSURANCE','DESTINATION_CHARGES','CUSTOMS_DUTY','VAT','CUSTOMS_BROKER',
    'MOROCCO_TRANSPORT','MISCELLANEOUS'
  )),
  amount NUMERIC(14,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  document_id UUID REFERENCES documents(id),
  status TEXT NOT NULL DEFAULT 'RECORDED' CHECK (status IN ('RECORDED','RECONCILED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_expenses_updated_at BEFORE UPDATE ON expenses
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE INDEX idx_expenses_donor ON expenses (donor_id);

-- One row per donor truck: deterministic total computed in code
-- (packages/shared/src/landed-cost.ts), never by the AI layer.
CREATE TABLE landed_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  donor_id UUID NOT NULL UNIQUE REFERENCES donor_trucks(id),
  purchase_price NUMERIC(14,2) NOT NULL DEFAULT 0,
  inspection NUMERIC(14,2) NOT NULL DEFAULT 0,
  dismantling NUMERIC(14,2) NOT NULL DEFAULT 0,
  packing NUMERIC(14,2) NOT NULL DEFAULT 0,
  china_transport NUMERIC(14,2) NOT NULL DEFAULT 0,
  export_fees NUMERIC(14,2) NOT NULL DEFAULT 0,
  freight NUMERIC(14,2) NOT NULL DEFAULT 0,
  insurance NUMERIC(14,2) NOT NULL DEFAULT 0,
  destination_charges NUMERIC(14,2) NOT NULL DEFAULT 0,
  customs_duty NUMERIC(14,2) NOT NULL DEFAULT 0,
  vat NUMERIC(14,2) NOT NULL DEFAULT 0,
  customs_broker NUMERIC(14,2) NOT NULL DEFAULT 0,
  morocco_transport NUMERIC(14,2) NOT NULL DEFAULT 0,
  miscellaneous NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_landed_cost NUMERIC(14,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'ESTIMATED' CHECK (status IN ('ESTIMATED','FINAL')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_landed_costs_updated_at BEFORE UPDATE ON landed_costs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
