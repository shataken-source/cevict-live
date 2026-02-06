-- Quick Fix: Make Current User Admin
-- Run this in your Supabase SQL Editor
-- This handles both schemas: profiles.id = auth.users.id OR profiles.user_id = auth.users.id

-- Step 1: Check your current user and see which schema you have
SELECT 
  u.id as user_id,
  u.email,
  p.role,
  p.id as profile_id,
  CASE 
    WHEN p.id = u.id THEN 'legacy schema (profiles.id = auth.users.id)'
    WHEN p.user_id = u.id THEN 'new schema (profiles.user_id = auth.users.id)'
    ELSE 'no profile found'
  END as schema_type
FROM auth.users u
LEFT JOIN public.profiles p ON (p.id = u.id OR p.user_id = u.id)
ORDER BY u.created_at DESC
LIMIT 5;

-- Step 2: Make user an admin (tries both schemas)
-- Replace 'your-email@example.com' with your actual email

-- Option A: If profiles.id = auth.users.id (legacy schema)
UPDATE public.profiles 
SET role = 'admin' 
WHERE id IN (
  SELECT id FROM auth.users WHERE email = 'your-email@example.com'
);

-- Option B: If profiles.user_id = auth.users.id (new schema)
UPDATE public.profiles 
SET role = 'admin' 
WHERE user_id IN (
  SELECT id FROM auth.users WHERE email = 'your-email@example.com'
);

-- Option C: If profile doesn't exist, create it (tries to detect schema)
-- First check if profiles table has user_id column
DO $$
BEGIN
  -- Try legacy schema first (profiles.id = auth.users.id)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'id'
  ) THEN
    INSERT INTO public.profiles (id, role, email, created_at, updated_at)
    SELECT 
      u.id,
      'admin',
      u.email,
      NOW(),
      NOW()
    FROM auth.users u
    WHERE u.email = 'your-email@example.com'
      AND NOT EXISTS (
        SELECT 1 FROM public.profiles p WHERE p.id = u.id
      )
    ON CONFLICT (id) 
    DO UPDATE SET role = 'admin';
  END IF;
  
  -- Try new schema (profiles.user_id = auth.users.id)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'user_id'
  ) THEN
    INSERT INTO public.profiles (id, user_id, role, email, created_at, updated_at)
    SELECT 
      gen_random_uuid(),
      u.id,
      'admin',
      u.email,
      NOW(),
      NOW()
    FROM auth.users u
    WHERE u.email = 'your-email@example.com'
      AND NOT EXISTS (
        SELECT 1 FROM public.profiles p WHERE p.user_id = u.id
      )
    ON CONFLICT (user_id) 
    DO UPDATE SET role = 'admin';
  END IF;
END $$;

-- Step 3: Verify it worked
SELECT 
  u.email,
  u.id as auth_user_id,
  p.id as profile_id,
  p.role,
  CASE 
    WHEN p.id = u.id THEN 'Using legacy schema'
    WHEN p.user_id = u.id THEN 'Using new schema'
    ELSE 'No profile found'
  END as schema_info
FROM auth.users u
LEFT JOIN public.profiles p ON (p.id = u.id OR p.user_id = u.id)
WHERE u.email = 'your-email@example.com';
