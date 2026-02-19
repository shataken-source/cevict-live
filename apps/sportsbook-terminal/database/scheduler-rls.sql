-- RLS Policies for Scheduler Tables
-- Run this after the scheduler-tables.sql to secure the new tables

-- 1) daily_predictions: read-only for all, writes via service_role only
ALTER TABLE daily_predictions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON daily_predictions FROM PUBLIC;
GRANT SELECT ON daily_predictions TO authenticated, anon;

DROP POLICY IF EXISTS daily_predictions_ro ON daily_predictions;
CREATE POLICY daily_predictions_ro ON daily_predictions
FOR SELECT TO authenticated, anon
USING (true);

-- 2) graded_results: read-only for all, writes via service_role only
ALTER TABLE graded_results ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON graded_results FROM PUBLIC;
GRANT SELECT ON graded_results TO authenticated, anon;

DROP POLICY IF EXISTS graded_results_ro ON graded_results;
CREATE POLICY graded_results_ro ON graded_results
FOR SELECT TO authenticated, anon
USING (true);

-- 3) scheduler_runs: read-only for authenticated (admin visibility)
ALTER TABLE scheduler_runs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON scheduler_runs FROM PUBLIC;
GRANT SELECT ON scheduler_runs TO authenticated;

DROP POLICY IF EXISTS scheduler_runs_ro ON scheduler_runs;
CREATE POLICY scheduler_runs_ro ON scheduler_runs
FOR SELECT TO authenticated
USING (true);

-- Additional indexes for performance
CREATE INDEX IF NOT EXISTS idx_daily_predictions_date_sport ON daily_predictions(prediction_date, sport);
CREATE INDEX IF NOT EXISTS idx_daily_predictions_outcome ON daily_predictions(outcome) WHERE outcome IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_graded_results_date_status ON graded_results(result_date, status);
CREATE INDEX IF NOT EXISTS idx_scheduler_runs_status ON scheduler_runs(status);

-- Grant select on performance views
GRANT SELECT ON prediction_performance TO authenticated, anon;
GRANT SELECT ON confidence_performance TO authenticated, anon;
