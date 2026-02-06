# Action Plan: Fix Missing Photos

## Current Status
✅ Recovery complete - 10,000+ pets recovered  
❌ All pets have `photo_url = null`  
❌ Pet of Day function won't work without photos

## Step 1: Check Source Data

Run this in **FREE database** (`nqkbqtiramecvmmpaxzk`):
```sql
-- File: CHECK_SOURCE_PHOTOS.sql
```

**What to look for:**
- If source has photos → Fix mapping and re-run recovery
- If source has NO photos → Photos need to be added separately

## Step 2: Fix Photo Mapping (If Source Has Photos)

If the source has photos but they weren't copied, update the recovery script:

**File:** `apps/petreunion/recover-all-pets.ts`  
**Line 91:** Update photo mapping

Current:
```typescript
photo_url: pet.photo_url || pet.image_url || null,
```

Possible fixes:
```typescript
// If source uses different field names
photo_url: pet.photo_url || pet.image_url || pet.photo || pet.img || pet.image || null,

// Or check all possible photo fields
photo_url: pet.photo_url || pet.image_url || pet.photo || pet.picture || pet.pic || null,
```

## Step 3: Re-Run Recovery (If Needed)

If you fixed the mapping:
```powershell
cd apps/petreunion
.\RUN_RECOVERY.ps1
```

**Note:** The script handles duplicates, so it's safe to re-run. It will:
- Skip pets that already exist (by unique signature)
- Only insert new pets or update existing ones

## Step 4: Verify Photos After Re-Run

Run in PRO database:
```sql
-- File: CHECK_FULL_RECOVERY_STATUS.sql
```

Should show:
- ✅ Pets with photos: 1000+ (or whatever source has)
- ✅ Recovery status: "Recovery complete with photos"

## If Source Has NO Photos

If the FREE database `pets` table has no photos:
1. Photos might be in Supabase Storage (check Storage bucket)
2. Photos might need to be uploaded separately
3. Photos might be in a different table (check schema)

## Quick Test

To quickly check if source has photos, run this in FREE database:
```sql
SELECT COUNT(*) FROM pets 
WHERE photo_url IS NOT NULL OR image_url IS NOT NULL;
```

If this returns 0, source has no photos.  
If this returns > 0, photos exist but mapping is wrong.
