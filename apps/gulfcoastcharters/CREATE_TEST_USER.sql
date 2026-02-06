-- Create a test user for tip testing
-- This user will be used when ALLOW_TIP_TEST_MODE=true

-- Insert test user into auth.users (Supabase Auth)
-- Note: You may need to use Supabase Dashboard to create this user, or use the auth API
-- This SQL creates the user in the public.users table (if it exists)

-- Option 1: Create in public.users table (if you have one)
INSERT INTO public.users (id, email, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  'test@example.com',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;

-- Option 2: If you need to create in auth.users, use Supabase Dashboard:
-- 1. Go to Authentication > Users
-- 2. Click "Add User"
-- 3. Email: test@example.com
-- 4. Password: (any password, won't be used in test mode)
-- 5. Copy the user ID and use it in the API

-- Option 3: Use an existing user ID instead
-- Get a real user ID from your database:
SELECT id, email 
FROM auth.users 
LIMIT 1;

-- Then update the API to use that ID, or set it in .env.local:
-- TEST_USER_ID=<real-user-id-here>
