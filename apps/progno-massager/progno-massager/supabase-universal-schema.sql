-- PROGNO Universal Probability Engine - Supabase Schema
-- ======================================================
-- Run this in your Supabase SQL Editor to set up all required tables

-- ============================================
-- PREDICTIONS TABLE
-- Tracks all predictions for accuracy analysis
-- ============================================

CREATE TABLE IF NOT EXISTS public.progno_predictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prediction_id TEXT UNIQUE NOT NULL,
    event_id TEXT NOT NULL,
    event_name TEXT NOT NULL,
    domain TEXT NOT NULL DEFAULT 'sports',
    progno_score DECIMAL(5,4) NOT NULL CHECK (progno_score >= 0 AND progno_score <= 1),
    predicted_outcome TEXT,
    confidence_level TEXT,
    factors_used JSONB DEFAULT '[]'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    actual_outcome TEXT,
    was_correct BOOLEAN,
    resolved_at TIMESTAMP WITH TIME ZONE,
    
    -- Indexes
    CONSTRAINT valid_domain CHECK (domain IN ('sports', 'prediction_markets', 'crypto', 'stocks', 'weather', 'other'))
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_predictions_domain ON public.progno_predictions(domain);
CREATE INDEX IF NOT EXISTS idx_predictions_created ON public.progno_predictions(created_at);
CREATE INDEX IF NOT EXISTS idx_predictions_resolved ON public.progno_predictions(was_correct) WHERE was_correct IS NOT NULL;

-- ============================================
-- WEIGHTS TABLE
-- Stores optimized weights per domain
-- ============================================

CREATE TABLE IF NOT EXISTS public.progno_weights (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    domain TEXT UNIQUE NOT NULL,
    weights JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    optimization_history JSONB DEFAULT '[]'::jsonb
);

-- Insert default weights
INSERT INTO public.progno_weights (domain, weights) VALUES
('sports', '{"home_bias": 0.05, "momentum_threshold": 3, "momentum_impact": 0.10, "time_decay_rate": 0.03, "sentiment_weight": 0.05}'::jsonb),
('prediction_markets', '{"home_bias": 0.03, "momentum_threshold": 2, "momentum_impact": 0.08, "time_decay_rate": 0.01, "sentiment_weight": 0.15}'::jsonb),
('crypto', '{"home_bias": 0.00, "momentum_threshold": 3, "momentum_impact": 0.15, "time_decay_rate": 0.10, "sentiment_weight": 0.20}'::jsonb),
('stocks', '{"home_bias": 0.02, "momentum_threshold": 5, "momentum_impact": 0.05, "time_decay_rate": 0.05, "sentiment_weight": 0.10}'::jsonb),
('weather', '{"home_bias": 0.00, "momentum_threshold": 2, "momentum_impact": 0.12, "time_decay_rate": 0.20, "sentiment_weight": 0.02}'::jsonb)
ON CONFLICT (domain) DO NOTHING;

-- ============================================
-- ALERTS TABLE
-- Stores all generated alerts
-- ============================================

CREATE TABLE IF NOT EXISTS public.progno_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_id TEXT UNIQUE NOT NULL,
    alert_type TEXT NOT NULL,
    priority TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    data JSONB DEFAULT '{}'::jsonb,
    domain TEXT DEFAULT 'general',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    acknowledged BOOLEAN DEFAULT FALSE,
    sent_channels JSONB DEFAULT '[]'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_alerts_type ON public.progno_alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_alerts_priority ON public.progno_alerts(priority);
CREATE INDEX IF NOT EXISTS idx_alerts_created ON public.progno_alerts(created_at);

-- ============================================
-- ARBITRAGE OPPORTUNITIES TABLE
-- Stores found arbitrage for analysis
-- ============================================

CREATE TABLE IF NOT EXISTS public.progno_arbitrage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id TEXT NOT NULL,
    event_name TEXT NOT NULL,
    domain TEXT NOT NULL,
    profit_pct DECIMAL(6,4) NOT NULL,
    strategy TEXT,
    odds_data JSONB NOT NULL,
    stakes JSONB,
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expired_at TIMESTAMP WITH TIME ZONE,
    was_executed BOOLEAN DEFAULT FALSE,
    actual_profit DECIMAL(10,2)
);

CREATE INDEX IF NOT EXISTS idx_arb_profit ON public.progno_arbitrage(profit_pct DESC);
CREATE INDEX IF NOT EXISTS idx_arb_domain ON public.progno_arbitrage(domain);

-- ============================================
-- ACCURACY METRICS TABLE
-- Daily/weekly accuracy snapshots
-- ============================================

CREATE TABLE IF NOT EXISTS public.progno_accuracy_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    period_type TEXT NOT NULL, -- 'daily', 'weekly', 'monthly'
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    domain TEXT,
    total_predictions INTEGER DEFAULT 0,
    correct_predictions INTEGER DEFAULT 0,
    accuracy DECIMAL(5,4),
    brier_score DECIMAL(6,5),
    calibration_error DECIMAL(6,5),
    avg_confidence DECIMAL(5,4),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(period_type, period_start, domain)
);

-- ============================================
-- FEED CACHE TABLE
-- Cache API responses to reduce calls
-- ============================================

