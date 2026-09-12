-- 012_warehouse_inventory.sql

CREATE TABLE warehouses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  city TEXT,
  address TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','INACTIVE')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_warehouses_updated_at BEFORE UPDATE ON warehouses
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Hierarchy: Warehouse -> Zone -> Rack -> Shelf, modeled as a self-referencing tree.
CREATE TABLE warehouse_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_id UUID NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  parent_location_id UUID REFERENCES warehouse_locations(id) ON DELETE CASCADE,
  level TEXT NOT NULL CHECK (level IN ('ZONE','RACK','SHELF')),
  code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','INACTIVE')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (warehouse_id, parent_location_id, level, code)
);
CREATE TRIGGER trg_warehouse_locations_updated_at BEFORE UPDATE ON warehouse_locations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  part_id UUID NOT NULL REFERENCES parts(id),
  warehouse_location_id UUID REFERENCES warehouse_locations(id),
  quantity INT NOT NULL DEFAULT 1,
  part_status TEXT NOT NULL DEFAULT 'AVAILABLE' CHECK (part_status IN (
    'AVAILABLE','RESERVED','INSTALLED','UNDER_TEST','DAMAGED','SOLD','SCRAPPED'
  )),
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','ARCHIVED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (part_id)
);
CREATE TRIGGER trg_inventory_updated_at BEFORE UPDATE ON inventory
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE INDEX idx_inventory_status ON inventory (part_status);

CREATE TABLE inventory_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_id UUID NOT NULL REFERENCES inventory(id) ON DELETE CASCADE,
  movement_type TEXT NOT NULL CHECK (movement_type IN (
    'RECEIVED','MOVED','RESERVED','RELEASED','INSTALLED','REMOVED','SOLD','SCRAPPED','ADJUSTED'
  )),
  from_location_id UUID REFERENCES warehouse_locations(id),
  to_location_id UUID REFERENCES warehouse_locations(id),
  quantity_delta INT NOT NULL DEFAULT 0,
  reason TEXT,
  performed_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_inventory_movements_inventory ON inventory_movements (inventory_id);

CREATE TABLE receiving_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id UUID NOT NULL REFERENCES shipments(id),
  container_id UUID REFERENCES containers(id),
  received_by UUID REFERENCES users(id),
  received_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','IN_PROGRESS','COMPLETE','DISCREPANCY')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_receiving_reports_updated_at BEFORE UPDATE ON receiving_reports
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE receiving_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receiving_report_id UUID NOT NULL REFERENCES receiving_reports(id) ON DELETE CASCADE,
  package_id UUID REFERENCES packages(id),
  part_id UUID REFERENCES parts(id),
  expected_quantity INT NOT NULL DEFAULT 1,
  received_quantity INT NOT NULL DEFAULT 0,
  condition_on_arrival TEXT CHECK (condition_on_arrival IN ('GOOD','DAMAGED','MISSING')),
  photo_document_id UUID REFERENCES documents(id),
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','MATCHED','DISCREPANCY')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_receiving_items_updated_at BEFORE UPDATE ON receiving_items
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE INDEX idx_receiving_items_report ON receiving_items (receiving_report_id);
