-- 004_opportunities.sql

CREATE SEQUENCE opportunity_code_seq_2026 START 1;

CREATE TABLE opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE, -- EBR-OPP-YYYY-NNNN, assigned by trigger below
  supplier_id UUID REFERENCES suppliers(id),
  platform TEXT NOT NULL CHECK (platform IN ('ALIBABA','MADE_IN_CHINA','SUPPLIER_WEBSITE','SEARCH_API','MANUAL','OTHER')),
  listing_url TEXT,
  brand TEXT NOT NULL DEFAULT 'SITRAK',
  model TEXT NOT NULL CHECK (model IN ('C7H','G7','C9H','OTHER')),
  configuration TEXT NOT NULL CHECK (configuration IN ('8x4','6x4','4x2','OTHER')),
  year INT,
  mileage_km INT,
  vin TEXT,
  engine TEXT,
  horsepower INT,
  gearbox TEXT,
  axles TEXT,
  asking_price NUMERIC(14,2),
  currency TEXT NOT NULL DEFAULT 'USD',
  fob_price NUMERIC(14,2),
  cif_price NUMERIC(14,2),
  location_city TEXT,
  location_province TEXT,
  description TEXT,
  availability TEXT CHECK (availability IN ('AVAILABLE','RESERVED','SOLD','UNKNOWN')) DEFAULT 'UNKNOWN',
  discovered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  compatibility_score INT CHECK (compatibility_score BETWEEN 0 AND 100),
  compatibility_breakdown JSONB,
  supplier_trust_score INT CHECK (supplier_trust_score BETWEEN 0 AND 100),
  mechanical_score INT CHECK (mechanical_score BETWEEN 0 AND 100),
  fraud_risk TEXT CHECK (fraud_risk IN ('LOW','MEDIUM','HIGH','CRITICAL')),
  best_value_score INT CHECK (best_value_score BETWEEN 0 AND 100),
  ai_recommendation TEXT,
  estimated_landed_cost NUMERIC(14,2),
  estimated_parts_value NUMERIC(14,2),
  duplicate_of UUID REFERENCES opportunities(id),
  status TEXT NOT NULL DEFAULT 'DISCOVERED' REFERENCES opportunity_statuses(code),
  status_reason TEXT,
  frozen_from_status TEXT REFERENCES opportunity_statuses(code),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_opportunities_updated_at BEFORE UPDATE ON opportunities
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE INDEX idx_opportunities_status ON opportunities (status);
CREATE INDEX idx_opportunities_supplier ON opportunities (supplier_id);
CREATE INDEX idx_opportunities_vin ON opportunities (vin) WHERE vin IS NOT NULL;

CREATE OR REPLACE FUNCTION generate_opportunity_code()
RETURNS TRIGGER AS $$
DECLARE
  seq_name TEXT := 'opportunity_code_seq_' || to_char(now(), 'YYYY');
  next_val BIGINT;
BEGIN
  IF NEW.code IS NOT NULL THEN
    RETURN NEW;
  END IF;
  IF to_regclass(seq_name) IS NULL THEN
    EXECUTE format('CREATE SEQUENCE %I START 1', seq_name);
  END IF;
  EXECUTE format('SELECT nextval(%L)', seq_name) INTO next_val;
  NEW.code := 'EBR-OPP-' || to_char(now(), 'YYYY') || '-' || lpad(next_val::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_opportunities_code BEFORE INSERT ON opportunities
  FOR EACH ROW EXECUTE FUNCTION generate_opportunity_code();

-- Enforce the state machine at the DB layer as a defense-in-depth backstop;
-- the primary enforcement lives in packages/shared/src/state-machine.ts.
CREATE OR REPLACE FUNCTION enforce_opportunity_transition()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = OLD.status THEN
      RETURN NEW;
    END IF;
    -- Resuming from FROZEN back to the status it was frozen from is always allowed.
    IF OLD.status = 'FROZEN' AND NEW.status = OLD.frozen_from_status THEN
      RETURN NEW;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM opportunity_status_transitions
      WHERE from_status = OLD.status AND to_status = NEW.status
    ) THEN
      RAISE EXCEPTION 'Invalid opportunity status transition: % -> %', OLD.status, NEW.status;
    END IF;
    IF NEW.status = 'FROZEN' THEN
      NEW.frozen_from_status := OLD.status;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_opportunities_status_guard BEFORE UPDATE ON opportunities
  FOR EACH ROW EXECUTE FUNCTION enforce_opportunity_transition();

CREATE TABLE truck_specs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id UUID NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  vin TEXT,
  chassis_number TEXT,
  first_registration_date DATE,
  engine_model TEXT,
  engine_serial TEXT,
  gearbox_model TEXT,
  gearbox_serial TEXT,
  front_axle_model TEXT,
  rear_axle_model TEXT,
  ecu_reference TEXT,
  cabin_generation TEXT,
  hydraulic_system TEXT,
  is_unknown_fields JSONB NOT NULL DEFAULT '[]', -- list of field names still UNKNOWN
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','CONFIRMED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_truck_specs_updated_at BEFORE UPDATE ON truck_specs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE UNIQUE INDEX idx_truck_specs_opportunity ON truck_specs (opportunity_id);

CREATE TABLE truck_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id UUID NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  document_id UUID REFERENCES documents(id),
  media_type TEXT NOT NULL CHECK (media_type IN ('PHOTO','VIDEO')),
  subject TEXT NOT NULL, -- e.g. VIN_PLATE, ENGINE_PLATE, COLD_START, UNDERBODY...
  perceptual_hash TEXT, -- used by WF-003 duplicate-photo detection
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','ARCHIVED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_truck_media_updated_at BEFORE UPDATE ON truck_media
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE INDEX idx_truck_media_opportunity ON truck_media (opportunity_id);
CREATE INDEX idx_truck_media_phash ON truck_media (perceptual_hash) WHERE perceptual_hash IS NOT NULL;
