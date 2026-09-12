-- 009_donor_dismantling.sql

CREATE SEQUENCE donor_truck_code_seq START 1;

CREATE TABLE donor_trucks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE, -- EBR-CN-NNN
  opportunity_id UUID NOT NULL REFERENCES opportunities(id),
  purchase_order_id UUID REFERENCES purchase_orders(id),
  vin TEXT,
  brand TEXT NOT NULL DEFAULT 'SITRAK',
  model TEXT NOT NULL,
  configuration TEXT NOT NULL,
  year INT,
  status TEXT NOT NULL DEFAULT 'PURCHASED' CHECK (status IN (
    'PURCHASED','AWAITING_DISMANTLING','DISMANTLING','DISMANTLED','CLOSED'
  )),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_donor_trucks_updated_at BEFORE UPDATE ON donor_trucks
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE FUNCTION generate_donor_truck_code()
RETURNS TRIGGER AS $$
DECLARE next_val BIGINT;
BEGIN
  IF NEW.code IS NOT NULL THEN
    RETURN NEW;
  END IF;
  SELECT nextval('donor_truck_code_seq') INTO next_val;
  NEW.code := 'EBR-CN-' || lpad(next_val::TEXT, 3, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_donor_trucks_code BEFORE INSERT ON donor_trucks
  FOR EACH ROW EXECUTE FUNCTION generate_donor_truck_code();

-- Parts harvested from a donor truck. part_code e.g. EBR-CN-001-ENG.
CREATE TABLE parts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  part_code TEXT NOT NULL UNIQUE,
  donor_truck_id UUID NOT NULL REFERENCES donor_trucks(id) ON DELETE CASCADE,
  part_type TEXT NOT NULL CHECK (part_type IN (
    'ENGINE','GEARBOX','FRONT_AXLE_1','FRONT_AXLE_2','REAR_AXLE_1','REAR_AXLE_2',
    'CABIN','ECU','HYDRAULIC','TURBO','COOLING','ELECTRICAL','OTHER'
  )),
  part_suffix TEXT NOT NULL, -- ENG, GBX, FAX1, FAX2, RAX1, RAX2, CAB, ECU, HYD...
  description TEXT,
  condition TEXT NOT NULL DEFAULT 'UNKNOWN' CHECK (condition IN (
    'NEW','USED_GOOD','USED_FAIR','FOR_PARTS','SCRAP','UNKNOWN'
  )),
  estimated_replacement_value NUMERIC(14,2), -- for ROI calculation
  qr_code_url TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING_DISMANTLING' CHECK (status IN (
    'PENDING_DISMANTLING','DISMANTLED','PACKED','SHIPPED','RECEIVED',
    'AVAILABLE','RESERVED','INSTALLED','UNDER_TEST','DAMAGED','SOLD','SCRAPPED'
  )),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_parts_updated_at BEFORE UPDATE ON parts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE INDEX idx_parts_donor_truck ON parts (donor_truck_id);

CREATE OR REPLACE FUNCTION generate_part_code()
RETURNS TRIGGER AS $$
DECLARE donor_code TEXT;
BEGIN
  IF NEW.part_code IS NOT NULL THEN
    RETURN NEW;
  END IF;
  SELECT code INTO donor_code FROM donor_trucks WHERE id = NEW.donor_truck_id;
  NEW.part_code := donor_code || '-' || NEW.part_suffix;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_parts_code BEFORE INSERT ON parts
  FOR EACH ROW EXECUTE FUNCTION generate_part_code();

-- Deterministic compatibility engine writes rows here per (part_type, fleet model/config).
CREATE TABLE part_compatibility (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  part_id UUID NOT NULL REFERENCES parts(id) ON DELETE CASCADE,
  fleet_truck_id UUID REFERENCES fleet_trucks(id),
  component TEXT NOT NULL, -- engine|gearbox|axles|ecu|cabin|hydraulic|other
  match_type TEXT NOT NULL CHECK (match_type IN ('EXACT_MATCH','PARTIAL_MATCH','MISMATCH','UNKNOWN')),
  reason_code TEXT NOT NULL, -- e.g. engine_exact_match, ecu_unknown
  score_contribution NUMERIC(6,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_part_compatibility_part ON part_compatibility (part_id);

-- Traceability: Chinese donor VIN -> imported part -> EL BARRAY RA fleet truck.
CREATE TABLE part_installations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  part_id UUID NOT NULL REFERENCES parts(id),
  fleet_truck_id UUID NOT NULL REFERENCES fleet_trucks(id),
  installation_date DATE NOT NULL,
  odometer_at_installation INT,
  technician TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','REMOVED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_part_installations_updated_at BEFORE UPDATE ON part_installations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE INDEX idx_part_installations_fleet_truck ON part_installations (fleet_truck_id);
CREATE INDEX idx_part_installations_part ON part_installations (part_id);

-- Dismantling work orders. Hard rules enforced in app layer:
-- never open engine/gearbox, never cut wiring harness, label connectors,
-- store bolts/supports, drain fluids, before/after photos required to close.
CREATE TABLE dismantling_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  donor_truck_id UUID NOT NULL REFERENCES donor_trucks(id) ON DELETE CASCADE,
  assigned_to TEXT,
  rules_acknowledged BOOLEAN NOT NULL DEFAULT false,
  fluids_drained BOOLEAN NOT NULL DEFAULT false,
  connectors_labeled BOOLEAN NOT NULL DEFAULT false,
  before_photos_document_ids UUID[] NOT NULL DEFAULT '{}',
  after_photos_document_ids UUID[] NOT NULL DEFAULT '{}',
  proof_document_id UUID REFERENCES documents(id),
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN (
    'PENDING','IN_PROGRESS','COMPLETE','BLOCKED'
  )),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_dismantling_jobs_updated_at BEFORE UPDATE ON dismantling_jobs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE INDEX idx_dismantling_jobs_donor ON dismantling_jobs (donor_truck_id);

CREATE TABLE dismantling_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dismantling_job_id UUID NOT NULL REFERENCES dismantling_jobs(id) ON DELETE CASCADE,
  part_id UUID NOT NULL REFERENCES parts(id),
  forbidden_action_attempted TEXT, -- populated only if a rule violation was flagged
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','DONE','SKIPPED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_dismantling_items_updated_at BEFORE UPDATE ON dismantling_items
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE INDEX idx_dismantling_items_job ON dismantling_items (dismantling_job_id);
