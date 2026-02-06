# 🚨 EMERGENCY: All Pets Missing - Recovery Steps

## Step 1: Run Diagnostic Queries

Run `DIAGNOSE_MISSING_PETS.sql` in Supabase SQL Editor to check:

1. **Total pets count** (no filters)
2. **Pets with photos**
3. **Pets without photos**
4. **See all pets** (last 20)
5. **RLS status** (might be blocking access)
6. **Table existence**

## Step 2: Check Common Issues

### Issue 1: RLS Blocking Access
If RLS is enabled but policies are wrong, you might not see data even though it exists.

**Check:**
```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'lost_pets';
```

**If RLS is blocking:**
```sql
-- Temporarily disable RLS to check (CAREFUL - only for diagnosis)
ALTER TABLE lost_pets DISABLE ROW LEVEL SECURITY;

-- Check data
SELECT COUNT(*) FROM lost_pets;

-- Re-enable RLS
ALTER TABLE lost_pets ENABLE ROW LEVEL SECURITY;
```

### Issue 2: Wrong Database/Project
- Make sure you're connected to the correct Supabase project
- Check your connection string matches your project

### Issue 3: Data Actually Deleted
If the diagnostic shows 0 pets, check backups:

1. **Supabase Dashboard** → **Database** → **Backups**
2. Look for point-in-time recovery
3. Check if there's a recent backup

## Step 3: Check Supabase Backups

1. Go to **Supabase Dashboard**
2. **Database** → **Backups**
3. Check:
   - Automatic backups (if enabled)
   - Point-in-time recovery (if available)
   - Manual backups

## Step 4: Check Application Logs

Look for any DELETE operations:
- Check Vercel logs
- Check Supabase logs
- Check if any admin operations ran

## Step 5: Verify Table Structure

```sql
-- Check table columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'lost_pets'
ORDER BY ordinal_position;
```

## Step 6: Check Foreign Key Constraints

The `pet_of_day_log` table has `ON DELETE CASCADE` - this means:
- If you delete a pet, it deletes the log entry (correct)
- If you delete a log entry, it does NOT delete the pet (correct)

**This is safe** - the CASCADE only goes one way (pet → log, not log → pet).

## Immediate Actions

1. ✅ Run diagnostic queries
2. ✅ Check Supabase backups
3. ✅ Verify you're in the correct database
4. ✅ Check RLS policies
5. ✅ Contact Supabase support if you have a paid plan

## If Data is Really Gone

1. **Restore from backup** (if available)
2. **Check if data is in another environment** (staging vs production)
3. **Review recent schema changes** that might have affected data
4. **Check if there was a migration** that dropped/recreated the table

## Prevention

After recovery:
1. Enable automatic backups in Supabase
2. Set up point-in-time recovery
3. Add audit logging for DELETE operations
4. Review RLS policies to ensure they're correct
