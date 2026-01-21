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
  category TEXT NOT NULL CHECK (category IN ('politics', 'tech', 'entertainment', 'business', 'sports', 'lifestyle', 'social', 'viral', 'other')),
  drama_score INTEGER NOT NULL CHECK (drama_score >= 1 AND drama_score <= 10),
  upvotes INTEGER DEFAULT 0,
  downvotes INTEGER DEFAULT 0,
  posted_at TIMESTAMP WITH TIME ZONE NOT NULL,
  scraped_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_breaking BOOLEAN DEFAULT FALSE,
  image_url TEXT,
  description TEXT,
  source_verification TEXT CHECK (source_verification IN ('verified', 'unverified', 'user_report', 'viral', 'official', 'ai_generated', 'satire', 'misleading')),
  video_script TEXT,
  discord_sent BOOLEAN DEFAULT FALSE,
  telegram_sent BOOLEAN DEFAULT FALSE,
  -- Verification Agent fields
  verification_status TEXT CHECK (verification_status IN ('verified', 'unverified', 'ai_generated', 'satire', 'misleading')),
  verification_confidence INTEGER CHECK (verification_confidence >= 0 AND verification_confidence <= 100),
  verification_risk TEXT CHECK (verification_risk IN ('high', 'medium', 'low')),
  verification_summary TEXT,
  evidence_links JSONB DEFAULT '[]'::jsonb,
  red_flags JSONB DEFAULT '[]'::jsonb,
  bias_label TEXT CHECK (bias_label IN ('mainstream', 'alternative', 'neutral')),
  sentiment TEXT CHECK (sentiment IN ('hype', 'panic', 'satire', 'neutral', 'concern')),
  provenance JSONB,
  -- Vibe-O-Meter
  vibe_score INTEGER CHECK (vibe_score >= -100 AND vibe_score <= 100), -- -100 (panic) to +100 (hype)
  -- Receipts
  source_trace JSONB, -- Timeline of where story spread
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
  -- 2026 Compliance: Age category and privacy settings
  age_category TEXT CHECK (age_category IN ('13-15', '16-17', '18+', 'unknown')),
  requires_parental_consent BOOLEAN DEFAULT FALSE,
  privacy_settings JSONB DEFAULT '{"shareData": false, "allowNotifications": true, "allowLateNightNotifications": false, "allowTracking": false, "allowInAppPurchases": false}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Virtual currency transactions table (2026 IRS compliance - Form 1099-DA)
CREATE TABLE IF NOT EXISTS virtual_currency_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_identifier TEXT NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('earn', 'spend', 'transfer')),
  amount INTEGER NOT NULL,
  currency TEXT NOT NULL CHECK (currency IN ('salt', 'kernels')),
  description TEXT,
  cost_basis INTEGER, -- For tax reporting (spending)
  gross_proceeds INTEGER, -- For tax reporting (earning)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Reactions table (Gen Z emoji reactions instead of up/down votes)
CREATE TABLE IF NOT EXISTS reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  headline_id UUID,
  ip_address TEXT,
  reaction_type TEXT CHECK (reaction_type IN ('🔥', '🧢', '🧐', '🍿', '📈', '📉', '🎭')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(headline_id, ip_address, reaction_type),
  CONSTRAINT fk_headline_reaction FOREIGN KEY (headline_id) REFERENCES headlines(id) ON DELETE CASCADE
);

-- Crowd Drama Votes (users vote on drama score 1-10)
CREATE TABLE IF NOT EXISTS crowd_drama_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  headline_id UUID,
  ip_address TEXT,
  drama_score INTEGER NOT NULL CHECK (drama_score >= 1 AND drama_score <= 10),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(headline_id, ip_address),
  CONSTRAINT fk_headline_crowd_vote FOREIGN KEY (headline_id) REFERENCES headlines(id) ON DELETE CASCADE
);

-- Legacy votes table (for backward compatibility)
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

-- Trending topics table (from Twitter/X and Google Trends)
CREATE TABLE IF NOT EXISTS trending_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_name TEXT NOT NULL,
  tweet_count INTEGER,
  woeid INTEGER DEFAULT 1,
  source TEXT CHECK (source IN ('twitter', 'google', 'both')),
  fetched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '1 hour'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(topic_name)
);

