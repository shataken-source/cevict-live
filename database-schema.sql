-- Complete Database Schema for Kalshi & Polymarket Integration
-- Run this in Supabase SQL Editor: https://rdbuwyefbgnbuhmjrizo.supabase.co

-- =====================================================
-- 1. BOT PREDICTIONS TABLE (Alpha-Hunter writes here)
-- =====================================================
CREATE TABLE IF NOT EXISTS bot_predictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    market_id TEXT NOT NULL,
    market_title TEXT NOT NULL,
    platform TEXT NOT NULL CHECK (platform IN ('kalshi', 'polymarket')),
    bot_category TEXT,
    prediction TEXT NOT NULL CHECK (prediction IN ('yes', 'no')),
    probability INTEGER NOT NULL CHECK (probability >= 0 AND probability <= 100),
    confidence INTEGER NOT NULL CHECK (confidence >= 0 AND confidence <= 100),
    edge NUMERIC(5,2) NOT NULL DEFAULT 0,
    market_price INTEGER CHECK (market_price >= 0 AND market_price <= 100),
    reasoning TEXT[],
    factors TEXT[],
    learned_from TEXT[],
    stake_size NUMERIC(10,2),
    amount NUMERIC(10,2),
    predicted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    actual_outcome TEXT CHECK (actual_outcome IN ('yes', 'no', 'void', NULL)),
    resolved_at TIMESTAMP WITH TIME ZONE,
    pnl NUMERIC(10,2),
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed', 'settled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Unique constraint: one open prediction per market per platform
    CONSTRAINT unique_open_prediction UNIQUE (market_id, platform, actual_outcome)
);

-- Indexes for bot_predictions
CREATE INDEX IF NOT EXISTS idx_bot_predictions_platform ON bot_predictions(platform);
CREATE INDEX IF NOT EXISTS idx_bot_predictions_market_id ON bot_predictions(market_id);
CREATE INDEX IF NOT EXISTS idx_bot_predictions_confidence ON bot_predictions(confidence DESC);
CREATE INDEX IF NOT EXISTS idx_bot_predictions_status ON bot_predictions(status);
CREATE INDEX IF NOT EXISTS idx_bot_predictions_predicted_at ON bot_predictions(predicted_at DESC);
CREATE INDEX IF NOT EXISTS idx_bot_predictions_actual_outcome ON bot_predictions(actual_outcome) WHERE actual_outcome IS NULL;

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_bot_predictions_updated_at ON bot_predictions;
CREATE TRIGGER update_bot_predictions_updated_at
    BEFORE UPDATE ON bot_predictions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 2. TRADE HISTORY TABLE (Alpha-Hunter writes here)