CREATE TABLE IF NOT EXISTS public.progno_feed_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feed_name TEXT NOT NULL,
    cache_key TEXT NOT NULL,
    data JSONB NOT NULL,
    cached_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    
    UNIQUE(feed_name, cache_key)
);

CREATE INDEX IF NOT EXISTS idx_cache_expires ON public.progno_feed_cache(expires_at);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to calculate daily accuracy
CREATE OR REPLACE FUNCTION calculate_daily_accuracy(target_date DATE, target_domain TEXT DEFAULT NULL)
RETURNS TABLE(
    domain TEXT,
    total INTEGER,
    correct INTEGER,
    accuracy DECIMAL,
    brier DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.domain,
        COUNT(*)::INTEGER as total,
        COUNT(*) FILTER (WHERE p.was_correct = TRUE)::INTEGER as correct,
        CASE 
            WHEN COUNT(*) > 0 THEN 
                COUNT(*) FILTER (WHERE p.was_correct = TRUE)::DECIMAL / COUNT(*)
            ELSE 0 
        END as accuracy,
        CASE 
            WHEN COUNT(*) > 0 THEN 
                AVG(POWER(p.progno_score - CASE WHEN p.was_correct THEN 1 ELSE 0 END, 2))
            ELSE 0.25 
        END as brier
    FROM public.progno_predictions p
    WHERE p.created_at::DATE = target_date
      AND p.was_correct IS NOT NULL
      AND (target_domain IS NULL OR p.domain = target_domain)
    GROUP BY p.domain;
END;
$$ LANGUAGE plpgsql;

-- Function to get prediction streak
CREATE OR REPLACE FUNCTION get_prediction_streak(target_domain TEXT DEFAULT NULL)
RETURNS TABLE(
    current_streak INTEGER,
    streak_type TEXT,
    last_result BOOLEAN
) AS $$
DECLARE
    rec RECORD;
    streak INTEGER := 0;
    last_correct BOOLEAN := NULL;
BEGIN
    FOR rec IN 
        SELECT was_correct 
        FROM public.progno_predictions 
        WHERE was_correct IS NOT NULL
          AND (target_domain IS NULL OR domain = target_domain)
        ORDER BY resolved_at DESC
        LIMIT 50
    LOOP
        IF last_correct IS NULL THEN
            last_correct := rec.was_correct;
            streak := 1;
        ELSIF rec.was_correct = last_correct THEN
            streak := streak + 1;
        ELSE
            EXIT;
        END IF;
    END LOOP;
    
    RETURN QUERY SELECT 
        streak,
        CASE WHEN last_correct THEN 'winning' ELSE 'losing' END,
        last_correct;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- ROW LEVEL SECURITY (Optional)
-- ============================================

-- Enable RLS if needed for multi-tenant scenarios
-- ALTER TABLE public.progno_predictions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.progno_alerts ENABLE ROW LEVEL SECURITY;

-- ============================================
-- CLEANUP FUNCTION
-- Remove old cached data
-- ============================================

CREATE OR REPLACE FUNCTION cleanup_old_cache()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.progno_feed_cache 
    WHERE expires_at < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Schedule cleanup (run daily via Supabase cron or external trigger)
-- SELECT cleanup_old_cache();

-- ============================================
-- VIEWS
-- ============================================

-- View: Recent accuracy summary
CREATE OR REPLACE VIEW public.v_accuracy_summary AS
SELECT 
    domain,
    COUNT(*) as total_predictions,
    COUNT(*) FILTER (WHERE was_correct = TRUE) as correct,
    ROUND(AVG(CASE WHEN was_correct THEN 1.0 ELSE 0.0 END) * 100, 2) as accuracy_pct,
    ROUND(AVG(POWER(progno_score - CASE WHEN was_correct THEN 1 ELSE 0 END, 2))::DECIMAL, 4) as brier_score,
    ROUND(AVG(progno_score) * 100, 2) as avg_confidence_pct
FROM public.progno_predictions
WHERE was_correct IS NOT NULL
  AND created_at > NOW() - INTERVAL '30 days'
GROUP BY domain
ORDER BY accuracy_pct DESC;

-- View: Active alerts
CREATE OR REPLACE VIEW public.v_active_alerts AS
SELECT *
FROM public.progno_alerts
WHERE acknowledged = FALSE
  AND (expires_at IS NULL OR expires_at > NOW())
ORDER BY 
    CASE priority 
        WHEN 'critical' THEN 1 
        WHEN 'high' THEN 2 
        WHEN 'medium' THEN 3 
        ELSE 4 
    END,
    created_at DESC;

-- View: Recent arbitrage opportunities
CREATE OR REPLACE VIEW public.v_recent_arbitrage AS
SELECT *
FROM public.progno_arbitrage
WHERE detected_at > NOW() - INTERVAL '24 hours'
ORDER BY profit_pct DESC
LIMIT 50;

COMMENT ON TABLE public.progno_predictions IS 'Tracks all PROGNO predictions for accuracy analysis';
COMMENT ON TABLE public.progno_weights IS 'Domain-specific weights for probability calculations';
COMMENT ON TABLE public.progno_alerts IS 'Alert history for arbitrage and high-confidence predictions';
COMMENT ON TABLE public.progno_arbitrage IS 'Detected arbitrage opportunities';
COMMENT ON TABLE public.progno_accuracy_metrics IS 'Historical accuracy snapshots';