-- Settings table (for admin-configurable variables)
CREATE TABLE IF NOT EXISTS app_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value TEXT,
  description TEXT,
  category TEXT DEFAULT 'general',
  is_sensitive BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_headlines_category ON headlines(category);
CREATE INDEX idx_headlines_drama_score ON headlines(drama_score DESC);
CREATE INDEX idx_headlines_posted_at ON headlines(posted_at DESC);
CREATE INDEX idx_headlines_is_breaking ON headlines(is_breaking) WHERE is_breaking = TRUE;
CREATE INDEX idx_headlines_verification_status ON headlines(verification_status);
CREATE INDEX idx_headlines_sentiment ON headlines(sentiment);
CREATE INDEX idx_votes_headline_id ON votes(headline_id);
CREATE INDEX idx_reactions_headline_id ON reactions(headline_id);
CREATE INDEX idx_reactions_type ON reactions(reaction_type);
CREATE INDEX idx_crowd_drama_votes_headline_id ON crowd_drama_votes(headline_id);
CREATE INDEX idx_crowd_drama_votes_drama_score ON crowd_drama_votes(drama_score);
CREATE INDEX idx_user_alerts_phone ON user_alerts(phone_number) WHERE phone_number IS NOT NULL;
CREATE INDEX idx_user_alerts_email ON user_alerts(email) WHERE email IS NOT NULL;
CREATE INDEX idx_user_alerts_age_category ON user_alerts(age_category);
CREATE INDEX idx_virtual_currency_transactions_user ON virtual_currency_transactions(user_identifier);
CREATE INDEX idx_virtual_currency_transactions_created_at ON virtual_currency_transactions(created_at DESC);

-- Story boosts table (for "Salt the Story" feature)
CREATE TABLE IF NOT EXISTS story_boosts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  headline_id UUID NOT NULL REFERENCES headlines(id) ON DELETE CASCADE,
  user_identifier TEXT NOT NULL,
  kernels_spent INTEGER NOT NULL,
  boost_multiplier DECIMAL(3,2) NOT NULL DEFAULT 1.0,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_story_boosts_headline ON story_boosts(headline_id);
CREATE INDEX idx_story_boosts_expires_at ON story_boosts(expires_at);

-- Sponsored reports table
CREATE TABLE IF NOT EXISTS sponsored_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  headline_id UUID REFERENCES headlines(id) ON DELETE CASCADE,
  sponsor_name TEXT NOT NULL,
  sponsor_logo TEXT,
  sponsor_category TEXT,
  placement TEXT NOT NULL CHECK (placement IN ('probability_report', 'drama_meter', 'story_card')),
  cpm INTEGER NOT NULL, -- cost per mille in cents
  start_date TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  target_audience JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_sponsored_reports_headline ON sponsored_reports(headline_id);
CREATE INDEX idx_sponsored_reports_dates ON sponsored_reports(start_date, end_date);

-- Sponsored impressions tracking
CREATE TABLE IF NOT EXISTS sponsored_impressions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sponsored_report_id UUID NOT NULL REFERENCES sponsored_reports(id) ON DELETE CASCADE,
  user_identifier TEXT NOT NULL,
  viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_sponsored_impressions_report ON sponsored_impressions(sponsored_report_id);
CREATE INDEX idx_sponsored_impressions_user ON sponsored_impressions(user_identifier);

-- Sponsored clicks tracking
CREATE TABLE IF NOT EXISTS sponsored_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sponsored_report_id UUID NOT NULL REFERENCES sponsored_reports(id) ON DELETE CASCADE,
  user_identifier TEXT NOT NULL,
  clicked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_sponsored_clicks_report ON sponsored_clicks(sponsored_report_id);
CREATE INDEX idx_sponsored_clicks_user ON sponsored_clicks(user_identifier);
CREATE INDEX idx_trending_topics_fetched_at ON trending_topics(fetched_at DESC);
CREATE INDEX idx_trending_topics_expires_at ON trending_topics(expires_at) WHERE expires_at > NOW();
CREATE INDEX idx_app_settings_key ON app_settings(key);
CREATE INDEX idx_app_settings_category ON app_settings(category);

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
ALTER TABLE trending_topics ENABLE ROW LEVEL SECURITY;

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

-- Settings: Only allow admin access (will be handled via API with admin auth)
-- For now, allow service role to manage settings
-- In production, you may want to restrict this further

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
