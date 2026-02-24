-- Facebook Bot Learning Database
-- Stores interactions so the bot can learn and improve

CREATE TABLE IF NOT EXISTS facebook_bot_interactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  question TEXT NOT NULL,
  answer TEXT,
  topic TEXT,
  confidence DECIMAL(3, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_facebook_bot_question ON facebook_bot_interactions(question);
CREATE INDEX IF NOT EXISTS idx_facebook_bot_topic ON facebook_bot_interactions(topic);
CREATE INDEX IF NOT EXISTS idx_facebook_bot_created ON facebook_bot_interactions(created_at DESC);

-- Enable RLS (Row Level Security)
ALTER TABLE facebook_bot_interactions ENABLE ROW LEVEL SECURITY;

-- Policy: Service role can do everything
CREATE POLICY "Service role full access" ON facebook_bot_interactions
  FOR ALL
  USING (auth.role() = 'service_role');

-- Policy: Allow reading for analytics (optional - can be removed if not needed)
CREATE POLICY "Public read access" ON facebook_bot_interactions
  FOR SELECT
  USING (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_facebook_bot_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_facebook_bot_timestamp
  BEFORE UPDATE ON facebook_bot_interactions
  FOR EACH ROW
  EXECUTE FUNCTION update_facebook_bot_updated_at();