-- =====================================================
CREATE TABLE IF NOT EXISTS trade_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prediction_id UUID REFERENCES bot_predictions(id) ON DELETE SET NULL,
    market_id TEXT NOT NULL,
    platform TEXT NOT NULL CHECK (platform IN ('kalshi', 'polymarket')),
    market_title TEXT,
    side TEXT NOT NULL CHECK (side IN ('yes', 'no')),
    contracts INTEGER NOT NULL,
    price INTEGER NOT NULL CHECK (price >= 0 AND price <= 100),
    amount NUMERIC(10,2),
    fee NUMERIC(10,4) DEFAULT 0,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'filled', 'partial', 'cancelled', 'rejected')),
    order_id TEXT,
    placed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    filled_at TIMESTAMP WITH TIME ZONE,
    settled_at TIMESTAMP WITH TIME ZONE,
    settlement_price INTEGER,
    realized_pnl NUMERIC(10,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trade_history_market_id ON trade_history(market_id);
CREATE INDEX IF NOT EXISTS idx_trade_history_platform ON trade_history(platform);
CREATE INDEX IF NOT EXISTS idx_trade_history_status ON trade_history(status);
CREATE INDEX IF NOT EXISTS idx_trade_history_settled_at ON trade_history(settled_at) WHERE settled_at IS NULL;

DROP TRIGGER IF EXISTS update_trade_history_updated_at ON trade_history;
CREATE TRIGGER update_trade_history_updated_at
    BEFORE UPDATE ON trade_history
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 3. KALSHI BETS TABLE (Sportsbook-Terminal writes here)
-- =====================================================
CREATE TABLE IF NOT EXISTS kalshi_bets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    market_id TEXT NOT NULL,
    market_title TEXT NOT NULL,
    category TEXT,
    pick TEXT NOT NULL CHECK (pick IN ('YES', 'NO')),
    probability INTEGER NOT NULL CHECK (probability >= 0 AND probability <= 100),
    edge NUMERIC(5,2) NOT NULL DEFAULT 0,
    market_price INTEGER CHECK (market_price >= 0 AND market_price <= 100),
    expires_at TIMESTAMP WITH TIME ZONE,
    reasoning TEXT,
    confidence INTEGER NOT NULL CHECK (confidence >= 0 AND confidence <= 100),
    tier TEXT NOT NULL CHECK (tier IN ('elite', 'pro', 'free')),
    original_sport TEXT,
    game_info JSONB,
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed', 'settled', 'void')),
    source TEXT CHECK (source IN ('prognostication_api', 'cached_file', 'alpha_hunter', 'manual')),
    actual_outcome TEXT CHECK (actual_outcome IN ('YES', 'NO', 'VOID', NULL)),
    pnl NUMERIC(10,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Prevent duplicates
    CONSTRAINT unique_kalshi_bet UNIQUE (market_id, pick, tier)
);

CREATE INDEX IF NOT EXISTS idx_kalshi_bets_tier ON kalshi_bets(tier);
CREATE INDEX IF NOT EXISTS idx_kalshi_bets_status ON kalshi_bets(status);
CREATE INDEX IF NOT EXISTS idx_kalshi_bets_confidence ON kalshi_bets(confidence DESC);
CREATE INDEX IF NOT EXISTS idx_kalshi_bets_category ON kalshi_bets(category);

DROP TRIGGER IF EXISTS update_kalshi_bets_updated_at ON kalshi_bets;
CREATE TRIGGER update_kalshi_bets_updated_at
    BEFORE UPDATE ON kalshi_bets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 4. POLYMARKET BETS TABLE (New - for future integration)
-- =====================================================
CREATE TABLE IF NOT EXISTS polymarket_bets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    market_id TEXT NOT NULL,
    market_slug TEXT,
    market_title TEXT NOT NULL,
    category TEXT,
    pick TEXT NOT NULL CHECK (pick IN ('YES', 'NO')),
    probability NUMERIC(5,2) NOT NULL CHECK (probability >= 0 AND probability <= 100),
    edge NUMERIC(5,2) NOT NULL DEFAULT 0,
    market_price NUMERIC(5,2) CHECK (market_price >= 0 AND market_price <= 1),
    expires_at TIMESTAMP WITH TIME ZONE,
    reasoning TEXT,
    confidence INTEGER NOT NULL CHECK (confidence >= 0 AND confidence <= 100),
    tier TEXT NOT NULL CHECK (tier IN ('elite', 'pro', 'free')),
    original_sport TEXT,
    game_info JSONB,
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed', 'settled', 'void')),
    source TEXT CHECK (source IN ('prognostication_api', 'cached_file', 'alpha_hunter', 'manual')),
    actual_outcome TEXT CHECK (actual_outcome IN ('YES', 'NO', 'VOID', NULL)),
    pnl NUMERIC(10,2),
    clob_order_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT unique_polymarket_bet UNIQUE (market_id, pick, tier)
);

CREATE INDEX IF NOT EXISTS idx_polymarket_bets_tier ON polymarket_bets(tier);
CREATE INDEX IF NOT EXISTS idx_polymarket_bets_status ON polymarket_bets(status);
CREATE INDEX IF NOT EXISTS idx_polymarket_bets_confidence ON polymarket_bets(confidence DESC);

DROP TRIGGER IF EXISTS update_polymarket_bets_updated_at ON polymarket_bets;
CREATE TRIGGER update_polymarket_bets_updated_at
    BEFORE UPDATE ON polymarket_bets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 5. POLYMARKET PREDICTIONS TABLE (Alpha-Hunter will write here)
-- =====================================================
CREATE TABLE IF NOT EXISTS polymarket_predictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    market_id TEXT NOT NULL,
    market_slug TEXT,
    market_title TEXT NOT NULL,
    prediction TEXT NOT NULL CHECK (prediction IN ('yes', 'no')),
    probability NUMERIC(5,2) NOT NULL CHECK (probability >= 0 AND probability <= 100),
    confidence INTEGER NOT NULL CHECK (confidence >= 0 AND confidence <= 100),
    edge NUMERIC(5,2) NOT NULL DEFAULT 0,
    market_price NUMERIC(5,2),
    reasoning TEXT[],
    factors TEXT[],
    stake_size NUMERIC(10,2),
    predicted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    actual_outcome TEXT CHECK (actual_outcome IN ('yes', 'no', 'void', NULL)),
    resolved_at TIMESTAMP WITH TIME ZONE,
    pnl NUMERIC(10,2),
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed', 'settled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT unique_polymarket_prediction UNIQUE (market_id, actual_outcome)
);

