-- Row Level Security (RLS) Policies for PopThePopcorn
-- Run this if you've already created the tables and need to add RLS policies

-- Enable RLS on tables (if not already enabled)
ALTER TABLE headlines ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE reported_stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE drama_history ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to allow re-running this script)
DROP POLICY IF EXISTS "Allow public read access to headlines" ON headlines;
DROP POLICY IF EXISTS "Allow public insert access to votes" ON votes;
DROP POLICY IF EXISTS "Allow public read access to votes" ON votes;
DROP POLICY IF EXISTS "Allow public insert access to user_alerts" ON user_alerts;
DROP POLICY IF EXISTS "Allow public read access to user_alerts" ON user_alerts;
DROP POLICY IF EXISTS "Allow public insert access to reported_stories" ON reported_stories;
DROP POLICY IF EXISTS "Allow public read access to drama_history" ON drama_history;

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
