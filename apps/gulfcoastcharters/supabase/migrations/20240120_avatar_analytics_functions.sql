-- Avatar Analytics Functions for Admin Dashboard
-- Created: 2024-01-20

-- Function to get comprehensive avatar analytics
CREATE OR REPLACE FUNCTION get_avatar_analytics()
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_revenue', (
      SELECT COALESCE(SUM(points_spent), 0)
      FROM avatar_purchase_log
      WHERE transaction_type = 'spent'
    ),
    'active_shoppers', (
      SELECT COUNT(DISTINCT user_id)
      FROM avatar_purchase_log
      WHERE created_at >= NOW() - INTERVAL '30 days'
    ),
    'purchases_today', (
      SELECT COUNT(*)
      FROM avatar_purchase_log
      WHERE DATE(created_at) = CURRENT_DATE
      AND transaction_type = 'spent'
    ),
    'purchases_this_week', (
      SELECT COUNT(*)
      FROM avatar_purchase_log
      WHERE created_at >= NOW() - INTERVAL '7 days'
      AND transaction_type = 'spent'
    ),
    'purchases_this_month', (
      SELECT COUNT(*)
      FROM avatar_purchase_log
      WHERE created_at >= NOW() - INTERVAL '30 days'
      AND transaction_type = 'spent'
    ),
    'top_items', (
      SELECT json_agg(item_data)
      FROM (
        SELECT 
          asi.name,
          asi.category,
          COUNT(*) as purchase_count,
          SUM(apl.points_spent) as total_revenue
        FROM avatar_purchase_log apl
        JOIN avatar_shop_items asi ON apl.item_id = asi.id
        WHERE apl.transaction_type = 'spent'
        GROUP BY asi.id, asi.name, asi.category
        ORDER BY purchase_count DESC
        LIMIT 10
      ) item_data
    ),
    'category_breakdown', (
      SELECT json_object_agg(category, purchase_count)
      FROM (
        SELECT 
          asi.category,
          COUNT(*) as purchase_count
        FROM avatar_purchase_log apl
        JOIN avatar_shop_items asi ON apl.item_id = asi.id
        WHERE apl.transaction_type = 'spent'
        GROUP BY asi.category
      ) category_data
    ),
    'daily_revenue_trend', (
      SELECT json_agg(daily_data ORDER BY date DESC)
      FROM (
        SELECT 
          DATE(created_at) as date,
          SUM(points_spent) as revenue,
          COUNT(*) as transactions
        FROM avatar_purchase_log
        WHERE transaction_type = 'spent'
        AND created_at >= NOW() - INTERVAL '30 days'
        GROUP BY DATE(created_at)
      ) daily_data
    )
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to detect suspicious purchase patterns (fraud detection)
CREATE OR REPLACE FUNCTION detect_suspicious_purchases()
RETURNS TABLE (
  user_id UUID,
  purchase_count BIGINT,
  total_spent INTEGER,
  last_purchase TIMESTAMPTZ,
  risk_score INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    apl.user_id,
    COUNT(*) as purchase_count,
    SUM(apl.points_spent)::INTEGER as total_spent,
    MAX(apl.created_at) as last_purchase,
    CASE
      WHEN COUNT(*) > 50 THEN 100  -- Very high purchase count
      WHEN COUNT(*) > 30 THEN 75   -- High purchase count
      WHEN COUNT(*) > 20 THEN 50   -- Medium-high
      WHEN COUNT(*) > 10 THEN 25   -- Medium
      ELSE 0
    END as risk_score
  FROM avatar_purchase_log apl
  WHERE apl.transaction_type = 'spent'
  AND apl.created_at >= NOW() - INTERVAL '24 hours'
  GROUP BY apl.user_id
  HAVING COUNT(*) > 10
  ORDER BY risk_score DESC, purchase_count DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_avatar_analytics() TO authenticated;
GRANT EXECUTE ON FUNCTION detect_suspicious_purchases() TO authenticated;
