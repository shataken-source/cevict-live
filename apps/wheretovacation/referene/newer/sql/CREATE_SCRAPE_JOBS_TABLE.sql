-- Create scrape_jobs table for user-initiated scraping queue
-- All queries use parameterized inputs via Supabase client (no SQL injection risk)

CREATE TABLE IF NOT EXISTS scrape_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_ip TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed', 'cancelled')),
  job_id TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  result JSONB,
  error TEXT,
  shelters_scraped INTEGER DEFAULT 0,
  pets_found INTEGER DEFAULT 0,
  pets_saved INTEGER DEFAULT 0
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_scrape_jobs_status ON scrape_jobs(status) WHERE status IN ('queued', 'processing');
CREATE INDEX IF NOT EXISTS idx_scrape_jobs_city_state ON scrape_jobs(city, state, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_scrape_jobs_user ON scrape_jobs(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_scrape_jobs_user_ip ON scrape_jobs(user_ip, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_scrape_jobs_created ON scrape_jobs(created_at DESC);

-- Add comments for documentation
COMMENT ON TABLE scrape_jobs IS 'Queue for user-initiated shelter scraping requests';
COMMENT ON COLUMN scrape_jobs.job_id IS 'Unique identifier for tracking job status';
COMMENT ON COLUMN scrape_jobs.user_ip IS 'IP address for rate limiting (stored for security)';
COMMENT ON COLUMN scrape_jobs.result IS 'JSON result containing scrape statistics';
COMMENT ON COLUMN scrape_jobs.status IS 'Job status: queued, processing, completed, failed, cancelled';

-- Enable RLS (Row Level Security) for user data protection
ALTER TABLE scrape_jobs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own jobs
CREATE POLICY "Users can view their own scrape jobs"
  ON scrape_jobs
  FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

-- Policy: Users can create their own jobs
CREATE POLICY "Users can create scrape jobs"
  ON scrape_jobs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Note: Admin/service role can access all jobs via service role key

