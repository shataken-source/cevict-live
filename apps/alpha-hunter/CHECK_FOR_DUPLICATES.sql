-- Check for duplicate open positions
-- This will help identify why the bot sees 171 positions

-- 1. Check for duplicate market_ids with outcome='open'
SELECT 
  market_id,
  COUNT(*) as duplicate_count,
  array_agg(id) as trade_ids,
  array_agg(outcome) as outcomes,
  array_agg(closed_at) as closed_dates
FROM trade_history
WHERE platform = 'kalshi' AND outcome = 'open'
GROUP BY market_id
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC
LIMIT 20;

-- 2. Show total count of records with outcome='open' (including duplicates)
SELECT 
  'Total records with outcome=open' as info,
  COUNT(*) as count
FROM trade_history
WHERE platform = 'kalshi' AND outcome = 'open';

-- 3. Show unique market_ids with outcome='open'
SELECT 
  'Unique market_ids with outcome=open' as info,
  COUNT(DISTINCT market_id) as unique_count
FROM trade_history
WHERE platform = 'kalshi' AND outcome = 'open';

-- 4. Check if the SQL fix actually ran - verify bot_config
SELECT 
  'bot_config check' as info,
  config_value->>'dailySpendingLimit' as daily_limit,
  updated_at
FROM bot_config
WHERE config_key = 'trading';

-- 5. Check if strategy params exist
SELECT 
  'strategy_params check' as info,
  bot_category,
  daily_spending_limit,
  updated_at
FROM bot_strategy_params
WHERE platform = 'kalshi' 
  AND bot_category IN ('world', 'derivatives')
ORDER BY bot_category;

-- 6. Show a sample of the duplicate records
SELECT 
  id,
  market_id,
  symbol,
  outcome,
  opened_at,
  closed_at,
  created_at,
  updated_at
FROM trade_history
WHERE platform = 'kalshi' 
  AND outcome = 'open'
  AND market_id IN (
    SELECT market_id
    FROM trade_history
    WHERE platform = 'kalshi' AND outcome = 'open'
    GROUP BY market_id
    HAVING COUNT(*) > 1
  )
ORDER BY market_id, opened_at
LIMIT 20;
