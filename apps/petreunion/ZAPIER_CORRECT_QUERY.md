# Zapier: Correct Query for Pet of the Day

## ❌ Wrong Query
```sql
SELECT * FROM pets LIMIT 1;  -- This table doesn't exist!
```

## ✅ Correct Queries

### Option 1: Use Function (RECOMMENDED)
```sql
SELECT * FROM get_next_pet_of_day();
```

**Why this is best:**
- Automatically selects next pet to feature
- Avoids duplicates (won't post same pet twice in one day)
- Only selects pets with photos
- Returns Zapier-friendly field names

**Fields returned:**
- `name` (from `pet_name`)
- `image_url` (from `photo_url`)
- `breed`, `age`, `color`, `size`
- `location_city`, `location_state`
- `status` ('lost' or 'found')
- `pet_type` ('dog' or 'cat')
- `description`, `created_at`, `id`

### Option 2: Query lost_pets Directly
```sql
SELECT 
  id,
  pet_name as name,
  photo_url as image_url,
  breed,
  age,
  color,
  size,
  location_city,
  location_state,
  status,
  pet_type,
  description,
  created_at
FROM lost_pets 
WHERE photo_url IS NOT NULL 
  AND photo_url != ''
ORDER BY created_at DESC
LIMIT 1;
```

## Setup Required

Before using the function, run this SQL script:
```sql
-- File: supabase/zapier-pet-of-day-lost-pets.sql
```

This creates:
- `pet_of_day_log` table (tracks posts)
- `get_next_pet_of_day()` function

## Verify You Have Pets

```sql
-- Total pets
SELECT COUNT(*) FROM lost_pets;

-- Pets with photos (required for posting)
SELECT COUNT(*) FROM lost_pets 
WHERE photo_url IS NOT NULL 
  AND photo_url != '';

-- See some pets
SELECT pet_name, breed, photo_url, status 
FROM lost_pets 
WHERE photo_url IS NOT NULL 
LIMIT 5;
```

## Zapier Configuration

**Action:** Supabase → Run Query

**Query Type:** Custom Query

**Query:**
```sql
SELECT * FROM get_next_pet_of_day();
```

**Fields Available:**
- `name` - Pet's name
- `image_url` - Photo URL
- `breed` - Breed
- `age` - Age
- `color` - Color
- `size` - Size
- `location_city` - City
- `location_state` - State
- `status` - 'lost' or 'found'
- `pet_type` - 'dog' or 'cat'
- `description` - Description

## Troubleshooting

**"No rows returned"**
- Check: `SELECT COUNT(*) FROM lost_pets WHERE photo_url IS NOT NULL;`
- You need pets with photos in `lost_pets` table

**"Function not found"**
- Run: `supabase/zapier-pet-of-day-lost-pets.sql` first
- Verify: `SELECT * FROM pg_proc WHERE proname = 'get_next_pet_of_day';`

**"Table 'pets' not found"**
- Use `lost_pets` table instead
- Or use `get_next_pet_of_day()` function
