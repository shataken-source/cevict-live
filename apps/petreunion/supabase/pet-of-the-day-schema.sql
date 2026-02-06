-- Pet of the Day tracking table
-- Tracks which pets have been featured and when

CREATE TABLE IF NOT EXISTS pet_of_the_day (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id UUID NOT NULL REFERENCES lost_pets(id) ON DELETE CASCADE,
  posted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  facebook_post_id TEXT,
  status TEXT DEFAULT 'posted' CHECK (status IN ('posted', 'failed', 'scheduled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_pet_of_the_day_posted_at ON pet_of_the_day(posted_at DESC);
CREATE INDEX IF NOT EXISTS idx_pet_of_the_day_pet_id ON pet_of_the_day(pet_id);
CREATE INDEX IF NOT EXISTS idx_pet_of_the_day_status ON pet_of_the_day(status);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_pet_of_the_day_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_pet_of_the_day_timestamp
  BEFORE UPDATE ON pet_of_the_day
  FOR EACH ROW
  EXECUTE FUNCTION update_pet_of_the_day_updated_at();

-- RLS Policies (allow public read, admin write)
ALTER TABLE pet_of_the_day ENABLE ROW LEVEL SECURITY;

-- Allow public to read (to see featured pets)
CREATE POLICY "Allow public read access to pet_of_the_day"
  ON pet_of_the_day
  FOR SELECT
  USING (true);

-- Allow service role to insert/update (for API)
-- Note: This requires service role key, which is fine for server-side operations

COMMENT ON TABLE pet_of_the_day IS 'Tracks pets featured as "Pet of the Day" on Facebook';
COMMENT ON COLUMN pet_of_the_day.pet_id IS 'Reference to the pet in lost_pets table';
COMMENT ON COLUMN pet_of_the_day.posted_at IS 'When the pet was posted to Facebook';
COMMENT ON COLUMN pet_of_the_day.facebook_post_id IS 'Facebook post ID for tracking';
