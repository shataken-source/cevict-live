-- Create Captain Profile for Your User
-- Replace 'shataken@gmail.com' with your actual email if different

-- Option 1: Get your user ID first, then create profile
-- Step 1: Get your UUID
SELECT id, email FROM auth.users WHERE email = 'shataken@gmail.com';

-- Step 2: Use the UUID from above to create captain profile
-- (Replace 'YOUR-UUID-HERE' with the id from Step 1)
INSERT INTO public.captain_profiles (user_id, status, boat_name)
VALUES (
  'YOUR-UUID-HERE'::uuid,  -- Paste the UUID from Step 1 here
  'active',
  'Test Boat'
)
ON CONFLICT (user_id) DO NOTHING;

-- Option 2: Do it all in one query (RECOMMENDED)
-- This creates the captain profile directly using your email
INSERT INTO public.captain_profiles (user_id, status, boat_name)
SELECT 
  au.id as user_id,
  'active' as status,
  'Test Boat' as boat_name
FROM auth.users au
WHERE au.email = 'shataken@gmail.com'
ON CONFLICT (user_id) DO UPDATE
SET 
  status = 'active',
  updated_at = NOW();

-- Verify it worked
SELECT 
  cp.id as captain_profile_id,
  cp.user_id,
  cp.status,
  cp.boat_name,
  au.email
FROM captain_profiles cp
JOIN auth.users au ON au.id = cp.user_id
WHERE au.email = 'shataken@gmail.com';
