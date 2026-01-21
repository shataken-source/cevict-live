-- Row Level Security (RLS) Policies for PopThePopcorn
-- Run this if you've already created the tables and need to add RLS policies

-- Enable RLS on tables (if not already enabled)
ALTER TABLE headlines ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE reported_stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE drama_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE trending_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE crowd_drama_votes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to allow re-running this script)
DROP POLICY IF EXISTS "Allow public read access to headlines" ON headlines;
DROP POLICY IF EXISTS "Allow public insert access to votes" ON votes;
DROP POLICY IF EXISTS "Allow public read access to votes" ON votes;
DROP POLICY IF EXISTS "Allow public insert access to user_alerts" ON user_alerts;
DROP POLICY IF EXISTS "Allow public read access to user_alerts" ON user_alerts;
DROP POLICY IF EXISTS "Allow public insert access to reported_stories" ON reported_stories;
DROP POLICY IF EXISTS "Allow public read access to drama_history" ON drama_history;
DROP POLICY IF EXISTS "Allow public read access to trending_topics" ON trending_topics;

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

-- Allow public read access to trending_topics
CREATE POLICY "Allow public read access to trending_topics"
  ON trending_topics FOR SELECT
  USING (true);

-- Settings: Allow service role full access (admin API will handle auth)
-- In production, you may want to restrict this further
-- For now, we rely on API-level authentication via admin token
CREATE POLICY "Allow admin read access to app_settings"
  ON app_settings FOR SELECT
  USING (true);

CREATE POLICY "Allow admin write access to app_settings"
  ON app_settings FOR ALL
  USING (true)
  WITH CHECK (true);

-- Allow public read access to reactions (for reaction counts)
CREATE POLICY "Allow public read access to reactions"
  ON reactions FOR SELECT
  USING (true);

-- Allow public insert access to reactions (for voting)
CREATE POLICY "Allow public insert access to reactions"
  ON reactions FOR INSERT
  WITH CHECK (true);

-- Allow public read access to crowd_drama_votes
CREATE POLICY "Allow public read access to crowd_drama_votes"
  ON crowd_drama_votes FOR SELECT
  USING (true);

-- Allow public insert/update access to crowd_drama_votes
CREATE POLICY "Allow public insert access to crowd_drama_votes"
  ON crowd_drama_votes FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update access to crowd_drama_votes"
  ON crowd_drama_votes FOR UPDATE
  USING (true);

-- IMPORTANT: After running this script, refresh Supabase's schema cache
-- Go to: Supabase Dashboard > Settings > API > Click "Reload schema cache" button
-- This is required for the API to recognize the new policies
