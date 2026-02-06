# Admin Login Setup Guide

## How to Access the Admin Scraper

You have **3 options** to access the admin scraper:

---

## Option 1: Create Admin User via Supabase Dashboard (Easiest)

### Step 1: Create User in Supabase
1. Go to your Supabase project: https://supabase.com/dashboard/project/nqkbqtiramecvmmpaxzk
2. Navigate to **Authentication** → **Users**
3. Click **"Add User"** or **"Invite User"**
4. Enter your email and password
5. Click **"Create User"**
6. Copy the **User ID** (you'll need it)

### Step 2: Make User an Admin
1. Go to **SQL Editor** in Supabase Dashboard
2. Run this SQL (replace `YOUR_USER_ID` with the ID from Step 1):

```sql
-- Make user an admin by setting role in profiles table
INSERT INTO public.profiles (id, user_id, role, email, created_at, updated_at)
VALUES (
  gen_random_uuid(),  -- or use a specific UUID
  'YOUR_USER_ID',     -- Replace with your user ID from Step 1
  'admin',
  'your-email@example.com',  -- Replace with your email
  NOW(),
  NOW()
)
ON CONFLICT (user_id) 
DO UPDATE SET role = 'admin';
```

**OR** if the profile already exists:

```sql
-- Update existing profile to admin
UPDATE public.profiles 
SET role = 'admin' 
WHERE user_id = 'YOUR_USER_ID';  -- Replace with your user ID
```

### Step 3: Login
1. Go to: http://localhost:3000/admin/login
2. Enter your email and password
3. Click **"Sign in"**
4. You'll be redirected to `/admin`
5. Navigate to `/admin/scraper` to run the scraper

---

## Option 2: Use Environment Variable (Quick Test)

### Step 1: Add Your Email to .env.local

Add this to your `apps/gulfcoastcharters/.env.local`:

```env
GCC_ADMIN_EMAILS=your-email@example.com
```

**Or multiple emails:**
```env
GCC_ADMIN_EMAILS=admin1@example.com,admin2@example.com
```

### Step 2: Create User (if needed)
1. Go to: http://localhost:3000/admin/login
2. Click **"Sign up"** tab
3. Enter your email (must match `GCC_ADMIN_EMAILS`)
4. Enter a password
5. Click **"Create account"**

### Step 3: Login
1. Go to: http://localhost:3000/admin/login
2. Enter your email and password
3. Click **"Sign in"**

**Note:** The email must match exactly what's in `GCC_ADMIN_EMAILS` (case-insensitive).

---

## Option 3: Test Edge Function Directly (No Login Needed)

If you just want to test the scraper without setting up admin login:

### Step 1: Get Your Service Role Key
1. Go to: https://supabase.com/dashboard/project/nqkbqtiramecvmmpaxzk/settings/api
2. Copy the **"service_role"** key (keep it secret!)

### Step 2: Call Edge Function Directly

**PowerShell:**
```powershell
$SERVICE_KEY = "your-service-role-key-here"
$SUPABASE_URL = "https://nqkbqtiramecvmmpaxzk.supabase.co"

curl -X POST "$SUPABASE_URL/functions/v1/enhanced-smart-scraper" `
  -H "Authorization: Bearer $SERVICE_KEY" `
  -H "apikey: $SERVICE_KEY" `
  -H "Content-Type: application/json" `
  -d '{
    "mode": "manual",
    "sources": ["thehulltruth", "craigslist"],
    "maxBoats": 10
  }'
```

**Or use Postman/Insomnia:**
- URL: `https://nqkbqtiramecvmmpaxzk.supabase.co/functions/v1/enhanced-smart-scraper`
- Method: `POST`
- Headers:
  - `Authorization: Bearer YOUR_SERVICE_ROLE_KEY`
  - `apikey: YOUR_SERVICE_ROLE_KEY`
  - `Content-Type: application/json`
- Body:
```json
{
  "mode": "manual",
  "sources": ["thehulltruth", "craigslist"],
  "maxBoats": 10
}
```

---

## Quick Check: Do You Have a Profile?

Run this SQL to see if you already have a profile:

```sql
-- Check existing users and their roles
SELECT 
  u.id as user_id,
  u.email,
  p.role,
  p.id as profile_id
FROM auth.users u
LEFT JOIN public.profiles p ON p.user_id = u.id
ORDER BY u.created_at DESC;
```

If you see your email but `role` is NULL or not 'admin', update it:

```sql
-- Make yourself admin (replace email)
UPDATE public.profiles 
SET role = 'admin' 
WHERE user_id IN (
  SELECT id FROM auth.users WHERE email = 'your-email@example.com'
);
```

---

## Troubleshooting

### "Unauthorized" when accessing `/admin/scraper`
- Make sure you're logged in: http://localhost:3000/admin/login
- Check your profile has `role = 'admin'`
- Or check your email is in `GCC_ADMIN_EMAILS` env var

### "Forbidden (insufficient role)"
- Your user exists but doesn't have admin role
- Run the SQL above to set `role = 'admin'`

### Can't create account
- Check Supabase Auth settings allow sign-ups
- Or create user via Supabase Dashboard first

### Edge Function returns 401
- Make sure you're using the **service_role** key (not anon key)
- Make sure Edge Function has "Verify JWT" turned **OFF**

---

## Recommended: Option 1 (SQL Method)

**Easiest and most reliable:**
1. Create user in Supabase Dashboard
2. Run SQL to set `role = 'admin'`
3. Login at `/admin/login`

This works immediately and doesn't require environment variables!
