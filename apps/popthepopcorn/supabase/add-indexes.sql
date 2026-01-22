-- Add Performance Indexes for PopThePopcorn
-- These indexes improve query performance significantly

-- Headlines table indexes
CREATE INDEX IF NOT EXISTS idx_headlines_url ON headlines(url);
CREATE INDEX IF NOT EXISTS idx_headlines_posted_at ON headlines(posted_at DESC);
CREATE INDEX IF NOT EXISTS idx_headlines_category ON headlines(category);
CREATE INDEX IF NOT EXISTS idx_headlines_drama_score ON headlines(drama_score DESC);
CREATE INDEX IF NOT EXISTS idx_headlines_is_breaking ON headlines(is_breaking) WHERE is_breaking = true;
CREATE INDEX IF NOT EXISTS idx_headlines_scraped_at ON headlines(scraped_at DESC);

-- Votes table indexes
CREATE INDEX IF NOT EXISTS idx_votes_headline_id ON votes(headline_id);
CREATE INDEX IF NOT EXISTS idx_votes_ip_address ON votes(ip_address);

-- Reactions table indexes
CREATE INDEX IF NOT EXISTS idx_reactions_headline_id ON reactions(headline_id);
CREATE INDEX IF NOT EXISTS idx_reactions_ip_address ON reactions(ip_address);
CREATE INDEX IF NOT EXISTS idx_reactions_type ON reactions(reaction_type);

-- Crowd drama votes indexes
CREATE INDEX IF NOT EXISTS idx_crowd_votes_headline_id ON crowd_drama_votes(headline_id);
CREATE INDEX IF NOT EXISTS idx_crowd_votes_ip_address ON crowd_drama_votes(ip_address);

-- User alerts indexes
CREATE INDEX IF NOT EXISTS idx_user_alerts_is_active ON user_alerts(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_user_alerts_phone ON user_alerts(phone_number) WHERE phone_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_alerts_email ON user_alerts(email) WHERE email IS NOT NULL;

-- Drama history indexes
CREATE INDEX IF NOT EXISTS idx_drama_history_recorded_at ON drama_history(recorded_at DESC);

-- Trending topics indexes (already exists, but verify)
-- CREATE INDEX IF NOT EXISTS idx_trending_topics_expires_at ON trending_topics(expires_at);

-- Story boosts indexes
CREATE INDEX IF NOT EXISTS idx_story_boosts_headline_id ON story_boosts(headline_id);
CREATE INDEX IF NOT EXISTS idx_story_boosts_created_at ON story_boosts(created_at DESC);

-- Sponsored content indexes
CREATE INDEX IF NOT EXISTS idx_sponsored_reports_is_active ON sponsored_reports(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_sponsored_impressions_headline_id ON sponsored_impressions(headline_id);
CREATE INDEX IF NOT EXISTS idx_sponsored_clicks_headline_id ON sponsored_clicks(headline_id);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_headlines_category_drama ON headlines(category, drama_score DESC);
CREATE INDEX IF NOT EXISTS idx_headlines_breaking_posted ON headlines(is_breaking, posted_at DESC) WHERE is_breaking = true;

-- After creating indexes, run ANALYZE to update statistics
ANALYZE headlines;
ANALYZE votes;
ANALYZE reactions;
ANALYZE crowd_drama_votes;
ANALYZE user_alerts;
ANALYZE drama_history;
ANALYZE story_boosts;
ANALYZE sponsored_reports;
ANALYZE sponsored_impressions;
ANALYZE sponsored_clicks;
