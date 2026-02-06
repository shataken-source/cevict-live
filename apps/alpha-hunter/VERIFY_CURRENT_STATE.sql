-- VERIFY CURRENT STATE: Check what's actually in the database RIGHT NOW
-- Run this to see if the fixes actually persisted

-- ============================================
-- 1. Check open positions count
-- ============================================
SELECT 
  'Current open positions' as info,
  COUNT(*) as total_count,
  COUNT(DISTINCT market_id) as unique_market_ids
FROM trade_history
WHERE platform = 'kalshi' AND outcome = 'open';

-- ============================================
-- 2. Check for duplicates RIGHT NOW
-- ============================================
SELECT 
  'Current duplicates' as info,
  COUNT(*) as duplicate_count
FROM (
  SELECT market_id
  FROM trade_history
  WHERE platform = 'kalshi' AND outcome = 'open'
  GROUP BY market_id
  HAVING COUNT(*) > 1
) duplicates;

-- ============================================
-- 3. Show sample of what bot will see
-- ============================================
SELECT 
  market_id,
  outcome,
  closed_at,
  opened_at
FROM trade_history
WHERE platform = 'kalshi' AND outcome = 'open'
ORDER BY opened_at DESC
LIMIT 10;

-- ============================================
-- 4. Check bot_config RIGHT NOW
-- ============================================
SELECT 
  'bot_config' as source,
  config_value->>'dailySpendingLimit' as daily_limit,
  updated_at
FROM bot_config
WHERE config_key = 'trading';

-- ============================================
-- 5. Check strategy params RIGHT NOW
-- ============================================
SELECT 
  'strategy_params' as source,
  bot_category,
  daily_spending_limit,
  updated_at
FROM bot_strategy_params
WHERE platform = 'kalshi' 
  AND bot_category IN ('world', 'derivatives')
ORDER BY bot_category;

-- ============================================
-- 6. Simulate bot's query exactly
-- ============================================
-- This is what getOpenTradeRecords does (it gets up to 500 records):
SELECT 
  'Bot query simulation (first 10)' as info,
  COUNT(*) as total_available
FROM trade_history
WHERE platform = 'kalshi' 
  AND outcome = 'open';

-- Show first 10 records bot would receive (ordered by opened_at ASC)
SELECT 
  market_id,
  outcome,
  opened_at,
  closed_at
FROM trade_history
WHERE platform = 'kalshi' 
  AND outcome = 'open'
ORDER BY opened_at ASC
LIMIT 10;
