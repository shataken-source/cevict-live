-- Functions for backtesting (run after schema)
-- Version without DEFAULT in parameters for Supabase compatibility

-- Function 1: Grade a prediction
CREATE OR REPLACE FUNCTION grade_prediction(
  p_prediction_id UUID,
  p_actual_outcome TEXT,
  p_actual_profit NUMERIC,
  p_game_outcome_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE progno_predictions
  SET
    result = p_actual_outcome,
    profit = p_actual_profit,
    graded_at = NOW(),
    game_outcome_id = p_game_outcome_id,
    updated_at = NOW()
  WHERE id = p_prediction_id;

  RETURN TRUE;
EXCEPTION WHEN OTHERS THEN
  RETURN FALSE;
END;
$$;

-- Function 2: Calculate win rate
CREATE OR REPLACE FUNCTION calculate_win_rate(
  p_sport_filter TEXT,
  p_start_date DATE,
  p_end_date DATE,
  p_min_confidence INTEGER,
  p_model_version_filter TEXT
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
    AND (p_sport_filter IS NULL OR p.category = p_sport_filter)
    AND (p_start_date IS NULL OR p.created_at::DATE >= p_start_date)
    AND (p_end_date IS NULL OR p.created_at::DATE <= p_end_date)
    AND (p_min_confidence IS NULL OR p.confidence >= p_min_confidence)
    AND (p_model_version_filter IS NULL OR pf.model_version = p_model_version_filter);
END;
$$;
