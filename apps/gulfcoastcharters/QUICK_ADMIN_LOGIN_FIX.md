# Quick Admin Login Fix

## Issue: Can't login at `/admin/login` or getting 401 errors

### Step 1: Check the URL
- ✅ Correct: `http://localhost:3001/admin/login`
- ❌ Wrong: `http://localhost:3001/admin/logon`

### Step 2: Check Environment Variables

Make sure these are in `apps/gulfcoastcharters/.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://rdbuwyefbgnbuhmjrizo.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

**To get your keys:**
1. Go to: https://supabase.com/dashboard/project/rdbuwyefbgnbuhmjrizo/settings/api
2. Copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Step 3: Create User Account

**Option A: Sign up via the login page**
1. Go to: `http://localhost:3001/admin/login`
2. Click **"Sign up"** tab
3. Enter your email and password
4. Click **"Create account"**

**Option B: Create via Supabase Dashboard**
1. Go to: https://supabase.com/dashboard/project/rdbuwyefbgnbuhmjrizo/auth/users
2. Click **"Add User"**
3. Enter email and password
4. Click **"Create User"**
5. Copy the **User ID**

### Step 4: Make User Admin

Run this SQL in Supabase SQL Editor (replace email with yours):

```sql
-- Make user admin (production database)
DO $$
DECLARE
  target_email text := 'YOUR_EMAIL@example.com';  -- CHANGE THIS
BEGIN
  -- Update existing profile
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

-- Verify it worked
SELECT u.email, p.is_admin
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE u.email = 'YOUR_EMAIL@example.com';  -- CHANGE THIS
```

### Step 5: Login

1. Go to: `http://localhost:3001/admin/login`
2. Enter your email and password
3. Click **"Sign in"**
4. You should be redirected to `/admin`

### Step 6: Test Admin Access

1. Go to: `http://localhost:3001/admin/scraper`
2. Should see the scraper page (not 401 error)

## Troubleshooting

### Still getting 401 errors after login
- Check browser console for errors
- Verify `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are correct
- Restart Next.js dev server after adding env vars

### "Forbidden (insufficient role)" error
- Your user exists but `is_admin` is not set to `true`
- Run the SQL from Step 4 again

### Can't create account / sign up fails
- Check Supabase Auth settings allow sign-ups
- Or create user via Supabase Dashboard first (Option B above)

### Login page shows but form doesn't work
- Check browser console for JavaScript errors
- Verify Supabase client is initialized correctly

## Quick Test

After setting up, test with:

```powershell
# Check if you can access admin (should redirect to login if not authenticated)
Invoke-WebRequest -Uri "http://localhost:3001/admin" -UseBasicParsing
```
