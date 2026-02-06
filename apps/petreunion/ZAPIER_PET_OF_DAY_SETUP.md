# Zapier Pet of the Day Setup Guide

## Overview

This guide provides SQL migration scripts and instructions for setting up a "Pet of the Day" automation with Zapier.

## ✅ Use Existing `lost_pets` Table (CORRECT)

**The correct table is `lost_pets`** - this is where all your lost and found pets are stored.

- ✅ Uses your actual data (no empty tables)
- ✅ Works with existing PetReunion system
- ✅ No duplicate data needed
- **Use: `zapier-pet-of-day-lost-pets.sql`** ⬅️ **THIS ONE**

### Alternative: New `pets` Table (NOT RECOMMENDED)
- Creates a new empty table
- Would require manually adding pets
- Use: `zapier-pet-of-day-schema.sql` (only if you want separate data)

---

## Setup: Use Existing `lost_pets` Table ⬅️ **USE THIS**

### Step 1: Run Migration Script

Execute `supabase/zapier-pet-of-day-lost-pets.sql` in your Supabase SQL Editor.

This creates:
- ✅ `pet_of_day_log` table (tracks which pets were posted)
- ✅ `get_next_pet_of_day()` function (works with `lost_pets` table)
- ✅ RLS policies

**Note:** This uses your existing `lost_pets` table - no new data needed!

### Step 2: Test the Function

```sql
-- Test the function (returns next pet to post)
SELECT * FROM get_next_pet_of_day();

-- Check your lost_pets data
SELECT id, pet_name, breed, photo_url, status 
FROM lost_pets 
WHERE photo_url IS NOT NULL 
LIMIT 5;

-- Check post history
SELECT 
  l.*,
  lp.pet_name,
  lp.breed
FROM pet_of_day_log l
JOIN lost_pets lp ON lp.id = l.pet_id
ORDER BY l.posted_date DESC
LIMIT 10;
```

### Step 3: Zapier Configuration

**Trigger:** Schedule by Zapier (Daily at 9 AM)

**Action 1: Supabase Query**
- **Query Type:** Custom Query
- **Query:**
  ```sql
  SELECT * FROM get_next_pet_of_day();
  ```

**Action 2: Format Text** (Optional)
- Format the pet data into a nice post
- Use fields: `name`, `description`, `image_url`, `breed`, `age`, `color`, `location_city`, `location_state`, `status`

**Action 3: Post to Destination**
- Facebook, Twitter, Instagram, etc.

---

## Zapier Step-by-Step Setup

### 1. Create New Zap

**Trigger:**
- **App:** Schedule by Zapier
- **Trigger:** Every Day
- **Time:** 9:00 AM (or your preferred time)

OR

- **App:** Supabase
- **Trigger:** New Row
- **Table:** `pet_of_day_log` (if using Option 1)

### 2. Add Supabase Action

**Action:**
- **App:** Supabase
- **Action:** Run Query
- **Query Type:** Custom Query
- **Query:**
  ```sql
  SELECT * FROM get_next_pet_of_day();
  ```
  OR (if using existing system):
  ```sql
  SELECT * FROM get_next_pet_of_day_from_lost_pets();
  ```

### 3. Format the Post (Optional)

**Action:**
- **App:** Formatter by Zapier
- **Action:** Text Formatter
- **Transform:** Create a formatted message

**Template Example:**
```
🐾 PET OF THE DAY 🐾

Name: {{name}}
Breed: {{breed}}
Age: {{age}} years
Description: {{description}}

#PetOfTheDay #PetReunion
```

### 4. Post to Your Platform

**Facebook:**
- **App:** Facebook Pages
- **Action:** Create Page Post
- **Page:** Your PetReunion page
- **Message:** [Formatted text from step 3]
- **Photo URL:** {{image_url}}

**Twitter/X:**
- **App:** Twitter
- **Action:** Create Tweet
- **Tweet Text:** [Formatted text]
- **Media URL:** {{image_url}}

**Instagram:**
- **App:** Instagram Business
- **Action:** Create Media
- **Image URL:** {{image_url}}
- **Caption:** [Formatted text]

---

## Function Logic Explained

The `get_next_pet_of_day()` function (works with `lost_pets` table):

1. **First Priority:** Pets that haven't been posted today
   - Orders by `posted_at ASC NULLS FIRST` (never posted = NULL comes first)
   - Then by `created_at ASC` (oldest first)

2. **Fallback:** If all pets were posted today
   - Selects the pet posted longest ago
   - Ensures rotation even if all pets were featured

3. **Updates:**
   - Sets `posted_at = NOW()` on the selected pet
   - Logs the post in `pet_of_day_log`

4. **Returns:** Pet data ready for posting

---

## Testing

### Test in Supabase

```sql
-- Get next pet
SELECT * FROM get_next_pet_of_day();

-- Check if it logged correctly
SELECT * FROM pet_of_day_log ORDER BY posted_date DESC LIMIT 5;

-- Check pet's posted_at was updated
SELECT id, name, posted_at FROM pets ORDER BY posted_at ASC NULLS FIRST;
```

### Test in Zapier

1. Use **Test** button in Zapier
2. Check that:
   - Function returns a pet
   - Pet has `image_url`
   - Data is formatted correctly
   - Post appears on your platform

---

## Monitoring

### Check Recent Posts

```sql
SELECT 
  p.name,
  p.breed,
  l.posted_date,
  l.created_at
FROM pet_of_day_log l
JOIN pets p ON p.id = l.pet_id
ORDER BY l.posted_date DESC
LIMIT 10;
```

### Check Pet Rotation

```sql
SELECT 
  name,
  breed,
  posted_at,
  (SELECT COUNT(*) FROM pet_of_day_log WHERE pet_id = pets.id) as times_posted
FROM pets
ORDER BY posted_at ASC NULLS FIRST;
```

---

## Troubleshooting

### "No rows returned"
- Ensure pets in `lost_pets` have `photo_url` set (not `image_url`)
- Check that `photo_url` is not null or empty
- Verify RLS policies allow read access
- Check you have pets in `lost_pets` table: `SELECT COUNT(*) FROM lost_pets WHERE photo_url IS NOT NULL;`

### "Duplicate posts"
- The function has `ON CONFLICT DO NOTHING` to prevent duplicates
- Check `pet_of_day_log` has unique constraint on `(pet_id, posted_date)`

### "Function not found"
- Ensure you ran the migration script
- Check function exists: `SELECT * FROM pg_proc WHERE proname = 'get_next_pet_of_day';`

### "RLS Policy Error"
- Ensure RLS policies are set correctly
- Service role key should bypass RLS
- Check policies allow SELECT on `pets` and `pet_of_day_log`

---

## Next Steps

1. ✅ Run the SQL migration script
2. ✅ Test the function in Supabase
3. ✅ Create your Zap in Zapier
4. ✅ Test the Zap
5. ✅ Enable the Zap
6. ✅ Monitor the first few posts

---

## Where to Post?

Common destinations:
- **Facebook Page** - Best for engagement
- **Twitter/X** - Quick updates
- **Instagram** - Visual platform
- **LinkedIn** - Professional network
- **Email Newsletter** - Direct to subscribers

**Recommendation:** Start with Facebook Page for maximum visibility and engagement.
