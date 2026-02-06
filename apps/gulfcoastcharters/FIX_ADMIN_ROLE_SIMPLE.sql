-- Simple Fix: Make Your User Admin
-- Run this in Supabase SQL Editor
-- Replace 'your-email@example.com' with your actual email

-- First, check what your profiles table looks like
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'profiles'
ORDER BY ordinal_position;

-- Then run ONE of these based on what you see:

-- If profiles table has 'id' column that matches auth.users.id:
UPDATE public.profiles 
SET role = 'admin' 
WHERE id IN (
  SELECT id FROM auth.users WHERE email = 'your-email@example.com'
);

-- OR if profiles table has 'user_id' column:
UPDATE public.profiles 
SET role = 'admin' 
WHERE user_id IN (
  SELECT id FROM auth.users WHERE email = 'your-email@example.com'
);

-- If profile doesn't exist, create it:
-- For legacy schema (profiles.id = auth.users.id):
INSERT INTO public.profiles (id, role, email, created_at, updated_at)
SELECT 
  u.id,
  'admin',
  u.email,
  NOW(),
  NOW()
FROM auth.users u
WHERE u.email = 'your-email@example.com'
  AND NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id)
ON CONFLICT (id) DO UPDATE SET role = 'admin';

-- Verify it worked:
SELECT 
  u.email,
  p.role,
  p.id as profile_id
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE u.email = 'your-email@example.com';
