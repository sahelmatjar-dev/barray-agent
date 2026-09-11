-- 010_packing_freight.sql

CREATE TABLE packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id TEXT NOT NULL UNIQUE, -- human-readable, e.g. EBR-CN-001-PKG-01
  donor_id UUID NOT NULL REFERENCES donor_trucks(id),
  part_id UUID NOT NULL REFERENCES parts(id),
  part_description TEXT NOT NULL,
  gross_weight_kg NUMERIC(10,2),
  net_weight_kg NUMERIC(10,2),
  length_cm NUMERIC(10,2),
  width_cm NUMERIC(10,2),
  height_cm NUMERIC(10,2),
  cbm NUMERIC(10,3), -- computed by app: L*W*H/1,000,000 (cm) kept for audit, never AI-derived
  packing_type TEXT CHECK (packing_type IN ('WOODEN_CRATE','PALLET','CARTON','BARE','OTHER')),
  photo_document_id UUID REFERENCES documents(id),
  candidate_hs_code TEXT,
  condition TEXT NOT NULL DEFAULT 'UNKNOWN' CHECK (condition IN ('NEW','USED_GOOD','USED_FAIR','FOR_PARTS','SCRAP','UNKNOWN')),
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','PACKED','LOADED','SHIPPED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_packages_updated_at BEFORE UPDATE ON packages
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE INDEX idx_packages_donor ON packages (donor_id);

CREATE TABLE packing_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  donor_id UUID NOT NULL REFERENCES donor_trucks(id),
  container_id UUID, -- FK added after containers table below
  document_id UUID REFERENCES documents(id),
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','FINAL','SUPERSEDED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_packing_lists_updated_at BEFORE UPDATE ON packing_lists
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE packing_list_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  packing_list_id UUID NOT NULL REFERENCES packing_lists(id) ON DELETE CASCADE,
  package_id UUID NOT NULL REFERENCES packages(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_packing_list_items_list ON packing_list_items (packing_list_id);

CREATE TABLE freight_forwarders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  contact_name TEXT,
  phone TEXT,
  email TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','INACTIVE')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_freight_forwarders_updated_at BEFORE UPDATE ON freight_forwarders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE freight_quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  freight_forwarder_id UUID NOT NULL REFERENCES freight_forwarders(id),
  donor_id UUID REFERENCES donor_trucks(id),
  container_type TEXT NOT NULL CHECK (container_type IN ('20GP','40GP','40HQ','FLAT_RACK','OPEN_TOP','LCL','BREAK_BULK')),
  origin_port TEXT NOT NULL CHECK (origin_port IN ('QINGDAO','SHANGHAI','NINGBO')),
  destination_port TEXT NOT NULL CHECK (destination_port IN ('TANGER_MED','CASABLANCA')),
  origin_charges NUMERIC(14,2) DEFAULT 0,
  china_transport NUMERIC(14,2) DEFAULT 0,
  ocean_freight NUMERIC(14,2) DEFAULT 0,
  insurance NUMERIC(14,2) DEFAULT 0,
  destination_charges NUMERIC(14,2) DEFAULT 0,
  broker_fee NUMERIC(14,2) DEFAULT 0,
  morocco_inland_transport NUMERIC(14,2) DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  transit_days INT,
  valid_until DATE,
  status TEXT NOT NULL DEFAULT 'RECEIVED' CHECK (status IN ('RECEIVED','SELECTED','REJECTED','EXPIRED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_freight_quotes_updated_at BEFORE UPDATE ON freight_quotes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE INDEX idx_freight_quotes_donor ON freight_quotes (donor_id);

CREATE TABLE containers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  container_number TEXT UNIQUE,
  container_type TEXT NOT NULL CHECK (container_type IN ('20GP','40GP','40HQ','FLAT_RACK','OPEN_TOP','LCL','BREAK_BULK')),
  freight_forwarder_id UUID REFERENCES freight_forwarders(id),
  freight_quote_id UUID REFERENCES freight_quotes(id),
  status TEXT NOT NULL DEFAULT 'PLANNED' CHECK (status IN (
    'PLANNED','LOADING','LOADED','SHIPPED','ARRIVED','EMPTIED'
  )),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_containers_updated_at BEFORE UPDATE ON containers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE packing_lists
  ADD CONSTRAINT fk_packing_lists_container FOREIGN KEY (container_id) REFERENCES containers(id);
