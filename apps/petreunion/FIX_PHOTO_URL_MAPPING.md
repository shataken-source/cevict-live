# Fix Photo URL Mapping Issue

## Problem

After recovery, all pets have `photo_url = null`, which breaks "Pet of the Day" function.

## Current Mapping

The recovery script (`recover-all-pets.ts`) maps:
```typescript
photo_url: pet.photo_url || pet.image_url || null
```

## Possible Causes

1. **Source data has no photos** - FREE database `pets` table doesn't have photo URLs
2. **Wrong field name** - Source uses different column name
3. **Photos stored elsewhere** - Photos might be in a separate table or storage

## Check Source Data

Run this in **FREE database** (`nqkbqtiramecvmmpaxzk`):
```sql
-- File: CHECK_SOURCE_PHOTOS.sql
```

This will show:
- How many pets have photos in source
- What field names are used
- Sample pets with photos

## Solutions

### Option 1: If source has photos but wrong field name
Update `recover-all-pets.ts` line 91:
```typescript
photo_url: pet.photo_url || pet.image_url || pet.photo || pet.img || null,
```

### Option 2: If source has NO photos
- Photos might need to be uploaded separately
- Or photos are in a different storage system
- Check if photos are stored in Supabase Storage

### Option 3: Re-run recovery with better mapping
If you find the correct field name, update the script and re-run:
```powershell
cd apps/petreunion
.\RUN_RECOVERY.ps1
```

## Quick Check

Run this in PRO database to see current state:
```sql
-- File: CHECK_FULL_RECOVERY_STATUS.sql
```

This shows:
- Total pets count
- How many have photos
- Percentage with photos

## Impact

**Pet of the Day function requires pets with photos.** If all pets have `photo_url = null`, the function will return empty.
