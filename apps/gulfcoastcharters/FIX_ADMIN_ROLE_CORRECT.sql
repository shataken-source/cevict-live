-- Correct Fix: Make User Admin (uses is_admin boolean)
-- Run this in Supabase SQL Editor
-- Replace 'shataken@gmail.com' with your actual email

DO $$
DECLARE
  target_email text := 'shataken@gmail.com';  -- CHANGE THIS TO YOUR EMAIL
BEGIN
  -- Update existing profile by joining to auth.users
  UPDATE public.profiles p
  SET is_admin = true,
      updated_at = now()
  FROM auth.users u
  WHERE p.id = u.id
    AND u.email = target_email;

  -- Insert profile if it doesn't exist, mark as admin
  INSERT INTO public.profiles (id, email, is_admin, created_at, updated_at)
  SELECT 
    u.id,
    u.email,
    true,
    now(),
    now()
  FROM auth.users u
  WHERE u.email = target_email
    AND NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id)
  ON CONFLICT (id) DO UPDATE
  SET is_admin = EXCLUDED.is_admin,
      updated_at = now();
END $$;

-- Verify it worked
SELECT 
  u.email, 
  p.is_admin,
  p.id as profile_id
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE u.email = 'shataken@gmail.com';  -- CHANGE THIS TO YOUR EMAIL
