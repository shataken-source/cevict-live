-- Create affiliate_credentials table
CREATE TABLE IF NOT EXISTS affiliate_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  retailer TEXT NOT NULL UNIQUE CHECK (retailer IN ('amazon', 'walmart', 'temu', 'boatus')),
  affiliate_id TEXT NOT NULL,
  api_key TEXT,
  secret_key TEXT,
  commission_rate DECIMAL(5,2) DEFAULT 0.00,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE affiliate_credentials ENABLE ROW LEVEL SECURITY;

-- Only admins (level 1) can view/edit affiliate credentials
CREATE POLICY "Admin full access to affiliate credentials"
  ON affiliate_credentials
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_levels
      WHERE user_levels.email = auth.jwt() ->> 'email'
      AND user_levels.level = 1
    )
  );

-- Insert default credentials (empty, to be configured by admin)
INSERT INTO affiliate_credentials (retailer, affiliate_id, commission_rate) VALUES
  ('amazon', 'your-amazon-tag', 4.00),
  ('walmart', 'your-walmart-id', 3.00),
  ('temu', 'your-temu-id', 5.00),
  ('boatus', 'your-boatus-id', 6.00)
ON CONFLICT (retailer) DO NOTHING;

-- Create function to update timestamp
CREATE OR REPLACE FUNCTION update_affiliate_credentials_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER update_affiliate_credentials_timestamp
  BEFORE UPDATE ON affiliate_credentials
  FOR EACH ROW
  EXECUTE FUNCTION update_affiliate_credentials_timestamp();
