-- Create scrape_logs table for monitoring scraper runs
-- This helps track scraper performance, errors, and success rates

CREATE TABLE IF NOT EXISTS scrape_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location TEXT NOT NULL,
  pets_found INTEGER DEFAULT 0,
  pets_saved INTEGER DEFAULT 0,
  errors TEXT[],
  duration_ms INTEGER,
  success BOOLEAN DEFAULT false,
  strategy TEXT, -- 'graph-api', 'browser', etc.
  metadata JSONB, -- Additional data
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_scrape_logs_created_at 
  ON scrape_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_scrape_logs_location 
  ON scrape_logs(location, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_scrape_logs_success 
  ON scrape_logs(success, created_at DESC);

-- Enable RLS
ALTER TABLE scrape_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Only service role can insert/select logs
CREATE POLICY "Service role can manage scrape logs"
  ON scrape_logs
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Add comment
COMMENT ON TABLE scrape_logs IS 'Logs for Facebook pet scraper runs - tracks performance and errors';





