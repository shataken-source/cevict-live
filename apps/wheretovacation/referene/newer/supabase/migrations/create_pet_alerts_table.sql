-- Create pet_alerts table for PetReunion
-- Users can sign up to get notified when new pets matching their criteria are added

CREATE TABLE IF NOT EXISTS pet_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- User Information
  email TEXT NOT NULL,
  name TEXT,
  
  -- Alert Criteria
  pet_type TEXT, -- 'dog', 'cat', or NULL for all
  breed TEXT, -- Specific breed or NULL for any
  location_city TEXT,
  location_state TEXT,
  size TEXT, -- 'small', 'medium', 'large', or NULL for any
  age_range TEXT, -- 'puppy', 'young', 'adult', 'senior', or NULL for any
  gender TEXT, -- 'male', 'female', or NULL for any
  
  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_notified_at TIMESTAMPTZ -- Track when we last sent an alert
  
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_pet_alerts_email ON pet_alerts(email);
CREATE INDEX IF NOT EXISTS idx_pet_alerts_active ON pet_alerts(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_pet_alerts_location ON pet_alerts(location_state, location_city);
CREATE INDEX IF NOT EXISTS idx_pet_alerts_type ON pet_alerts(pet_type);
CREATE INDEX IF NOT EXISTS idx_pet_alerts_breed ON pet_alerts(breed);

-- Enable Row Level Security
ALTER TABLE pet_alerts ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can create alerts (public signup)
CREATE POLICY "Anyone can create alerts"
  ON pet_alerts
  FOR INSERT
  WITH CHECK (true);

-- Policy: Anyone can view their own alerts (by email)
CREATE POLICY "Users can view their alerts"
  ON pet_alerts
  FOR SELECT
  USING (true); -- For now, allow viewing (can restrict later with auth)

-- Policy: Users can update their own alerts
CREATE POLICY "Users can update their alerts"
  ON pet_alerts
  FOR UPDATE
  USING (true); -- For now, allow updating (can restrict later with auth)

-- Policy: Users can delete their own alerts
CREATE POLICY "Users can delete their alerts"
  ON pet_alerts
  FOR DELETE
  USING (true); -- For now, allow deleting (can restrict later with auth)

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_pet_alerts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_pet_alerts_timestamp
  BEFORE UPDATE ON pet_alerts
  FOR EACH ROW
  EXECUTE FUNCTION update_pet_alerts_updated_at();

-- Add comment
COMMENT ON TABLE pet_alerts IS 'Pet alerts for PetReunion - users get notified when new pets matching their criteria are added';













