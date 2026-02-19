--
-- Scheduler Tables for Probability Analyzer
-- Tables for storing processed predictions and graded results
--

-- Daily predictions table (for processed prediction files)
CREATE TABLE IF NOT EXISTS daily_predictions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_id TEXT NOT NULL,
    sport TEXT NOT NULL,
    league TEXT,
    home_team TEXT NOT NULL,
    away_team TEXT NOT NULL,
    pick TEXT NOT NULL,
    pick_type TEXT NOT NULL CHECK (pick_type IN ('SPREAD', 'MONEYLINE', 'TOTAL', 'TEAM_TOTAL', 'PROP')),
    recommended_line DECIMAL(6,2),
    odds INTEGER,
    confidence DECIMAL(5,2) NOT NULL,
    expected_value DECIMAL(8,4),
    win_probability DECIMAL(5,4),
    game_time TIMESTAMP WITH TIME ZONE,
    prediction_date DATE NOT NULL,
    generated_at TIMESTAMP WITH TIME ZONE,
    source_file TEXT,
    outcome TEXT CHECK (outcome IN ('win', 'loss', 'pending', 'void')),
    actual_score JSONB,
    graded_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(game_id, prediction_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_predictions_date ON daily_predictions(prediction_date);
CREATE INDEX IF NOT EXISTS idx_daily_predictions_game ON daily_predictions(game_id);
CREATE INDEX IF NOT EXISTS idx_daily_predictions_sport ON daily_predictions(sport);
CREATE INDEX IF NOT EXISTS idx_daily_predictions_pick_type ON daily_predictions(pick_type);
CREATE INDEX IF NOT EXISTS idx_daily_predictions_outcome ON daily_predictions(outcome);

-- Graded results table (for processed results files)
CREATE TABLE IF NOT EXISTS graded_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    game_id TEXT NOT NULL,
    sport TEXT NOT NULL,
    home_team TEXT NOT NULL,
    away_team TEXT NOT NULL,
    confidence DECIMAL(5,2),
    status TEXT NOT NULL CHECK (status IN ('win', 'loss', 'pending', 'void')),
    actual_score JSONB,
    pick_result TEXT,
    result_date DATE NOT NULL,
    source_file TEXT,
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(game_id, result_date)
);

CREATE INDEX IF NOT EXISTS idx_graded_results_date ON graded_results(result_date);
CREATE INDEX IF NOT EXISTS idx_graded_results_game ON graded_results(game_id);
CREATE INDEX IF NOT EXISTS idx_graded_results_sport ON graded_results(sport);
CREATE INDEX IF NOT EXISTS idx_graded_results_status ON graded_results(status);

-- Scheduler run log (for tracking job execution)
CREATE TABLE IF NOT EXISTS scheduler_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    run_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    predictions_processed INTEGER DEFAULT 0,
    results_processed INTEGER DEFAULT 0,
    predictions_archived INTEGER DEFAULT 0,
    results_archived INTEGER DEFAULT 0,
    errors INTEGER DEFAULT 0,
    duration_seconds INTEGER,
    status TEXT DEFAULT 'running' CHECK (status IN ('running', 'success', 'partial', 'failed')),
    log_file TEXT,
    error_messages JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scheduler_runs_date ON scheduler_runs(run_date);
CREATE INDEX IF NOT EXISTS idx_scheduler_runs_status ON scheduler_runs(status);

-- Performance summary view (win rates by pick type, sport, etc)
CREATE OR REPLACE VIEW prediction_performance AS
SELECT 
    prediction_date,
    sport,
    pick_type,
    COUNT(*) as total_picks,
    COUNT(*) FILTER (WHERE outcome = 'win') as wins,
    COUNT(*) FILTER (WHERE outcome = 'loss') as losses,
    COUNT(*) FILTER (WHERE outcome = 'pending') as pending,
    CASE 
        WHEN COUNT(*) FILTER (WHERE outcome IN ('win', 'loss')) > 0 
        THEN (COUNT(*) FILTER (WHERE outcome = 'win')::DECIMAL / 
              COUNT(*) FILTER (WHERE outcome IN ('win', 'loss'))) * 100
        ELSE 0 
    END as win_rate,
    AVG(confidence) as avg_confidence,
    AVG(expected_value) as avg_ev
FROM daily_predictions
WHERE outcome IS NOT NULL
GROUP BY prediction_date, sport, pick_type;

-- Confidence level performance view
CREATE OR REPLACE VIEW confidence_performance AS
SELECT 
    CASE 
        WHEN confidence >= 65 THEN 'High (65%+)'
        WHEN confidence >= 55 THEN 'Medium (55-64%)'
        ELSE 'Low (<55%)'
    END as confidence_level,
    pick_type,
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE outcome = 'win') as wins,
    COUNT(*) FILTER (WHERE outcome = 'loss') as losses,
    CASE 
        WHEN COUNT(*) FILTER (WHERE outcome IN ('win', 'loss')) > 0 
        THEN (COUNT(*) FILTER (WHERE outcome = 'win')::DECIMAL / 
              COUNT(*) FILTER (WHERE outcome IN ('win', 'loss'))) * 100
        ELSE 0 
    END as win_rate
FROM daily_predictions
WHERE outcome IN ('win', 'loss')
GROUP BY 
    CASE 
        WHEN confidence >= 65 THEN 'High (65%+)'
        WHEN confidence >= 55 THEN 'Medium (55-64%)'
        ELSE 'Low (<55%)'
    END,
    pick_type;

-- Trigger to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update trigger to daily_predictions
DROP TRIGGER IF EXISTS update_daily_predictions_updated_at ON daily_predictions;
CREATE TRIGGER update_daily_predictions_updated_at 
    BEFORE UPDATE ON daily_predictions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
