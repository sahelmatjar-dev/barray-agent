-- 002_fleet.sql
-- EL BARRAY RA's own operating fleet (the trucks that RECEIVE donor parts).

CREATE TABLE fleet_trucks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_number TEXT NOT NULL UNIQUE,
  vin TEXT UNIQUE,
  brand TEXT NOT NULL DEFAULT 'SITRAK',
  model TEXT NOT NULL CHECK (model IN ('C7H','G7','C9H','OTHER')),
  configuration TEXT NOT NULL CHECK (configuration IN ('8x4','6x4','4x2','OTHER')),
  year INT,
  engine_model TEXT,
  engine_serial TEXT,
  gearbox_model TEXT,
  gearbox_serial TEXT,
  front_axle_model TEXT,
  rear_axle_model TEXT,
  ecu_reference TEXT,
  cabin_generation TEXT,
  hydraulic_system TEXT,
  odometer_km INT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','IN_MAINTENANCE','OUT_OF_SERVICE','SOLD')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_fleet_trucks_updated_at BEFORE UPDATE ON fleet_trucks
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE INDEX idx_fleet_trucks_model ON fleet_trucks (model, configuration);

-- Traceability: Chinese donor VIN -> imported part -> EL BARRAY RA fleet truck.
-- References `parts` (created in 009_donor_dismantling.sql) so this table is
-- declared there instead; see part_installations in that migration.
