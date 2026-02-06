# Check Your Pets for Pet of the Day

## Current Status

You have **1 pet with a photo** - this is enough to get started, but you'll want more for variety.

## See Your Pet

```sql
-- See the pet that will be posted
SELECT 
  id,
  pet_name,
  breed,
  color,
  size,
  age,
  location_city,
  location_state,
  status,
  pet_type,
  photo_url,
  description
FROM lost_pets 
WHERE photo_url IS NOT NULL 
  AND photo_url != ''
LIMIT 1;
```

## What This Means

✅ **System will work** - You have 1 pet that can be posted
⚠️ **Limited variety** - Same pet will be featured repeatedly

## Recommendations

### Option 1: Add More Pets (Best)
Add more lost/found pets to your `lost_pets` table through:
- Your PetReunion website (`/report/lost` or `/report/found`)
- Direct database inserts
- Import from another source

### Option 2: Use What You Have
The system will work with 1 pet:
- It will post that pet
- After 30 days, it can post the same pet again
- Or if you force it, it can post the same pet daily

## Test the Function

```sql
-- This should return your 1 pet
SELECT * FROM get_next_pet_of_day();
```

## Add More Pets

To add variety, you can:

1. **Via Website:**
   - Go to your PetReunion site
   - Use the "Report Lost Pet" or "Report Found Pet" forms
   - Make sure to upload photos

2. **Via SQL (for testing):**
```sql
INSERT INTO lost_pets (
  pet_name,
  pet_type,
  breed,
  color,
  size,
  age,
  gender,
  description,
  location_city,
  location_state,
  photo_url,
  status,
  created_at
) VALUES (
  'Max',
  'dog',
  'Golden Retriever',
  'Golden',
  'Large',
  '5 years',
  'Male',
  'Friendly golden retriever',
  'Columbus',
  'IN',
  'https://images.unsplash.com/photo-1552053831-71594a27632d?w=800',
  'lost',
  NOW()
);
```

## Check Progress

```sql
-- Total pets
SELECT COUNT(*) as total_pets FROM lost_pets;

-- Pets with photos (can be posted)
SELECT COUNT(*) as pets_with_photos 
FROM lost_pets 
WHERE photo_url IS NOT NULL 
  AND photo_url != '';

-- Pets without photos (need photos to be posted)
SELECT COUNT(*) as pets_without_photos 
FROM lost_pets 
WHERE photo_url IS NULL 
  OR photo_url = '';
```
