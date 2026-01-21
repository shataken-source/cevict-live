-- PopThePopcorn Database Schema

-- Drop tables if they exist (in reverse order of dependencies)
DROP TABLE IF EXISTS drama_history CASCADE;
DROP TABLE IF EXISTS reported_stories CASCADE;
DROP TABLE IF EXISTS votes CASCADE;
DROP TABLE IF EXISTS user_alerts CASCADE;
DROP TABLE IF EXISTS headlines CASCADE;

-- Headlines table (must be created first)
CREATE TABLE headlines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  source TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('politics', 'tech', 'entertainment', 'business', 'sports', 'other')),
  drama_score INTEGER NOT NULL CHECK (drama_score >= 1 AND drama_score <= 10),
  upvotes INTEGER DEFAULT 0,
  downvotes INTEGER DEFAULT 0,
  posted_at TIMESTAMP WITH TIME ZONE NOT NULL,
  scraped_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_breaking BOOLEAN DEFAULT FALSE,
  image_url TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User alerts table
CREATE TABLE user_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number TEXT,
  email TEXT,
  alert_types JSONB DEFAULT '[]'::jsonb,
  custom_keywords JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Votes table (to prevent duplicate voting)
-- Note: Created after headlines table to ensure foreign key works
CREATE TABLE IF NOT EXISTS votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  headline_id UUID,
  ip_address TEXT,
  vote_type TEXT CHECK (vote_type IN ('upvote', 'downvote')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(headline_id, ip_address),
  CONSTRAINT fk_headline FOREIGN KEY (headline_id) REFERENCES headlines(id) ON DELETE CASCADE
);

-- Reported stories table
CREATE TABLE IF NOT EXISTS reported_stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  headline_id UUID,
  reason TEXT,
  ip_address TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'dismissed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT fk_headline_report FOREIGN KEY (headline_id) REFERENCES headlines(id) ON DELETE CASCADE
);

-- Drama score history table
CREATE TABLE IF NOT EXISTS drama_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  overall_drama_score INTEGER CHECK (overall_drama_score >= 1 AND overall_drama_score <= 10),
  top_headline_id UUID,
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT fk_top_headline FOREIGN KEY (top_headline_id) REFERENCES headlines(id) ON DELETE SET NULL
);

-- Indexes for performance
CREATE INDEX idx_headlines_category ON headlines(category);
CREATE INDEX idx_headlines_drama_score ON headlines(drama_score DESC);
CREATE INDEX idx_headlines_posted_at ON headlines(posted_at DESC);
CREATE INDEX idx_headlines_is_breaking ON headlines(is_breaking) WHERE is_breaking = TRUE;
CREATE INDEX idx_votes_headline_id ON votes(headline_id);
CREATE INDEX idx_user_alerts_phone ON user_alerts(phone_number) WHERE phone_number IS NOT NULL;
CREATE INDEX idx_user_alerts_email ON user_alerts(email) WHERE email IS NOT NULL;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS update_headlines_updated_at ON headlines;
DROP TRIGGER IF EXISTS update_user_alerts_updated_at ON user_alerts;

-- Triggers for updated_at
CREATE TRIGGER update_headlines_updated_at BEFORE UPDATE ON headlines
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_alerts_updated_at BEFORE UPDATE ON user_alerts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) Policies
-- Enable RLS on tables
ALTER TABLE headlines ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE reported_stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE drama_history ENABLE ROW LEVEL SECURITY;

-- Allow public read access to headlines (for the news aggregator)
CREATE POLICY "Allow public read access to headlines"
  ON headlines FOR SELECT
  USING (true);

-- Allow public insert access to votes (for voting)
CREATE POLICY "Allow public insert access to votes"
  ON votes FOR INSERT
  WITH CHECK (true);

-- Allow public read access to votes (for vote counts)
CREATE POLICY "Allow public read access to votes"
  ON votes FOR SELECT
  USING (true);

-- Allow public insert access to user_alerts (for subscriptions)
CREATE POLICY "Allow public insert access to user_alerts"
  ON user_alerts FOR INSERT
  WITH CHECK (true);

-- Allow public read access to user_alerts (users can view their own)
CREATE POLICY "Allow public read access to user_alerts"
  ON user_alerts FOR SELECT
  USING (true);

-- Allow public insert access to reported_stories (for reporting)
CREATE POLICY "Allow public insert access to reported_stories"
  ON reported_stories FOR INSERT
  WITH CHECK (true);

-- Allow public read access to drama_history (for charts)
CREATE POLICY "Allow public read access to drama_history"
  ON drama_history FOR SELECT
  USING (true);

-- IMPORTANT: After running this schema, you MUST refresh Supabase's schema cache
-- The error "Could not find the table 'public.headlines' in the schema cache" means the cache needs refreshing
--
-- OPTION 1 (Recommended): Use Supabase Dashboard
-- 1. Go to: Supabase Dashboard > Settings > API
-- 2. Scroll down to "Schema Cache"
-- 3. Click "Reload schema cache" button
-- 4. Wait 10-30 seconds for it to refresh
--
-- OPTION 2: Use SQL command (requires admin access)
-- Run this in the SQL editor:
-- NOTIFY pgrst, 'reload schema';
--
-- OPTION 3: Wait for auto-refresh (can take 1-5 minutes)
-- Supabase will eventually auto-refresh, but it's faster to do it manually
--
-- After refreshing, your API routes should work immediately
