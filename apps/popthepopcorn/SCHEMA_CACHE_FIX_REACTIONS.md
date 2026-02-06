# Fix Schema Cache Error for reactions and crowd_drama_votes

## Problem

You're seeing this error:
```
Could not find the table 'public.reactions' in the schema cache
Could not find the table 'public.crowd_drama_votes' in the schema cache
```

## Solution

The tables exist in your database, but Supabase's **schema cache** needs to be refreshed.

### Step 1: Run the Fix Script

1. Go to **Supabase Dashboard** → **SQL Editor**
2. Copy and paste the contents of `supabase/fix-schema-cache-reactions.sql`
3. Click **Run**
4. You should see: `✓ reactions table exists` and `✓ crowd_drama_votes table exists`

### Step 2: Refresh Schema Cache (CRITICAL!)

1. In Supabase Dashboard, go to **Settings** → **API**
2. Scroll down to **Schema Cache**
3. Click **"Reload schema cache"** button
4. Wait **30-60 seconds** for it to refresh

### Step 3: Verify It Works

1. Refresh your app
2. The errors should be gone
3. Reactions and crowd votes should work

## Alternative: Manual Refresh via API

If you can't access the dashboard, you can trigger a refresh via API:

```bash
# Using curl
curl -X POST "https://YOUR_PROJECT.supabase.co/rest/v1/rpc/refresh_schema_cache" \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

**Note:** This endpoint may not exist - the dashboard method is recommended.

## Why This Happens

Supabase uses PostgREST which caches the database schema. When you:
- Create new tables
- Modify table structure
- Add new columns

The cache needs to be refreshed so the API recognizes the changes.

## Prevention

After any schema changes:
1. Always refresh the schema cache
2. Wait 30-60 seconds before testing
3. The cache auto-refreshes eventually, but manual refresh is faster

## Quick Test

After refreshing, test with:

```sql
-- Should return data (or empty array if no reactions yet)
SELECT * FROM reactions LIMIT 5;

-- Should return data (or empty array if no votes yet)
SELECT * FROM crowd_drama_votes LIMIT 5;
```

If these queries work in SQL Editor but the API still fails, the cache hasn't refreshed yet - wait another 30 seconds and try again.
