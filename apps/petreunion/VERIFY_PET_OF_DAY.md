# Verify Pet of the Day Setup

## Quick Verification Steps

### 1. Run Verification SQL

**Go to:** Supabase Dashboard → PRO Database (`rdbuwyefbgnbuhmjrizo`) → SQL Editor

**Run:** `verify-pet-of-day.sql`

This will show you:
- ✅ Total pets in database
- ✅ How many have photos
- ✅ If function exists
- ✅ Test the function
- ✅ Available pets for posting

---

## Common Issues & Fixes

### Issue 1: "No rows returned" from function

**Check 1: Do you have pets with photos?**
```sql
SELECT COUNT(*) FROM lost_pets 
WHERE photo_url IS NOT NULL 
AND photo_url != '';
```

**If 0:** You need pets with photos. The function only returns pets with `photo_url` set.

**Check 2: Are photo URLs actually set?**
```sql
SELECT id, pet_name, photo_url 
FROM lost_pets 
WHERE photo_url IS NOT NULL 
AND photo_url != ''
LIMIT 5;
```

**Check 3: Test the function manually**
```sql
-- This is what the function does internally
SELECT 
  lp.id,
  lp.pet_name as name,
  lp.photo_url as image_url,
  lp.breed,
  lp.status
FROM lost_pets lp
WHERE lp.photo_url IS NOT NULL
  AND lp.photo_url != ''
  AND NOT EXISTS (
    SELECT 1 
    FROM pet_of_day_log l 
    WHERE l.pet_id = lp.id 
    AND l.posted_date = CURRENT_DATE
  )
ORDER BY lp.created_at ASC
LIMIT 1;
```

If this returns a pet, the function should work. If empty, see below.

---

### Issue 2: Function doesn't exist

**Fix:** Run the setup SQL:
```sql
-- File: supabase/zapier-pet-of-day-lost-pets.sql
```

Or run this:
```sql
CREATE OR REPLACE FUNCTION get_next_pet_of_day()
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  image_url TEXT,
  breed TEXT,
  age TEXT,
  color TEXT,
  size TEXT,
  location_city TEXT,
  location_state TEXT,
  status TEXT,
  pet_type TEXT,
  created_at TIMESTAMPTZ
) AS $$
DECLARE
  today_date DATE := CURRENT_DATE;
  selected_pet RECORD;
BEGIN
  SELECT lp.*
  INTO selected_pet
  FROM lost_pets lp
  WHERE lp.photo_url IS NOT NULL
    AND lp.photo_url != ''
    AND NOT EXISTS (
      SELECT 1 
      FROM pet_of_day_log l 
      WHERE l.pet_id = lp.id 
      AND l.posted_date = today_date
    )
  ORDER BY 
    (SELECT MAX(posted_date) FROM pet_of_day_log WHERE pet_id = lp.id) ASC NULLS FIRST,
    lp.created_at ASC
  LIMIT 1;

  IF selected_pet IS NOT NULL THEN
    INSERT INTO pet_of_day_log (pet_id, posted_date)
    VALUES (selected_pet.id, today_date)
    ON CONFLICT (pet_id, posted_date) DO NOTHING;
    
    RETURN QUERY SELECT 
      selected_pet.id,
      COALESCE(selected_pet.pet_name, 'Unknown') as name,
      selected_pet.description,
      selected_pet.photo_url as image_url,
      selected_pet.breed,
      selected_pet.age,
      selected_pet.color,
      selected_pet.size,
      selected_pet.location_city,
      selected_pet.location_state,
      selected_pet.status,
      selected_pet.pet_type,
      selected_pet.created_at;
  END IF;
  
  RETURN;
END;
$$ LANGUAGE plpgsql;
```

---

### Issue 3: All pets already posted today

**Check:**
```sql
SELECT COUNT(*) FROM pet_of_day_log 
WHERE posted_date = CURRENT_DATE;
```

**If this equals your total pets with photos:** All pets were posted today. The function will still return one (the oldest), but if you want to reset:

```sql
-- Clear today's posts (if needed for testing)
DELETE FROM pet_of_day_log 
WHERE posted_date = CURRENT_DATE;
```

---

### Issue 4: RLS blocking access

**Check RLS:**
```sql
SELECT tablename, policyname, cmd 
FROM pg_policies 
WHERE tablename IN ('lost_pets', 'pet_of_day_log');
```

**Fix if needed:**
```sql
-- Allow public read access
CREATE POLICY IF NOT EXISTS "Allow public read access to lost_pets"
  ON lost_pets
  FOR SELECT
  USING (true);

CREATE POLICY IF NOT EXISTS "Allow public read access to pet_of_day_log"
  ON pet_of_day_log
  FOR SELECT
  USING (true);
```

---

## Step-by-Step Verification

### Step 1: Check Database Connection
```sql
SELECT current_database();
-- Should show: postgres (or your database name)
```

### Step 2: Check Pets Exist
```sql
SELECT COUNT(*) as total FROM lost_pets;
-- Should be > 0
```

### Step 3: Check Pets with Photos
```sql
SELECT COUNT(*) as with_photos 
FROM lost_pets 
WHERE photo_url IS NOT NULL AND photo_url != '';
-- Should be > 0
```

### Step 4: Check Function Exists
```sql
SELECT proname, prorettype::regtype 
FROM pg_proc 
WHERE proname = 'get_next_pet_of_day';
-- Should return 1 row
```

### Step 5: Test Function
```sql
SELECT * FROM get_next_pet_of_day();
-- Should return 1 pet with all fields
```

### Step 6: Check Log Table
```sql
SELECT COUNT(*) FROM pet_of_day_log;
-- Should be >= 0 (can be empty if never posted)
```

---

## Expected Results

✅ **Function works if:**
- You have pets in `lost_pets` table
- At least one pet has `photo_url` set (not NULL, not empty)
- Function `get_next_pet_of_day()` exists
- RLS allows read access

❌ **Function fails if:**
- No pets in database
- No pets with photos
- Function doesn't exist
- RLS blocking access
- All pets already posted today (will still return one, but oldest)

---

## Quick Test Query

Run this to see what the function should return:

```sql
-- Manual test (what function does internally)
SELECT 
  lp.id,
  COALESCE(lp.pet_name, 'Unknown') as name,
  lp.description,
  lp.photo_url as image_url,
  lp.breed,
  lp.age,
  lp.color,
  lp.size,
  lp.location_city,
  lp.location_state,
  lp.status,
  lp.pet_type,
  lp.created_at,
  (SELECT MAX(posted_date) FROM pet_of_day_log WHERE pet_id = lp.id) as last_posted
FROM lost_pets lp
WHERE lp.photo_url IS NOT NULL
  AND lp.photo_url != ''
  AND NOT EXISTS (
    SELECT 1 
    FROM pet_of_day_log l 
    WHERE l.pet_id = lp.id 
    AND l.posted_date = CURRENT_DATE
  )
ORDER BY 
  (SELECT MAX(posted_date) FROM pet_of_day_log WHERE pet_id = lp.id) ASC NULLS FIRST,
  lp.created_at ASC
LIMIT 1;
```

**If this returns a pet:** Function should work.  
**If this returns empty:** Check if you have pets with photos.

---

## Run Full Verification

**File:** `verify-pet-of-day.sql`

This runs all checks and shows you exactly what's wrong.
