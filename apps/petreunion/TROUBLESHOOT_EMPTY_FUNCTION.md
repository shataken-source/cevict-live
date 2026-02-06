# Troubleshoot: get_next_pet_of_day() Returns Empty

## Quick Fix

### Option 1: Reset Today's Posts (If Already Posted)

If you already ran the function today and it logged a pet, run this to reset:

```sql
-- File: RESET_PET_OF_DAY_TODAY.sql
DELETE FROM pet_of_day_log 
WHERE posted_date = CURRENT_DATE;
```

Then test again:
```sql
SELECT * FROM get_next_pet_of_day();
```

---

### Option 2: Run Diagnostic

Run this to see exactly what's wrong:

```sql
-- File: DIAGNOSE_EMPTY_PET_OF_DAY.sql
```

This will show:
- How many pets with photos you have
- How many were posted today
- Which pet should be returned
- Why the function might be empty

---

### Option 3: Recreate Function (More Robust)

If the function has issues, recreate it:

```sql
-- File: fix-pet-of-day-function.sql
```

This version is more robust and will always return a pet if one exists with a photo.

---

## Most Common Cause

**The pet was already logged today.** 

When you run `get_next_pet_of_day()`:
1. It logs the pet in `pet_of_day_log` 
2. If you run it again the same day, it tries to find a different pet
3. If there's only one pet with a photo, it should still return it (fallback)

**But if the function is returning empty, it means:**
- Either no pets with photos exist, OR
- The function has a bug, OR
- There's an issue with the `pet_of_day_log` table

---

## Step-by-Step Fix

### Step 1: Check if you have pets with photos
```sql
SELECT COUNT(*) FROM lost_pets 
WHERE photo_url IS NOT NULL AND photo_url != '';
```

**Must be > 0**

### Step 2: Check if pet was posted today
```sql
SELECT * FROM pet_of_day_log 
WHERE posted_date = CURRENT_DATE;
```

**If you see a row:** That's why it's empty (pet already posted today)

### Step 3: Reset today's posts (if needed)
```sql
DELETE FROM pet_of_day_log 
WHERE posted_date = CURRENT_DATE;
```

### Step 4: Test function
```sql
SELECT * FROM get_next_pet_of_day();
```

**Should return a pet now**

---

## If Still Empty After Reset

Run the diagnostic:
```sql
-- File: DIAGNOSE_EMPTY_PET_OF_DAY.sql
```

This will show exactly what's wrong.

---

## Quick Test Query

Run this to see what the function should return:

```sql
SELECT 
  lp.id,
  lp.pet_name as name,
  lp.photo_url as image_url,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pet_of_day_log l 
      WHERE l.pet_id = lp.id AND l.posted_date = CURRENT_DATE
    ) THEN 'Posted today'
    ELSE 'Available'
  END as status
FROM lost_pets lp
WHERE lp.photo_url IS NOT NULL
  AND lp.photo_url != ''
ORDER BY lp.created_at ASC
LIMIT 1;
```

**If this returns a pet:** The function should work. Recreate it with `fix-pet-of-day-function.sql`

**If this returns empty:** You don't have pets with photos.
