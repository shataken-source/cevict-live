-- =============================================
-- VERIFY RLS POLICIES AND TEST BOOKING QUERY
-- =============================================
-- Run these queries to verify everything is set up correctly
-- =============================================

-- 1. Check if test RLS policies exist
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE policyname LIKE 'test_anonymous%'
ORDER BY tablename, policyname;

-- 2. Check if the booking exists
SELECT 
  id,
  total_price,
  status,
  trip_date,
  trip_time,
  captain_id,
  user_id,
  created_at
FROM public.bookings
WHERE id = '65038b0c-5847-49c7-98e8-a2d7d6ed7b46';

-- 3. Check if captain exists for that booking
SELECT 
  b.id as booking_id,
  b.captain_id,
  c.id as captain_table_id,
  c.user_id as captain_user_id,
  c.full_name,
  c.business_name,
  c.status as captain_status
FROM public.bookings b
LEFT JOIN public.captains c ON c.id = b.captain_id
WHERE b.id = '65038b0c-5847-49c7-98e8-a2d7d6ed7b46';

-- 4. Test the exact query the app uses (simulating anonymous user)
-- This should return data if RLS policies are working
SELECT 
  b.*,
  json_build_object(
    'id', c.id,
    'user_id', c.user_id,
    'full_name', c.full_name,
    'business_name', c.business_name
  ) as captains
FROM public.bookings b
LEFT JOIN public.captains c ON c.id = b.captain_id
WHERE b.id = '65038b0c-5847-49c7-98e8-a2d7d6ed7b46';

-- 5. List all bookings (to see what's available)
SELECT 
  id,
  total_price,
  status,
  trip_date,
  captain_id,
  user_id,
  created_at
FROM public.bookings
ORDER BY created_at DESC
LIMIT 10;

-- 6. Check RLS is enabled on bookings table
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public' 
  AND tablename IN ('bookings', 'captains');

-- 7. List ALL policies on bookings table
SELECT 
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'bookings'
ORDER BY policyname;

-- 8. List ALL policies on captains table
SELECT 
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'captains'
ORDER BY policyname;
