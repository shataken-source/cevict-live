-- COMPLETE DIAGNOSTIC: Check everything Claude should see
-- Run this to get a full picture of the database state

-- ============================================
-- 1. Check if tables exist
-- ============================================
SELECT '=== TABLE EXISTENCE ===' as section;

SELECT 
  table_name,
  CASE 
    WHEN table_name IN ('bot_strategy_params', 'bot_config', 'trade_history', 'bot_predictions') 
    THEN '✅ EXISTS'
    ELSE '❓ UNKNOWN'
  END as status
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('bot_strategy_params', 'bot_config', 'trade_history', 'bot_predictions')
ORDER BY table_name;

-- ============================================
-- 2. Check bot_strategy_params table structure
-- ============================================
SELECT '=== bot_strategy_params STRUCTURE ===' as section;

SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'bot_strategy_params'
ORDER BY ordinal_position;

-- ============================================
-- 3. Check bot_config table structure
-- ============================================
SELECT '=== bot_config STRUCTURE ===' as section;

SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'bot_config'
ORDER BY ordinal_position;

-- ============================================
-- 4. Check trade_history table structure (outcome column)
-- ============================================
SELECT '=== trade_history OUTCOME COLUMN ===' as section;

SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'trade_history'
  AND column_name = 'outcome';

-- ============================================
-- 5. Current bot_config values
-- ============================================
SELECT '=== bot_config VALUES ===' as section;

SELECT 
  config_key,
  config_value,
  config_value->>'dailySpendingLimit' as daily_limit,
  updated_at
FROM bot_config
WHERE config_key = 'trading';

-- ============================================
-- 6. Current bot_strategy_params (if table exists)
-- ============================================
SELECT '=== bot_strategy_params VALUES ===' as section;

-- Check if table exists first
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'bot_strategy_params'
    )
    THEN '✅ Table exists'
    ELSE '❌ Table does NOT exist'
  END as table_status;

-- If table exists, show columns
SELECT 
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'bot_strategy_params'
ORDER BY ordinal_position;

-- Query with safe column selection (only if table exists)
SELECT 
  platform,
  bot_category,
  daily_spending_limit,
  min_confidence,
  min_edge,
  max_trade_usd,
  updated_at
FROM bot_strategy_params
WHERE platform = 'kalshi'
ORDER BY bot_category;

-- ============================================
-- 7. Trade history outcome breakdown
-- ============================================
SELECT '=== trade_history OUTCOMES ===' as section;

SELECT 
  COALESCE(outcome::text, 'NULL') as outcome,
  COUNT(*) as count,
  COUNT(DISTINCT market_id) as unique_markets
FROM trade_history
WHERE platform = 'kalshi'
GROUP BY outcome
ORDER BY count DESC;

-- ============================================
-- 8. Duplicate positions check
-- ============================================
SELECT '=== DUPLICATE POSITIONS ===' as section;

SELECT 
  market_id,
  COUNT(*) as duplicate_count,
  array_agg(id ORDER BY opened_at DESC) as trade_ids,
  array_agg(outcome) as outcomes
FROM trade_history
WHERE platform = 'kalshi' AND outcome = 'open'
GROUP BY market_id
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC
LIMIT 10;

-- ============================================
-- 9. Positions that should be closed
-- ============================================
SELECT '=== POSITIONS WITH closed_at BUT outcome=open ===' as section;

SELECT 
  COUNT(*) as should_be_closed_count
FROM trade_history
WHERE platform = 'kalshi' 
  AND outcome = 'open'
  AND closed_at IS NOT NULL;

-- ============================================
-- 10. Sample of open positions
-- ============================================
SELECT '=== SAMPLE OPEN POSITIONS ===' as section;

SELECT 
  id,
  market_id,
  symbol,
  outcome,
  opened_at,
  closed_at,
  EXTRACT(EPOCH FROM (NOW() - opened_at))/86400 as days_open
FROM trade_history
WHERE platform = 'kalshi' AND outcome = 'open'
ORDER BY opened_at DESC
LIMIT 10;

-- ============================================
-- 11. Check for constraints/indexes
-- ============================================
SELECT '=== CONSTRAINTS & INDEXES ===' as section;

-- Check unique constraint on bot_strategy_params
SELECT 
  conname as constraint_name,
  contype as constraint_type,
  pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'bot_strategy_params'::regclass
  AND contype IN ('u', 'p'); -- unique or primary key

-- Check indexes
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('bot_strategy_params', 'bot_config', 'trade_history')
ORDER BY tablename, indexname;

-- ============================================
-- 12. What bot will actually query
-- ============================================
SELECT '=== BOT QUERY SIMULATION ===' as section;

-- Simulate getOpenTradeRecords query
SELECT 
  'getOpenTradeRecords result' as query_name,
  COUNT(*) as total_records
FROM trade_history
WHERE platform = 'kalshi' 
  AND outcome = 'open';

-- Simulate getStrategyParams query for 'world'
SELECT 
  'getStrategyParams(world) result' as query_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM bot_strategy_params 
      WHERE platform = 'kalshi' AND bot_category = 'world'
    ) 
    THEN '✅ EXISTS'
    ELSE '❌ NOT FOUND'
  END as status,
  COALESCE(
    (SELECT daily_spending_limit::text FROM bot_strategy_params 
     WHERE platform = 'kalshi' AND bot_category = 'world'),
    'NULL'
  ) as daily_spending_limit;

-- Simulate getStrategyParams query for 'derivatives'
SELECT 
  'getStrategyParams(derivatives) result' as query_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM bot_strategy_params 
      WHERE platform = 'kalshi' AND bot_category = 'derivatives'
    ) 
    THEN '✅ EXISTS'
    ELSE '❌ NOT FOUND'
  END as status,
  COALESCE(
    (SELECT daily_spending_limit::text FROM bot_strategy_params 
     WHERE platform = 'kalshi' AND bot_category = 'derivatives'),
    'NULL'
  ) as daily_spending_limit;

-- ============================================
-- 13. Summary for Claude
-- ============================================
SELECT '=== SUMMARY FOR CLAUDE ===' as section;

SELECT 
  'Issues Found' as category,
  CASE 
    WHEN NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'bot_strategy_params')
    THEN '❌ bot_strategy_params table MISSING'
    WHEN (SELECT COUNT(*) FROM bot_strategy_params WHERE platform = 'kalshi' AND bot_category IN ('world', 'derivatives')) = 0
    THEN '❌ world/derivatives categories MISSING'
    WHEN (SELECT COUNT(*) FROM trade_history WHERE platform = 'kalshi' AND outcome = 'open') > 10
    THEN '⚠️  Too many open positions (possible duplicates)'
    WHEN (SELECT config_value->>'dailySpendingLimit' FROM bot_config WHERE config_key = 'trading')::numeric != 1000
    THEN '❌ bot_config dailySpendingLimit != 1000'
    ELSE '✅ All checks passed'
  END as status;
