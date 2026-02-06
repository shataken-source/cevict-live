-- Quick Admin Check and Fix
-- Run this in Supabase SQL Editor (production database: rdbuwyefbgnbuhmjrizo)
-- Replace 'shataken@gmail.com' with your actual email

-- Step 1: Check if your user exists
SELECT 
  'Step 1: Check if user exists' as step,
  u.id as user_id,
  u.email,
  u.created_at as user_created
FROM auth.users u
WHERE u.email = 'shataken@gmail.com';  -- CHANGE THIS TO YOUR EMAIL

-- Step 2: Check your profile status
SELECT 
  'Step 2: Check profile status' as step,
  u.email,
  p.id as profile_id,
  p.is_admin,
  p.email as profile_email,
  p.created_at as profile_created
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE u.email = 'shataken@gmail.com';  -- CHANGE THIS TO YOUR EMAIL

-- Step 3: Fix admin status (run this if is_admin is false or NULL)
DO $$
DECLARE
  target_email text := 'shataken@gmail.com';  -- CHANGE THIS TO YOUR EMAIL
BEGIN
  -- Update existing profile to admin
  UPDATE public.profiles p
  SET is_admin = true, updated_at = now()
  FROM auth.users u
  WHERE p.id = u.id AND u.email = target_email;

  -- Insert profile if it doesn't exist
  INSERT INTO public.profiles (id, email, is_admin, created_at, updated_at)
  SELECT u.id, u.email, true, now(), now()
  FROM auth.users u
  WHERE u.email = target_email
    AND NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id)
  ON CONFLICT (id) DO UPDATE
  SET is_admin = EXCLUDED.is_admin, updated_at = now();
END $$;

-- Step 4: Verify the fix
SELECT 
  'Step 4: Verify admin status' as step,
  u.email,
  p.is_admin,
  CASE 
    WHEN p.is_admin = true THEN '✅ You are an admin!'
    WHEN p.is_admin = false THEN '❌ Not an admin - run Step 3 again'
    WHEN p.id IS NULL THEN '❌ No profile found - run Step 3 to create one'
    ELSE '❓ Unknown status'
  END as status
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE u.email = 'shataken@gmail.com';  -- CHANGE THIS TO YOUR EMAIL
