-- Migration 001: Improved Inspections
ALTER TABLE safety_inspections
  ADD COLUMN IF NOT EXISTS signature_url TEXT,
  ADD COLUMN IF NOT EXISTS signature_metadata JSONB;

CREATE INDEX IF NOT EXISTS idx_inspections_captain ON safety_inspections(captain_id);
CREATE INDEX IF NOT EXISTS idx_inspections_date ON safety_inspections(inspection_date DESC);
CREATE INDEX IF NOT EXISTS idx_inspections_vessel ON safety_inspections(vessel_id);
