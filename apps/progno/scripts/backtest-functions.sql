-- Part 2: Functions (run this after Part 1 in Supabase SQL Editor)
-- If this fails, run each CREATE FUNCTION separately

-- Function 1: Grade a prediction with outcome
CREATE OR REPLACE FUNCTION grade_prediction(
  prediction_id UUID,
  actual_outcome TEXT,
  actual_profit NUMERIC,
  game_outcome_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE progno_predictions
  SET
    result = actual_outcome,
    profit = actual_profit,
    graded_at = NOW(),
    game_outcome_id = game_outcome_id,
    updated_at = NOW()
  WHERE id = prediction_id;

  RETURN TRUE;
EXCEPTION WHEN OTHERS THEN
  RETURN FALSE;
END;
$$;

-- Function 2: Calculate win rate for backtesting
CREATE OR REPLACE FUNCTION calculate_win_rate(
  sport_filter TEXT DEFAULT NULL,
  start_date DATE DEFAULT NULL,
  end_date DATE DEFAULT NULL,
  min_confidence INTEGER DEFAULT 0,
  model_version_filter TEXT DEFAULT NULL
)
RETURNS TABLE (
  total_predictions BIGINT,
  wins BIGINT,
  losses BIGINT,
  pushes BIGINT,
  win_rate NUMERIC,
  total_profit NUMERIC,
  avg_confidence NUMERIC
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_predictions,
    COUNT(*) FILTER (WHERE p.result = 'win')::BIGINT as wins,
    COUNT(*) FILTER (WHERE p.result = 'loss')::BIGINT as losses,
    COUNT(*) FILTER (WHERE p.result = 'push')::BIGINT as pushes,
    ROUND(
      (COUNT(*) FILTER (WHERE p.result = 'win')::NUMERIC /
       NULLIF(COUNT(*) FILTER (WHERE p.result IN ('win', 'loss')), 0)) * 100,
      2
    ) as win_rate,
    ROUND(SUM(p.profit), 2) as total_profit,
    ROUND(AVG(p.confidence), 2) as avg_confidence
  FROM progno_predictions p
  LEFT JOIN prediction_factors pf ON p.id = pf.prediction_id
  WHERE
    p.result IS NOT NULL
    AND (sport_filter IS NULL OR p.category = sport_filter)
    AND (start_date IS NULL OR p.created_at::DATE >= start_date)
    AND (end_date IS NULL OR p.created_at::DATE <= end_date)
    AND p.confidence >= min_confidence
    AND (model_version_filter IS NULL OR pf.model_version = model_version_filter);
END;
$$;
