# Complete Schema Setup Guide - PopThePopcorn

## 🐛 Current Error

```
Could not find the table 'public.headlines' in the schema cache
Could not find the table 'public.trending_topics' in the schema cache
```

This means either:
1. **Tables don't exist** - `schema.sql` hasn't been run
2. **Schema cache is stale** - Tables exist but cache needs refresh

---

## ✅ Step-by-Step Fix

### Step 1: Verify Tables Exist

1. Go to: **Supabase Dashboard → SQL Editor**
2. Run: `apps/popthepopcorn/supabase/verify-and-fix-schema.sql`
3. Check the output:
   - If it says "table does NOT exist" → Go to Step 2
   - If it says "table EXISTS" → Go to Step 3

### Step 2: Create Tables (If They Don't Exist)

1. Go to: **Supabase Dashboard → SQL Editor**
2. Open: `apps/popthepopcorn/supabase/schema.sql`
3. **Copy the ENTIRE file** (all 267 lines)
4. Paste into SQL Editor
5. Click **"Run"**
6. Wait for completion (should take 5-10 seconds)

**Important:** This creates all tables including:
- `headlines`
- `trending_topics`
- `votes`
- `reactions`
- `user_alerts`
- And all other required tables

### Step 3: Set Up RLS Policies

1. Go to: **Supabase Dashboard → SQL Editor**
2. Open: `apps/popthepopcorn/supabase/rls-policies.sql`
3. **Copy the ENTIRE file**
4. Paste into SQL Editor
5. Click **"Run"**
6. Wait for completion

### Step 4: Refresh Schema Cache (CRITICAL!)

**Option A: Via Dashboard (Easiest)**
1. Go to: **Supabase Dashboard → Settings → API**
2. Scroll to **"Schema Cache"** section
3. Click **"Reload schema cache"** button
4. **Wait 30-60 seconds** (this is important!)

**Option B: Via SQL**
1. Go to: **Supabase Dashboard → SQL Editor**
2. Run:
   ```sql
   NOTIFY pgrst, 'reload schema';
   ```
3. **Wait 30-60 seconds**

### Step 5: Verify Everything Works

Run this in SQL Editor:
```sql
-- Check tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('headlines', 'trending_topics', 'votes', 'reactions')
ORDER BY table_name;

-- Test read access
SELECT COUNT(*) FROM headlines;
SELECT COUNT(*) FROM trending_topics;
```

Should return:
- ✅ 4 tables listed
- ✅ Counts (may be 0 if no data yet)

---

## 🚀 After Setup

1. **Wait 1 minute** after refreshing schema cache
2. **Test the API:**
   ```bash
   curl https://www.popthepopcorn.com/api/headlines
   ```
   Should return JSON (even if empty array)

3. **Run the scraper:**
   - Visit `/admin`
   - Click "Run Scraper"
   - Should work now!

4. **Check homepage:**
   - Visit `https://www.popthepopcorn.com`
   - Should load (may show "Loading headlines..." if no data yet)

---

## 🐛 Troubleshooting

### "Table does not exist" Error

**Fix:**
1. Run `schema.sql` in Supabase SQL Editor
2. Verify tables were created (use verification script)
3. Refresh schema cache
4. Wait 60 seconds

### "Could not find table in schema cache" Error

**Fix:**
1. Verify tables exist (Step 1 above)
2. Refresh schema cache (Step 4)
3. **Wait 60 seconds** (cache refresh takes time)
4. Try again

### Still Not Working?

1. **Check Supabase project:**
   - Make sure you're in the correct project
   - Verify `NEXT_PUBLIC_SUPABASE_URL` matches your project

2. **Check environment variables:**
   - `NEXT_PUBLIC_SUPABASE_URL` - Should match your Supabase project
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Should be the anon key
   - `SUPABASE_SERVICE_ROLE_KEY` - Should be the service role key

3. **Verify in Supabase Dashboard:**
   - Go to **Table Editor**
   - Should see `headlines`, `trending_topics`, etc.
   - If not, run `schema.sql` again

---

## 📋 Quick Checklist

- [ ] Run `schema.sql` in Supabase SQL Editor
- [ ] Run `rls-policies.sql` in Supabase SQL Editor
- [ ] Refresh schema cache (Dashboard → Settings → API → Reload)
- [ ] Wait 60 seconds
- [ ] Verify tables exist (run verification script)
- [ ] Test API endpoint
- [ ] Run scraper

---

## ⚠️ Important Notes

1. **Always wait 30-60 seconds** after refreshing schema cache
2. **Run schema.sql FIRST** before rls-policies.sql
3. **Check you're in the right Supabase project** (URL should match env vars)
4. **Schema cache refresh is required** after any schema changes

---

**Status:** Ready to fix
**Priority:** CRITICAL (blocks everything)
