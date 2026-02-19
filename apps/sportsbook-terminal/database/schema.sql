--
-- Prognostication Capital - Institutional Database Schema
-- PostgreSQL 15+
--
-- This schema supports:
-- - Multi-venue trading (Sportsbook, Kalshi, Polymarket)
-- - Portfolio allocation tracking
n-- - Risk metrics logging
-- - Fund accounting (for hedge fund layer)
-- - Audit trail compliance
--

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- CORE TABLES
-- =====================================================

-- Users table (SaaS + Fund investors)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT,
    role TEXT NOT NULL DEFAULT 'free' CHECK (role IN ('free', 'pro', 'enterprise', 'fund_lp')),
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    subscription_status TEXT DEFAULT 'inactive' CHECK (subscription_status IN ('active', 'inactive', 'past_due', 'canceled')),
    subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro', 'enterprise', 'fund_lp')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_login TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_stripe ON users(stripe_customer_id);

-- User preferences and settings
CREATE TABLE user_settings (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    default_bankroll DECIMAL(15,2) DEFAULT 100000.00,
    kelly_fraction DECIMAL(4,3) DEFAULT 0.330,
    max_event_exposure DECIMAL(4,3) DEFAULT 0.050,
    max_league_exposure DECIMAL(4,3) DEFAULT 0.150,
    max_venue_exposure DECIMAL(4,3) DEFAULT 0.400,
    drawdown_threshold DECIMAL(4,3) DEFAULT 0.150,
    notifications_enabled BOOLEAN DEFAULT true,
    email_alerts BOOLEAN DEFAULT true,
    webhook_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- MARKET DATA
-- =====================================================

-- Markets table (sports events, Kalshi contracts, Polymarket markets)
CREATE TABLE markets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    external_id TEXT, -- Venue's native ID
    venue TEXT NOT NULL CHECK (venue IN ('sportsbook', 'kalshi', 'polymarket')),
    market_type TEXT NOT NULL CHECK (market_type IN ('sports', 'politics', 'crypto', 'economics', 'entertainment')),
    
    -- Event details
    event_name TEXT NOT NULL,
    event_date TIMESTAMP WITH TIME ZONE,
    sport TEXT,
    league TEXT,
    home_team TEXT,
    away_team TEXT,
    
    -- Market specifics
    market_description TEXT,
    contract_type TEXT, -- YES/NO for Kalshi/Polymarket, SPREAD/MONEYLINE/TOTAL for sports
    expiry_date TIMESTAMP WITH TIME ZONE,
    
    -- Current market data
    implied_probability DECIMAL(5,4), -- 0-1
    decimal_odds DECIMAL(8,4),
    american_odds INTEGER,
    liquidity DECIMAL(15,2),
    volume_24h DECIMAL(15,2),
    
    -- Metadata
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed', 'settled', 'cancelled')),
    source_data JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_markets_venue ON markets(venue);
CREATE INDEX idx_markets_status ON markets(status);
CREATE INDEX idx_markets_event_date ON markets(event_date);
CREATE INDEX idx_markets_type ON markets(market_type);

-- Market odds history (for tracking line movement)
CREATE TABLE market_odds_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    market_id UUID REFERENCES markets(id) ON DELETE CASCADE,
    implied_probability DECIMAL(5,4),
    decimal_odds DECIMAL(8,4),
    american_odds INTEGER,
    liquidity DECIMAL(15,2),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_odds_history_market ON market_odds_history(market_id);
CREATE INDEX idx_odds_history_timestamp ON market_odds_history(timestamp);

-- =====================================================
-- PREDICTIONS & SIGNALS
-- =====================================================

-- Model predictions
CREATE TABLE predictions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    market_id UUID REFERENCES markets(id) ON DELETE CASCADE,
    
    -- Model outputs
    model_version TEXT NOT NULL,
    model_probability DECIMAL(5,4) NOT NULL, -- 0-1
    confidence DECIMAL(5,2) NOT NULL, -- 0-100
    variance DECIMAL(8,6),
    
    -- Edge calculation
    market_probability DECIMAL(5,4),
    edge DECIMAL(6,4), -- model - market
    expected_value DECIMAL(8,4),
    value_bet_edge DECIMAL(6,4),
    
    -- Simulation results (Monte Carlo)
    mc_mean DECIMAL(10,4),
    mc_std DECIMAL(10,4),
    mc_p05 DECIMAL(10,4),
    mc_p25 DECIMAL(10,4),
    mc_p50 DECIMAL(10,4),
    mc_p75 DECIMAL(10,4),
    mc_p95 DECIMAL(10,4),
    
    -- Metadata
    is_premium BOOLEAN DEFAULT false,
    correlation_group TEXT,
    simulation_count INTEGER DEFAULT 100000,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    valid_until TIMESTAMP WITH TIME ZONE,
    
    UNIQUE(market_id, model_version, created_at)
);

