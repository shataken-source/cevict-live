# Quick Fix: Schema Cache Errors

## The Error
```
Could not find the table 'public.reactions' in the schema cache
Could not find the table 'public.crowd_drama_votes' in the schema cache
```

## Quick Fix (2 Steps)

### Step 1: Run SQL Script
1. Open **Supabase Dashboard** → **SQL Editor**
2. Copy/paste and run: `supabase/fix-schema-cache-reactions.sql`
3. Verify you see: `✓ reactions table exists` and `✓ crowd_drama_votes table exists`

### Step 2: Refresh Cache
1. **Supabase Dashboard** → **Settings** → **API**
2. Scroll to **Schema Cache** section
3. Click **"Reload schema cache"**
4. **Wait 30-60 seconds**
5. Refresh your app

## Done! ✅

The errors should be gone. If not, wait another 30 seconds - cache refresh can take up to 60 seconds.

## Why This Happens

Supabase caches your database schema for performance. When you add new tables, the cache needs to be manually refreshed (or wait 1-5 minutes for auto-refresh).

## Full Details

See `SCHEMA_CACHE_FIX_REACTIONS.md` for complete documentation.
