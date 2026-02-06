# Schema Cache Fix - Reactions & Crowd Drama Votes

## Problem
The API is showing:
- `"Could not find the table 'public.reactions' in the schema cache"`
- `"Could not find the table 'public.crowd_drama_votes' in the schema cache"`

This happens even though the tables exist in the database. Supabase's PostgREST API needs the schema cache refreshed to recognize new tables.

## Quick Fix

### Option 1: Via Supabase Dashboard (Recommended)
1. Go to **Supabase Dashboard → Settings → API**
2. Scroll to **"Schema Cache"** section
3. Click **"Reload schema cache"** button
4. Wait 30-60 seconds
5. Refresh your app

### Option 2: Run Fix Script First
1. Go to **Supabase Dashboard → SQL Editor**
2. Run `supabase/fix-schema-cache-reactions.sql` to ensure tables exist
3. Then refresh schema cache (Option 1)

### Option 3: Via SQL (Alternative)
Run this in **Supabase SQL Editor**:
```sql
NOTIFY pgrst, 'reload schema';
```

Wait 30-60 seconds, then refresh your app.

## Why This Happens

PostgREST (Supabase's API layer) caches the database schema for performance. When you:
- Add new tables
- Add foreign keys
- Modify relationships

The cache needs to be refreshed for the API to recognize these changes.

## Current Status

✅ **Foreign keys are defined correctly** in `schema.sql`:
- `reactions.headline_id` → `headlines.id` (FK: `fk_headline_reaction`)
- `crowd_drama_votes.headline_id` → `headlines.id` (FK: `fk_headline_crowd_vote`)

✅ **API has fallback** - If the join fails, it uses a simple query without reactions

⚠️ **Schema cache needs refresh** - Once refreshed, the reactions join will work

## After Refresh

Once the schema cache is refreshed:
- The reactions join in `/api/headlines` will work
- Reaction counts will be included in headline responses
- No more "relationship not found" warnings

---

**Note:** The app works fine without the reactions join (it falls back to simple queries), but refreshing the cache will enable the full feature set.