CREATE INDEX idx_predictions_market ON predictions(market_id);
CREATE INDEX idx_predictions_confidence ON predictions(confidence);
CREATE INDEX idx_predictions_edge ON predictions(edge);
CREATE INDEX idx_predictions_created ON predictions(created_at);

-- Signals table (processed, actionable signals)
CREATE TABLE signals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    prediction_id UUID REFERENCES predictions(id) ON DELETE CASCADE,
    
    -- Signal classification
    signal_type TEXT NOT NULL CHECK (signal_type IN ('single', 'parlay', 'teaser', 'kalshi', 'polymarket', 'arb')),
    strength TEXT CHECK (strength IN ('strong', 'moderate', 'weak')),
    
    -- Calculated values
    recommended_stake DECIMAL(15,2),
    kelly_fraction DECIMAL(5,4),
    risk_percent DECIMAL(5,4),
    
    -- Status
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'executed', 'expired', 'cancelled')),
    executed_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_signals_prediction ON signals(prediction_id);
CREATE INDEX idx_signals_status ON signals(status);
CREATE INDEX idx_signals_type ON signals(signal_type);

-- =====================================================
-- PORTFOLIO & ALLOCATION
-- =====================================================

-- Portfolio exposures (real-time tracking)
CREATE TABLE portfolio_exposure (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    -- Exposure breakdown
    event_id TEXT,
    league TEXT,
    venue TEXT CHECK (venue IN ('sportsbook', 'kalshi', 'polymarket')),
    exposure_amount DECIMAL(15,2) DEFAULT 0,
    exposure_percent DECIMAL(5,4) DEFAULT 0,
    
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id, event_id),
    UNIQUE(user_id, league),
    UNIQUE(user_id, venue)
);

CREATE INDEX idx_exposure_user ON portfolio_exposure(user_id);
CREATE INDEX idx_exposure_venue ON portfolio_exposure(venue);

-- Capital allocations (audit trail)
CREATE TABLE allocations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    signal_id UUID REFERENCES signals(id) ON DELETE SET NULL,
    
    -- Allocation details
    stake DECIMAL(15,2) NOT NULL,
    bankroll_at_time DECIMAL(15,2) NOT NULL,
    kelly_fraction DECIMAL(5,4),
    adjusted_kelly DECIMAL(5,4),
    edge DECIMAL(6,4),
    expected_value DECIMAL(8,4),
    
    -- Cap tracking
    was_capped BOOLEAN DEFAULT false,
    cap_reason TEXT,
    
    -- Risk metrics
    risk_percent DECIMAL(5,4),
    liquidity_adjusted BOOLEAN DEFAULT false,
    correlation_penalty BOOLEAN DEFAULT false,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_allocations_user ON allocations(user_id);
CREATE INDEX idx_allocations_signal ON allocations(signal_id);
CREATE INDEX idx_allocations_created ON allocations(created_at);

-- =====================================================
-- TRADES & EXECUTION
-- =====================================================

-- Executed trades
CREATE TABLE trades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    allocation_id UUID REFERENCES allocations(id) ON DELETE SET NULL,
    market_id UUID REFERENCES markets(id) ON DELETE SET NULL,
    
    -- Trade details
    venue TEXT NOT NULL CHECK (venue IN ('sportsbook', 'kalshi', 'polymarket')),
    trade_type TEXT NOT NULL CHECK (trade_type IN ('single', 'parlay', 'teaser')),
    side TEXT CHECK (side IN ('yes', 'no', 'over', 'under', 'home', 'away')),
    
    stake DECIMAL(15,2) NOT NULL,
    odds_at_execution DECIMAL(8,4),
    implied_prob_at_exec DECIMAL(5,4),
    
    -- Status
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'won', 'lost', 'void', 'cashed_out')),
    outcome BOOLEAN, -- true = win, false = loss
    pnl DECIMAL(15,2),
    roi DECIMAL(6,4), -- return on investment
    
    -- Execution metadata
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    settled_at TIMESTAMP WITH TIME ZONE,
    external_trade_id TEXT,
    notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_trades_user ON trades(user_id);
CREATE INDEX idx_trades_status ON trades(status);
CREATE INDEX idx_trades_venue ON trades(venue);
CREATE INDEX idx_trades_executed ON trades(executed_at);

-- Parlay legs (for tracking multi-leg bets)
CREATE TABLE parlay_legs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trade_id UUID REFERENCES trades(id) ON DELETE CASCADE,
    market_id UUID REFERENCES markets(id) ON DELETE CASCADE,
    leg_order INTEGER NOT NULL,
    outcome BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- FUND LAYER (Hedge Fund Accounting)
-- =====================================================

