-- 007_inspections.sql

CREATE TABLE inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id UUID NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  inspector_name TEXT,
  inspection_date DATE,
  mechanical_score INT CHECK (mechanical_score BETWEEN 0 AND 100),
  score_breakdown JSONB,
  recommendation TEXT CHECK (recommendation IN ('PASS','MANUAL_REVIEW','REJECT')),
  video_document_ids UUID[] NOT NULL DEFAULT '{}',
  photo_document_ids UUID[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN (
    'PENDING','IN_PROGRESS','COMPLETE','APPROVED','REJECTED'
  )),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_inspections_updated_at BEFORE UPDATE ON inspections
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE INDEX idx_inspections_opportunity ON inspections (opportunity_id);

-- One row per checklist item defined in packages/shared/src/inspection-checklist.ts
-- (engine: cold_start, smoke, blow_by, oil_pressure, leaks, noise, turbo, coolant, injectors;
--  gearbox: shifting, noise, leaks, clutch; axles: differential_noise, leaks, bearings;
--  chassis: cracks, welding, deformation, accident_evidence;
--  electronics: fault_codes, ecu, dashboard, sensors;
--  hydraulic: pto, pump, cylinder, hoses)
CREATE TABLE inspection_findings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id UUID NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('ENGINE','GEARBOX','AXLES','CHASSIS','ELECTRONICS','HYDRAULIC')),
  item_code TEXT NOT NULL,
  result TEXT NOT NULL CHECK (result IN ('PASS','WARNING','FAIL','UNKNOWN')),
  weight INT NOT NULL DEFAULT 1,
  notes TEXT,
  photo_document_id UUID REFERENCES documents(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (inspection_id, category, item_code)
);
CREATE INDEX idx_inspection_findings_inspection ON inspection_findings (inspection_id);
