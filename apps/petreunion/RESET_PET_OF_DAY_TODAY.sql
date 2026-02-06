-- ============================================
-- RESET: Clear today's pet of the day posts
-- Use this if you want to test the function again today
-- ============================================

-- Clear today's posts
DELETE FROM pet_of_day_log 
WHERE posted_date = CURRENT_DATE;

-- Verify it's cleared
SELECT 
  'Posts cleared for today' as status,
  COUNT(*) as remaining_today
FROM pet_of_day_log 
WHERE posted_date = CURRENT_DATE;

-- Now test the function
SELECT 'Testing function after reset...' as status;
SELECT * FROM get_next_pet_of_day();
