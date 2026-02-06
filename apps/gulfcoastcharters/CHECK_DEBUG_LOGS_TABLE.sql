-- Check if debug_logs table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name = 'debug_logs';

-- If table exists, check recent entries
SELECT 
  event_type,
  payload,
  created_at
FROM debug_logs
ORDER BY created_at DESC
LIMIT 5;
