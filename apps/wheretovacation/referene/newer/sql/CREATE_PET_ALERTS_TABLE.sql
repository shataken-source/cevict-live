-- =============================================
-- PET ALERTS TABLE
-- Stores user alert preferences for new pet notifications
-- =============================================

CREATE TABLE IF NOT EXISTS pet_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- User Information
  email TEXT NOT NULL,
  name TEXT,
  
  -- Alert Criteria
  pet_type TEXT, -- 'dog', 'cat', etc.
  breed TEXT,
  location_city TEXT,
  location_state TEXT,
  size TEXT, -- 'small', 'medium', 'large', 'extra-large'
  age_range TEXT, -- 'puppy', 'young', 'adult', 'senior'
  gender TEXT, -- 'male', 'female'
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_notified_at TIMESTAMPTZ
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_pet_alerts_email ON pet_alerts(email);
CREATE INDEX IF NOT EXISTS idx_pet_alerts_active ON pet_alerts(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_pet_alerts_criteria ON pet_alerts(pet_type, location_state, location_city);

-- Enable RLS (Row Level Security)
ALTER TABLE pet_alerts ENABLE ROW LEVEL SECURITY;

-- RLS Policies (allow public read/write for alerts - no auth required)
CREATE POLICY "Anyone can create alerts" ON pet_alerts
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can view alerts" ON pet_alerts
  FOR SELECT USING (true);

CREATE POLICY "Anyone can update their alerts" ON pet_alerts
  FOR UPDATE USING (true);

CREATE POLICY "Anyone can delete their alerts" ON pet_alerts
  FOR DELETE USING (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_pet_alerts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_pet_alerts_updated_at
  BEFORE UPDATE ON pet_alerts
  FOR EACH ROW
  EXECUTE FUNCTION update_pet_alerts_updated_at();

