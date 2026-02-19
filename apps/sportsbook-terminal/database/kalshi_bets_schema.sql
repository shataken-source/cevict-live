-- Create kalshi_bets table for sports picks in Kalshi format
-- This stores sports picks converted to YES/NO format from prognostication API

CREATE TABLE IF NOT EXISTS kalshi_bets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    market_id TEXT NOT NULL UNIQUE,
    market_title TEXT NOT NULL,
    category TEXT DEFAULT 'sports',
    pick TEXT NOT NULL CHECK (pick IN ('YES', 'NO')),
    probability INTEGER CHECK (probability >= 0 AND probability <= 100),
    edge NUMERIC(5,2),
    market_price INTEGER CHECK (market_price >= 0 AND market_price <= 100),
    expires_at TIMESTAMPTZ,
    reasoning TEXT,
    confidence INTEGER CHECK (confidence >= 0 AND confidence <= 100),
    tier TEXT CHECK (tier IN ('elite', 'pro', 'free')),
    original_sport TEXT,
    game_info TEXT,
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed', 'graded')),
    source TEXT DEFAULT 'prognostication_api',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_kalshi_bets_tier ON kalshi_bets(tier);
CREATE INDEX IF NOT EXISTS idx_kalshi_bets_status ON kalshi_bets(status);
CREATE INDEX IF NOT EXISTS idx_kalshi_bets_category ON kalshi_bets(category);
CREATE INDEX IF NOT EXISTS idx_kalshi_bets_confidence ON kalshi_bets(confidence DESC);
CREATE INDEX IF NOT EXISTS idx_kalshi_bets_created_at ON kalshi_bets(created_at DESC);

-- Create composite index for tier + status queries
CREATE INDEX IF NOT EXISTS idx_kalshi_bets_tier_status ON kalshi_bets(tier, status);

-- Enable RLS
ALTER TABLE kalshi_bets ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access to open bets
CREATE POLICY "Allow public read access to open kalshi bets"
ON kalshi_bets FOR SELECT
USING (status = 'open');

-- Create policy for service role to manage all bets
CREATE POLICY "Allow service role to manage kalshi bets"
ON kalshi_bets FOR ALL
USING (auth.role() = 'service_role');

-- Add comment explaining the tier system
COMMENT ON TABLE kalshi_bets IS 'Sports picks in Kalshi YES/NO format, organized by tier (elite: 80%+, pro: 65-79%, free: <65% confidence)';
COMMENT ON COLUMN kalshi_bets.tier IS 'Tier based on confidence: elite (>=80%), pro (65-79%), free (<65%)';
COMMENT ON COLUMN kalshi_bets.market_id IS 'Unique identifier for the market (from prognostication API)';
COMMENT ON COLUMN kalshi_bets.pick IS 'YES or NO prediction';
COMMENT ON COLUMN kalshi_bets.market_price IS 'Price in cents (0-100) representing probability percentage';