CREATE INDEX IF NOT EXISTS idx_polymarket_predictions_market_id ON polymarket_predictions(market_id);
CREATE INDEX IF NOT EXISTS idx_polymarket_predictions_confidence ON polymarket_predictions(confidence DESC);
CREATE INDEX IF NOT EXISTS idx_polymarket_predictions_status ON polymarket_predictions(status);

DROP TRIGGER IF EXISTS update_polymarket_predictions_updated_at ON polymarket_predictions;
CREATE TRIGGER update_polymarket_predictions_updated_at
    BEFORE UPDATE ON polymarket_predictions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 6. MARKETS TABLE (Shared across platforms)
-- =====================================================
CREATE TABLE IF NOT EXISTS markets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    external_id TEXT NOT NULL,
    platform TEXT NOT NULL CHECK (platform IN ('kalshi', 'polymarket', 'sportsbook')),
    sport TEXT,
    league TEXT,
    home_team TEXT,
    away_team TEXT,
    event_date TIMESTAMP WITH TIME ZONE,
    market_type TEXT CHECK (market_type IN ('moneyline', 'spread', 'total', 'prop', 'event')),
    american_odds INTEGER,
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed', 'settled', 'cancelled')),
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT unique_market UNIQUE (external_id, platform)
);

CREATE INDEX IF NOT EXISTS idx_markets_platform ON markets(platform);
CREATE INDEX IF NOT EXISTS idx_markets_status ON markets(status);
CREATE INDEX IF NOT EXISTS idx_markets_event_date ON markets(event_date);

DROP TRIGGER IF EXISTS update_markets_updated_at ON markets;
CREATE TRIGGER update_markets_updated_at
    BEFORE UPDATE ON markets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 7. PREDICTIONS TABLE (Progno/Sportsbook-Terminal)
-- =====================================================
CREATE TABLE IF NOT EXISTS predictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    market_id UUID REFERENCES markets(id) ON DELETE CASCADE,
    model_probability NUMERIC(5,2) NOT NULL,
    confidence INTEGER CHECK (confidence >= 0 AND confidence <= 100),
    edge NUMERIC(5,2),
    expected_value NUMERIC(10,4),
    is_premium BOOLEAN DEFAULT false,
    model_version TEXT,
    pick TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_predictions_market_id ON predictions(market_id);
CREATE INDEX IF NOT EXISTS idx_predictions_confidence ON predictions(confidence DESC);

DROP TRIGGER IF EXISTS update_predictions_updated_at ON predictions;
CREATE TRIGGER update_predictions_updated_at
    BEFORE UPDATE ON predictions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 8. SIGNALS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS signals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prediction_id UUID REFERENCES predictions(id) ON DELETE CASCADE,
    signal_type TEXT NOT NULL CHECK (signal_type IN ('buy', 'sell', 'hold', 'alert')),
    strength INTEGER CHECK (strength >= 1 AND strength <= 10),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'triggered')),
    triggered_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_signals_status ON signals(status);
CREATE INDEX IF NOT EXISTS idx_signals_prediction_id ON signals(prediction_id);

