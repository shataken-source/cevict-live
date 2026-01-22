# RLS Policies Verification - PopThePopcorn

## ✅ Quick Verification

Run this SQL in **Supabase SQL Editor** to verify RLS policies are set:

```sql
-- Check if RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN (
  'headlines', 'votes', 'reactions', 'user_alerts', 
  'reported_stories', 'drama_history', 'trending_topics',
  'crowd_drama_votes', 'story_boosts', 'sponsored_reports'
);

-- Check if policies exist
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Test public read access
SELECT COUNT(*) FROM headlines;
SELECT * FROM headlines LIMIT 1;
```

---

## 📋 Step-by-Step Setup

### 1. Run Schema (If Not Done)

1. Go to: **Supabase Dashboard → SQL Editor**
2. Open: `apps/popthepopcorn/supabase/schema.sql`
3. Copy entire contents
4. Paste into SQL Editor
5. Click **"Run"**
6. Wait for completion

### 2. Run RLS Policies

1. Go to: **Supabase Dashboard → SQL Editor**
2. Open: `apps/popthepopcorn/supabase/rls-policies.sql`
3. Copy entire contents
4. Paste into SQL Editor
5. Click **"Run"**
6. Wait for completion

### 3. Refresh Schema Cache (CRITICAL!)

**Option A: Via Dashboard (Recommended)**
1. Go to: **Supabase Dashboard → Settings → API**
2. Scroll to **"Schema Cache"** section
3. Click **"Reload schema cache"** button
4. Wait 10-30 seconds

**Option B: Via SQL**
```sql
NOTIFY pgrst, 'reload schema';
```

**Why?** Supabase caches the schema. Without refreshing, new tables/policies won't be recognized by the API.

### 4. Verify Policies

Run the verification SQL above. You should see:
- ✅ All tables have `rowsecurity = true`
- ✅ Policies exist for each table
- ✅ Public can read headlines (no errors)

---

## 🔍 Expected Policies

After running `rls-policies.sql`, you should have:

### Headlines
- ✅ `Allow public read access to headlines` (SELECT)

### Votes
- ✅ `Allow public insert access to votes` (INSERT)
- ✅ `Allow public read access to votes` (SELECT)

### Reactions
- ✅ `Allow public read access to reactions` (SELECT)
- ✅ `Allow public insert access to reactions` (INSERT)

### User Alerts
- ✅ `Allow public insert access to user_alerts` (INSERT)
- ✅ `Allow public read access to user_alerts` (SELECT)

### Reported Stories
- ✅ `Allow public insert access to reported_stories` (INSERT)

### Drama History
- ✅ `Allow public read access to drama_history` (SELECT)

### Trending Topics
- ✅ `Allow public read access to trending_topics` (SELECT)

### Crowd Drama Votes
- ✅ `Allow public read access to crowd_drama_votes` (SELECT)
- ✅ `Allow public insert access to crowd_drama_votes` (INSERT)
- ✅ `Allow public update access to crowd_drama_votes` (UPDATE)

### Story Boosts
- ✅ `Allow public read access to story_boosts` (SELECT)
- ✅ `Allow public insert access to story_boosts` (INSERT)

### Sponsored Reports
- ✅ `Allow public read access to sponsored_reports` (SELECT)

### Sponsored Impressions/Clicks
- ✅ `Allow public insert access to sponsored_impressions` (INSERT)
- ✅ `Allow public insert access to sponsored_clicks` (INSERT)

---

## 🐛 Troubleshooting

### "Could not find the table 'public.headlines' in the schema cache"

**Fix:**
1. Refresh schema cache (see Step 3 above)
2. Wait 30 seconds
3. Try again

### "permission denied for table headlines"

**Fix:**
1. Verify RLS policies were run
2. Check that policies allow public SELECT
3. Refresh schema cache
4. Verify you're using `NEXT_PUBLIC_SUPABASE_ANON_KEY` (not service role key) for client-side

### Policies Not Working

**Fix:**
1. Check if RLS is enabled: `SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'headlines';`
2. If `rowsecurity = false`, run: `ALTER TABLE headlines ENABLE ROW LEVEL SECURITY;`
3. Re-run policies from `rls-policies.sql`
4. Refresh schema cache

---

## ✅ Success Indicators

After setup, you should be able to:

1. ✅ Visit `https://www.popthepopcorn.com` without errors
2. ✅ See headlines (after scraper runs)
3. ✅ Vote on headlines
4. ✅ Add reactions
5. ✅ No "permission denied" errors in browser console

---

**Last Updated:** After deployment
**Status:** Ready for verification
