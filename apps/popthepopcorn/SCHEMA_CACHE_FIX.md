# Schema Cache Fix - Reactions Relationship

## Problem
The API is showing: `"Could not find a relationship between 'headlines' and 'reactions' in the schema cache"`

This happens even though the foreign key is defined in the schema. Supabase's PostgREST API needs the schema cache refreshed to recognize relationships for joins.

## Quick Fix

### Option 1: Via Supabase Dashboard (Recommended)
1. Go to **Supabase Dashboard → Settings → API**
2. Scroll to **"Schema Cache"** section
3. Click **"Reload schema cache"** button
4. Wait 30-60 seconds
5. Refresh your app

### Option 2: Via SQL
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
