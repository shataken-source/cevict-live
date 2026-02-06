# RLS Test Bypass Setup (DEV ONLY)

## ⚠️ WARNING: This is for LOCALHOST TESTING ONLY
**NEVER enable these policies in production!**

## Problem
The test-tip page uses the anonymous Supabase client, but RLS policies require authentication:
- `bookings` table: "Users can view own bookings" requires `auth.uid() = user_id`
- `captains` table: "Anyone can view approved captains" requires `status = 'approved'`

Since there's no authenticated user on the test page, RLS blocks all queries.

## Solution: Temporary Test Policies

### Option 1: Run SQL in Supabase Dashboard (Recommended)

1. Go to your Supabase project: https://supabase.com/dashboard
2. Navigate to **SQL Editor**
3. Copy and paste this SQL:

```sql
-- Allow anonymous users to read bookings (TEST ONLY)
DROP POLICY IF EXISTS "test_anonymous_bookings_read" ON public.bookings;
CREATE POLICY "test_anonymous_bookings_read"
  ON public.bookings
  FOR SELECT
  TO anon
  USING (true);

-- Allow anonymous users to read captains (TEST ONLY)
DROP POLICY IF EXISTS "test_anonymous_captains_read" ON public.captains;
CREATE POLICY "test_anonymous_captains_read"
  ON public.captains
  FOR SELECT
  TO anon
  USING (true);
```

4. Click **Run** (or press Ctrl+Enter)

### Option 2: Use the Migration File

The migration file is already created at:
`apps/gulfcoastcharters/supabase/migrations/20260122_test_rls_bypass.sql`

You can run it via Supabase CLI if you have it set up, or just copy the SQL from the file into the Supabase SQL Editor.

## Verify It Works

1. Refresh your test-tip page: http://localhost:3000/test-tip
2. Enter booking ID: `65038b0c-5847-49c7-98e8-a2d7d6ed7b46`
3. Click "Load Booking"
4. You should now see the booking details!

## Remove Before Production

**BEFORE DEPLOYING TO PRODUCTION**, remove these test policies:

```sql
DROP POLICY IF EXISTS "test_anonymous_bookings_read" ON public.bookings;
DROP POLICY IF EXISTS "test_anonymous_captains_read" ON public.captains;
```

## Alternative: Authenticate Users

If you prefer not to use test policies, you can:
1. Add authentication to the test-tip page
2. Log in as a user who owns the booking
3. The existing RLS policies will then allow access

But for quick testing, the temporary policies are easier.