DROP TRIGGER IF EXISTS update_signals_updated_at ON signals;
CREATE TRIGGER update_signals_updated_at
    BEFORE UPDATE ON signals
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 9. SYNDICATED PICKS TABLE (Progno output)
-- =====================================================
CREATE TABLE IF NOT EXISTS syndicated_picks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sport TEXT NOT NULL,
    league TEXT,
    event_date TIMESTAMP WITH TIME ZONE,
    home_team TEXT,
    away_team TEXT,
    pick_type TEXT NOT NULL CHECK (pick_type IN ('spread', 'moneyline', 'total', 'prop')),
    pick TEXT NOT NULL,
    confidence NUMERIC(5,2) NOT NULL,
    edge NUMERIC(5,2),
    odds INTEGER,
    market_line NUMERIC(6,2),
    reasoning TEXT,
    game_info JSONB,
    tier TEXT CHECK (tier IN ('elite', 'pro', 'free')),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'settled', 'void')),
    actual_outcome TEXT,
    pnl NUMERIC(10,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_syndicated_picks_sport ON syndicated_picks(sport);
CREATE INDEX IF NOT EXISTS idx_syndicated_picks_tier ON syndicated_picks(tier);
CREATE INDEX IF NOT EXISTS idx_syndicated_picks_status ON syndicated_picks(status);

DROP TRIGGER IF EXISTS update_syndicated_picks_updated_at ON syndicated_picks;
CREATE TRIGGER update_syndicated_picks_updated_at
    BEFORE UPDATE ON syndicated_picks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 10. Row Level Security (RLS) Policies
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE bot_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE trade_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE kalshi_bets ENABLE ROW LEVEL SECURITY;
ALTER TABLE polymarket_bets ENABLE ROW LEVEL SECURITY;
ALTER TABLE polymarket_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE markets ENABLE ROW LEVEL SECURITY;
ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE syndicated_picks ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users (read-only)
CREATE POLICY "Allow read access to bot_predictions" ON bot_predictions
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow read access to trade_history" ON trade_history
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow read access to kalshi_bets" ON kalshi_bets
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow read access to polymarket_bets" ON polymarket_bets
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow read access to polymarket_predictions" ON polymarket_predictions
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow read access to markets" ON markets
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow read access to predictions" ON predictions
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow read access to signals" ON signals
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow read access to syndicated_picks" ON syndicated_picks
    FOR SELECT TO authenticated USING (true);

-- Service role can do everything
CREATE POLICY "Service role full access bot_predictions" ON bot_predictions
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access kalshi_bets" ON kalshi_bets
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access polymarket_bets" ON polymarket_bets
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role full access polymarket_predictions" ON polymarket_predictions
    FOR ALL TO service_role USING (true) WITH CHECK (true);

-- =====================================================
-- 11. Views for Easy Querying
-- =====================================================

-- View: All open Kalshi predictions
CREATE OR REPLACE VIEW v_open_kalshi_predictions AS
SELECT * FROM bot_predictions 
WHERE platform = 'kalshi' AND actual_outcome IS NULL
ORDER BY confidence DESC, edge DESC;

-- View: All open Polymarket predictions
CREATE OR REPLACE VIEW v_open_polymarket_predictions AS
SELECT * FROM bot_predictions 
WHERE platform = 'polymarket' AND actual_outcome IS NULL
ORDER BY confidence DESC, edge DESC;

-- View: Kalshi bets by tier
CREATE OR REPLACE VIEW v_kalshi_bets_by_tier AS
SELECT 
    tier,
    COUNT(*) as count,
    AVG(confidence) as avg_confidence,
    AVG(edge) as avg_edge
FROM kalshi_bets
WHERE status = 'open'
GROUP BY tier;

-- View: Recent trade history
CREATE OR REPLACE VIEW v_recent_trades AS
SELECT 
    th.*,
    bp.market_title,
    bp.bot_category
FROM trade_history th
LEFT JOIN bot_predictions bp ON th.prediction_id = bp.id
WHERE th.placed_at > NOW() - INTERVAL '7 days'
ORDER BY th.placed_at DESC;

-- =====================================================
-- 12. Functions for Common Operations
-- =====================================================

-- Function: Get best picks by platform
CREATE OR REPLACE FUNCTION get_best_picks(platform_name TEXT, min_confidence INTEGER DEFAULT 50)
RETURNS TABLE (
    id UUID,
    market_id TEXT,
    market_title TEXT,
    prediction TEXT,
    confidence INTEGER,
    edge NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        bp.id,
        bp.market_id,
        bp.market_title,
        bp.prediction,
        bp.confidence,
        bp.edge
    FROM bot_predictions bp
    WHERE bp.platform = platform_name
        AND bp.confidence >= min_confidence
        AND bp.actual_outcome IS NULL
    ORDER BY bp.confidence DESC, bp.edge DESC
    LIMIT 20;
END;
$$ LANGUAGE plpgsql;

-- Function: Mark prediction as settled
CREATE OR REPLACE FUNCTION settle_prediction(
    p_market_id TEXT,
    p_platform TEXT,
    p_outcome TEXT,
    p_pnl NUMERIC DEFAULT 0
)
RETURNS VOID AS $$
BEGIN
    UPDATE bot_predictions
    SET 
        actual_outcome = p_outcome,
        resolved_at = NOW(),
        pnl = p_pnl,
        status = 'settled'
    WHERE market_id = p_market_id AND platform = p_platform;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Instructions:
-- 1. Go to https://app.supabase.com/project/rdbuwyefbgnbuhmjrizo
-- 2. Click "SQL Editor" in the left sidebar
-- 3. Click "New query"
-- 4. Paste this entire file
-- 5. Click "Run"
-- =====================================================
