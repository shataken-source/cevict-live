# RLS Might Be Blocking Your 26,000 Pets

## The Situation

Your table listing shows:
- `lost_pets` = **11 rows** (but you had 26,000!)
- `pets` = **0 rows**

This suggests either:
1. **RLS is blocking access** (most likely)
2. **Data was deleted/moved**
3. **Wrong Supabase project**

## Check RLS Status

Run this query:

```sql
-- Check if RLS is enabled (FIXED)
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public'
  AND tablename = 'lost_pets';

-- Check RLS policies (FIXED)
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  qual
FROM pg_policies 
WHERE schemaname = 'public'
  AND tablename = 'lost_pets';
```

## If RLS is Blocking

### Option 1: Temporarily Disable RLS (Diagnostic Only)

```sql
-- CAREFUL: Only for checking, re-enable after!
ALTER TABLE lost_pets DISABLE ROW LEVEL SECURITY;

-- Now check count
SELECT COUNT(*) FROM lost_pets;

-- Re-enable RLS
ALTER TABLE lost_pets ENABLE ROW LEVEL SECURITY;
```

### Option 2: Check Table Size

If the table is large but shows few rows, RLS is likely blocking:

```sql
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
  pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
  n_live_tup as visible_rows
FROM pg_stat_user_tables
WHERE schemaname = 'public'
  AND tablename = 'lost_pets';
```

**If `table_size` is large (MB/GB) but `visible_rows` is 11, RLS is blocking!**

## Fix RLS Policies

If RLS is blocking, you need to add/update policies:

```sql
-- Allow public read access
DROP POLICY IF EXISTS "Allow public read access to lost_pets" ON lost_pets;
CREATE POLICY "Allow public read access to lost_pets"
  ON lost_pets FOR SELECT
  USING (true);

-- Allow public insert (for reporting)
DROP POLICY IF EXISTS "Allow public insert to lost_pets" ON lost_pets;
CREATE POLICY "Allow public insert to lost_pets"
  ON lost_pets FOR INSERT
  WITH CHECK (true);
```

## Check Different Supabase Project

You might be looking at the wrong project:

1. **Check your `.env.local`** - What's `NEXT_PUBLIC_SUPABASE_URL`?
2. **Check Supabase Dashboard** - Are you in the right project?
3. **Verify project ID** matches your app

## Check for Archived Data

```sql
-- Look for backup/archive tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
  AND (
    table_name ILIKE '%pet%archive%' OR
    table_name ILIKE '%pet%backup%' OR
    table_name ILIKE '%pet%old%'
  );
```

## Most Likely Solution

**RLS is blocking access.** The data exists (26,000 pets) but policies are hiding it.

**Fix:**
1. Run the RLS check queries above
2. If RLS is enabled, add public read policy
3. Re-check the count
