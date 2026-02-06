-- ============================================
-- CHECK WEBHOOK DEBUG LOGS
-- Run this after making a test payment
-- ============================================

-- See all recent webhook activity
SELECT 
  event_type,
  payload->>'timestamp' as timestamp,
  payload,
  created_at
FROM debug_logs
ORDER BY created_at DESC
LIMIT 20;

-- Count events by type
SELECT 
  event_type,
  COUNT(*) as count
FROM debug_logs
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY event_type
ORDER BY count DESC;

-- Check for tip processing
SELECT 
  event_type,
  payload->>'tip_id' as tip_id,
  payload->>'error' as error,
  created_at
FROM debug_logs
WHERE event_type IN ('tip_processing_started', 'tip_update_success', 'tip_update_error')
ORDER BY created_at DESC
LIMIT 10;
