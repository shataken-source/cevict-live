-- Check for Orphaned Logs (Proves Deletion Happened)
-- Run this to see if pets were deleted but logs remain

-- ============================================
-- Step 1: Verify Schema (Check Column Names)
-- ============================================
SELECT 
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'pet_of_day_log'
ORDER BY ordinal_position;

-- ============================================
-- Step 2: Check for Orphaned Logs
-- ============================================
-- If this returns > 0, pets were deleted but logs remain
-- This proves deletion happened
SELECT 
  COUNT(*) AS orphaned_logs,
  COUNT(DISTINCT l.pet_id) AS unique_deleted_pets,
  MIN(l.posted_date) AS earliest_deletion,
  MAX(l.posted_date) AS latest_deletion
FROM pet_of_day_log l
LEFT JOIN lost_pets lp ON lp.id = l.pet_id
WHERE lp.id IS NULL;

-- ============================================
-- Step 3: Show Orphaned Log Details (if any)
-- ============================================
SELECT 
  l.id AS log_id,
  l.pet_id AS deleted_pet_id,
  l.posted_date
FROM pet_of_day_log l
LEFT JOIN lost_pets lp ON lp.id = l.pet_id
WHERE lp.id IS NULL
ORDER BY l.posted_date DESC
LIMIT 20;