-- Fund investors (LPs)
CREATE TABLE fund_investors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    -- Investor details
    accredited BOOLEAN DEFAULT false,
    investment_amount DECIMAL(15,2) NOT NULL,
    investment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Performance tracking
    initial_nav DECIMAL(15,2),
    current_nav DECIMAL(15,2),
    high_water_mark DECIMAL(15,2),
    
    -- Fee calculation
    management_fee_rate DECIMAL(5,4) DEFAULT 0.0200, -- 2%
    performance_fee_rate DECIMAL(5,4) DEFAULT 0.2000, -- 20%
    fees_paid_ytd DECIMAL(15,2) DEFAULT 0,
    
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'redeemed', 'locked')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Fund NAV history
CREATE TABLE fund_nav_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE NOT NULL,
    total_aum DECIMAL(15,2) NOT NULL,
    cash_balance DECIMAL(15,2),
    open_exposure DECIMAL(15,2),
    daily_pnl DECIMAL(15,2),
    mtd_return DECIMAL(6,4),
    ytd_return DECIMAL(6,4),
    
    -- Risk metrics
    sharpe_ratio DECIMAL(6,4),
    sortino_ratio DECIMAL(6,4),
    max_drawdown DECIMAL(6,4),
    var_95 DECIMAL(15,2),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(date)
);

-- Investor statements (monthly)
CREATE TABLE investor_statements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    investor_id UUID REFERENCES fund_investors(id) ON DELETE CASCADE,
    statement_month DATE NOT NULL,
    
    opening_nav DECIMAL(15,2),
    closing_nav DECIMAL(15,2),
    monthly_return DECIMAL(6,4),
    cumulative_return DECIMAL(6,4),
    
    management_fee DECIMAL(15,2),
    performance_fee DECIMAL(15,2),
    net_return DECIMAL(6,4),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(investor_id, statement_month)
);

-- =====================================================
-- RISK & COMPLIANCE
-- =====================================================

-- Risk metrics log
CREATE TABLE risk_metrics_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Portfolio metrics
    total_exposure DECIMAL(15,2),
    exposure_percent DECIMAL(5,4),
    
    -- Concentration
    max_event_concentration DECIMAL(5,4),
    max_league_concentration DECIMAL(5,4),
    max_venue_concentration DECIMAL(5,4),
    
    -- Risk ratios
    sharpe_ratio DECIMAL(6,4),
    sortino_ratio DECIMAL(6,4),
    
    -- Drawdown
    current_drawdown DECIMAL(5,4),
    max_drawdown DECIMAL(5,4),
    
    -- Value at Risk
    var_95 DECIMAL(15,2),
    expected_shortfall DECIMAL(15,2),
    
    -- Kelly metrics
    avg_kelly_fraction DECIMAL(5,4),
    portfolio_kelly_score DECIMAL(6,4),
    
    -- Diversification
    diversification_score DECIMAL(5,4),
    num_positions INTEGER,
    num_leagues INTEGER,
    
    metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_risk_user ON risk_metrics_log(user_id);
CREATE INDEX idx_risk_calculated ON risk_metrics_log(calculated_at);

-- Audit log (compliance)
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    
    old_values JSONB,
    new_values JSONB,
    
    ip_address INET,
    user_agent TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_audit_user ON audit_log(user_id);
CREATE INDEX idx_audit_action ON audit_log(action);
CREATE INDEX idx_audit_created ON audit_log(created_at);

-- =====================================================
-- VIEWS & FUNCTIONS
-- =====================================================

-- Current portfolio summary view
CREATE VIEW portfolio_summary AS
SELECT 
    user_id,
    SUM(exposure_amount) as total_exposure,
    MAX(CASE WHEN venue = 'sportsbook' THEN exposure_amount ELSE 0 END) as sportsbook_exposure,
    MAX(CASE WHEN venue = 'kalshi' THEN exposure_amount ELSE 0 END) as kalshi_exposure,
    MAX(CASE WHEN venue = 'polymarket' THEN exposure_amount ELSE 0 END) as polymarket_exposure,
    COUNT(DISTINCT event_id) as num_events,
    COUNT(DISTINCT league) as num_leagues
FROM portfolio_exposure
GROUP BY user_id;

-- Trade performance view
CREATE VIEW trade_performance AS
SELECT 
    user_id,
    venue,
    COUNT(*) as total_trades,
    SUM(CASE WHEN outcome = true THEN 1 ELSE 0 END) as wins,
    SUM(CASE WHEN outcome = false THEN 1 ELSE 0 END) as losses,
    SUM(pnl) as total_pnl,
    AVG(roi) as avg_roi,
    SUM(stake) as total_volume
FROM trades
WHERE status IN ('won', 'lost')
GROUP BY user_id, venue;

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_settings_updated_at BEFORE UPDATE ON user_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_markets_updated_at BEFORE UPDATE ON markets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trades_updated_at BEFORE UPDATE ON trades
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fund_investors_updated_at BEFORE UPDATE ON fund_investors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- SEED DATA
-- =====================================================

-- Insert default admin user (change password!)
INSERT INTO users (email, role, subscription_status, subscription_tier) 
VALUES ('admin@prognostication.capital', 'fund_lp', 'active', 'fund_lp')
ON CONFLICT (email) DO NOTHING;

-- Initialize user settings for admin
INSERT INTO user_settings (user_id)
SELECT id FROM users WHERE email = 'admin@prognostication.capital'
ON CONFLICT (user_id) DO NOTHING;
