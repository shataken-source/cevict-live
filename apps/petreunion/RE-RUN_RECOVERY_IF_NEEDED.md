# Re-Run Pet Recovery If Needed

## Current Situation

The recovery script (`recover-all-pets.ts`) was run and reported:
- ✅ Inserted: 10,386 new pets
- ✅ Skipped: 15,804 duplicates  
- ✅ Total should be: 10,397 pets

But verification shows only **1 row** in `lost_pets` table.

## Possible Causes

1. **Data was deleted** after recovery
2. **RLS blocking reads** - Can't see the data
3. **Wrong database** - Recovery ran on different project
4. **Transaction rolled back** - Recovery didn't commit

## Quick Check

Run this in PRO database:
```sql
-- File: CHECK_PET_RECOVERY_STATUS.sql
```

This will show:
- Actual count
- Sample pets
- RLS status
- Unique constraints

## Re-Run Recovery

If count is still 1, re-run the recovery:

### Option 1: PowerShell Script
```powershell
cd apps/petreunion
.\RUN_RECOVERY.ps1
```

### Option 2: Direct Command
```powershell
cd apps/petreunion
npx tsx recover-all-pets.ts <FREE_KEY> <PRO_KEY>
```

**Keys needed:**
- FREE_KEY: Service role key for `nqkbqtiramecvmmpaxzk`
- PRO_KEY: Service role key for `rdbuwyefbgnbuhmjrizo`

## What the Script Does

1. Connects to FREE database (`nqkbqtiramecvmmpaxzk`)
2. Fetches all pets from `pets` table (26,190 pets)
3. Transforms them to `lost_pets` format
4. Inserts into PRO database (`rdbuwyefbgnbuhmjrizo`)
5. Skips duplicates using unique constraint
6. Reports final count

## Expected Output

```
✅ DONE!
   Inserted: 10,386 new pets
   Skipped: 15,804 duplicates
   Total in PRO lost_pets: 10,397
```

## If Recovery Fails

1. Check RLS policies - might be blocking inserts
2. Check unique constraint - might be too strict
3. Check service role keys - must have write access
4. Check PRO database connection - verify URL is correct
