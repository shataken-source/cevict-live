-- ============================================
-- PROGNO MASSAGER - SUPABASE MEMORY SCHEMA
-- ============================================
-- Run this in your Supabase SQL Editor to create
-- the memory tracking table.

-- Drop existing table if needed (comment out for production)
-- DROP TABLE IF EXISTS progno_outcomes;

-- Create the PROGNO Memory Table
CREATE TABLE IF NOT EXISTS progno_outcomes (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Event Details
    event_name text NOT NULL,
    event_date timestamp with time zone,
    
    -- The "Progno" Logic
    model_version text DEFAULT 'Cevict Flex 1.0',
    probability_score float8 CHECK (probability_score >= 0 AND probability_score <= 1),
    
    -- Arbitrage & Hedge Data (JSON for flexibility)
    is_arb_found boolean DEFAULT false,
    calc_metadata jsonb DEFAULT '{}',
    
    -- Outcome Tracking (filled in after event)
    actual_result text,
    was_prediction_correct boolean
);

-- Enable Row Level Security
ALTER TABLE progno_outcomes ENABLE ROW LEVEL SECURITY;

-- Create policy for service role full access
CREATE POLICY "Service role has full access" ON progno_outcomes
    FOR ALL USING (true);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_progno_created 
    ON progno_outcomes(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_progno_arb 
    ON progno_outcomes(is_arb_found) 
    WHERE is_arb_found = true;

CREATE INDEX IF NOT EXISTS idx_progno_verified 
    ON progno_outcomes(was_prediction_correct) 
    WHERE actual_result IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_progno_event_name 
    ON progno_outcomes USING gin(to_tsvector('english', event_name));

-- ============================================
-- HELPER VIEWS
-- ============================================

-- View: Recent predictions
CREATE OR REPLACE VIEW progno_recent AS
SELECT 
    id,
    event_name,
    probability_score,
    is_arb_found,
    actual_result,
    was_prediction_correct,
    created_at
FROM progno_outcomes
ORDER BY created_at DESC
LIMIT 100;

-- View: Accuracy statistics
CREATE OR REPLACE VIEW progno_accuracy_stats AS
SELECT 
    model_version,
    COUNT(*) as total_predictions,
    COUNT(actual_result) as verified_predictions,
    SUM(CASE WHEN was_prediction_correct THEN 1 ELSE 0 END) as correct_predictions,
    ROUND(
        (SUM(CASE WHEN was_prediction_correct THEN 1 ELSE 0 END)::numeric / 
         NULLIF(COUNT(actual_result), 0)::numeric) * 100, 
        2
    ) as accuracy_pct,
    SUM(CASE WHEN is_arb_found THEN 1 ELSE 0 END) as arb_opportunities
FROM progno_outcomes
GROUP BY model_version;

-- View: Arbitrage history
CREATE OR REPLACE VIEW progno_arb_history AS
SELECT 
    id,
    event_name,
    probability_score,
    calc_metadata->>'profit_pct' as arb_profit_pct,
    calc_metadata->>'stakes' as recommended_stakes,
    created_at
FROM progno_outcomes
WHERE is_arb_found = true
ORDER BY created_at DESC;

-- ============================================
-- SAMPLE DATA (for testing)
-- ============================================

-- Uncomment to insert test data
/*
INSERT INTO progno_outcomes (event_name, probability_score, model_version, is_arb_found, calc_metadata)
VALUES 
    ('Alabama vs Georgia', 0.78, 'Cevict Flex 1.0', false, '{"home_bias": true, "momentum": 4}'),
    ('LSU vs Florida', 0.65, 'Cevict Flex 1.0', true, '{"profit_pct": 2.3, "stakes": [520, 480]}'),
    ('Ohio State vs Michigan', 0.82, 'Cevict Flex 1.0', false, '{"streak": 5, "injury_impact": 0}');
*/

-- ============================================
-- GRANT PERMISSIONS (if needed)
-- ============================================

-- Grant access to authenticated users (adjust as needed)
-- GRANT SELECT ON progno_outcomes TO authenticated;
-- GRANT SELECT ON progno_recent TO authenticated;
-- GRANT SELECT ON progno_accuracy_stats TO authenticated;
-- GRANT SELECT ON progno_arb_history TO authenticated;

