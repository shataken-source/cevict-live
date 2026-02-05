# Headlines Not Showing - Troubleshooting Guide

## Problem
Admin dashboard shows **496 headlines** exist, but the main app shows **"No headlines yet"**.

## Quick Diagnostic

### 1. Check the Diagnostic Endpoint
After deployment, visit:
```
https://your-app.vercel.app/api/debug/headlines
```

This will show:
- ✅ Environment variables status
- ✅ Database connection status
- ✅ Query test results
- ✅ RLS policy status
- ✅ Specific error messages

### 2. Check Browser Console
Open DevTools (F12) → Console tab, look for:
- `[Frontend] Fetched headlines: 0` (should show a number > 0)
- Any error messages from `/api/headlines`

### 3. Check Network Tab
Open DevTools → Network tab:
- Find the request to `/api/headlines`
- Check the **Response** - does it have `headlines: []` or an error?

## Common Causes & Fixes

### Cause 1: RLS Policies Not Applied
**Symptoms:** Diagnostic shows `permission denied` errors

**Fix:**
1. Go to **Supabase Dashboard → SQL Editor**
2. Run `apps/popthepopcorn/supabase/rls-policies.sql`
3. **CRITICAL:** Refresh schema cache:
   - Go to **Settings → API**
   - Click **"Reload schema cache"**
   - Wait 30 seconds

### Cause 2: Schema Cache Stale
**Symptoms:** "Could not find table" or "column does not exist" errors

**Fix:**
1. **Supabase Dashboard → Settings → API**
2. Click **"Reload schema cache"**
3. Wait 30 seconds
4. Or run SQL: `NOTIFY pgrst, 'reload schema';`

### Cause 3: Environment Variables Missing
**Symptoms:** Diagnostic shows `hasUrl: false` or `hasAnonKey: false`

**Fix:**
1. Go to **Vercel Dashboard → Settings → Environment Variables**
2. Verify these are set:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` (or `SUPABASE_SERVICE_ROLE_KEY`)
3. **Redeploy** after adding variables

### Cause 4: Reactions Join Failing
**Symptoms:** Diagnostic shows `reactionsJoin.success: false`

**Fix:**
The API now has a fallback - it will try without reactions if the join fails. But to fix properly:
1. Verify RLS policy exists: `Allow public read access to reactions`
2. Run `rls-policies.sql` again
3. Refresh schema cache

### Cause 5: Wrong Supabase Key
**Symptoms:** Works in admin (service role) but not public (anon key)

**Check:**
- Admin uses `SUPABASE_SERVICE_ROLE_KEY` (bypasses RLS)
- Public API should use `NEXT_PUBLIC_SUPABASE_ANON_KEY` (respects RLS)
- If only service role is set, RLS policies won't work correctly

## Step-by-Step Fix

1. **Run Diagnostic:**
   ```
   https://your-app.vercel.app/api/debug/headlines
   ```

2. **Verify RLS Policies:**
   ```sql
   -- In Supabase SQL Editor
   SELECT tablename, rowsecurity 
   FROM pg_tables 
   WHERE schemaname = 'public' 
   AND tablename = 'headlines';
   
   -- Should show: rowsecurity = true
   
   SELECT policyname 
   FROM pg_policies 
   WHERE tablename = 'headlines';
   
   -- Should show: "Allow public read access to headlines"
   ```

3. **Refresh Schema Cache:**
   - Supabase Dashboard → Settings → API → "Reload schema cache"

4. **Test Direct Query:**
   ```sql
   -- In Supabase SQL Editor (as anon user)
   SELECT COUNT(*) FROM headlines;
   -- Should return: 496
   ```

5. **Check Vercel Logs:**
   - Vercel Dashboard → Deployments → Latest → Functions
   - Look for `/api/headlines` logs
   - Check for error messages

6. **Redeploy:**
   - After fixing RLS or env vars, trigger a new deployment

## What I Fixed

1. **Added Fallback Query:** If reactions join fails, API tries simple query
2. **Better Error Messages:** More detailed error info in responses
3. **Diagnostic Endpoint:** `/api/debug/headlines` to help troubleshoot

## Still Not Working?

1. Check the diagnostic endpoint output
2. Share the diagnostic JSON with me
3. Check Vercel function logs for specific errors
4. Verify you're using the correct Supabase project (not a different one)
