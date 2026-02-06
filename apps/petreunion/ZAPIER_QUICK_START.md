# Zapier Pet of the Day - Quick Start (CORRECT VERSION)

## ✅ The Correct Table: `lost_pets`

Your pets are stored in the **`lost_pets`** table, not `pets`. This guide uses your existing data.

## 🚀 Quick Setup (3 Steps)

### 1. Run SQL Script

In Supabase SQL Editor, run:
```sql
-- File: supabase/zapier-pet-of-day-lost-pets.sql
```

This creates:
- `pet_of_day_log` table (tracks posts)
- `get_next_pet_of_day()` function (selects next pet)

### 2. Test It

```sql
-- Get next pet to post
SELECT * FROM get_next_pet_of_day();

-- See your pets
SELECT pet_name, breed, photo_url, status 
FROM lost_pets 
WHERE photo_url IS NOT NULL 
LIMIT 5;
```

### 3. Build Your Zap

**Trigger:** Schedule by Zapier → Every Day at 9:00 AM

**Action 1:** Supabase → Run Query
- Query: `SELECT * FROM get_next_pet_of_day();`

**Action 2:** Formatter → Text (Optional)
- Format: `🐾 PET OF THE DAY 🐾\n\nName: {{name}}\nBreed: {{breed}}\nLocation: {{location_city}}, {{location_state}}\n\n{{description}}`

**Action 3:** Facebook Pages → Create Page Post
- Message: [Formatted text]
- Photo URL: `{{image_url}}`

## 📋 Field Mapping

The function returns:
- `name` → from `lost_pets.pet_name`
- `image_url` → from `lost_pets.photo_url`
- `breed`, `age`, `color`, `size` → same
- `location_city`, `location_state` → same
- `status` → 'lost' or 'found'
- `pet_type` → 'dog' or 'cat'

## ✅ That's It!

The function automatically:
- ✅ Avoids posting same pet twice in one day
- ✅ Prefers pets that haven't been posted recently
- ✅ Only selects pets with photos
- ✅ Logs all posts in `pet_of_day_log`

## 🔍 Troubleshooting

**"No rows returned"**
- Check: `SELECT COUNT(*) FROM lost_pets WHERE photo_url IS NOT NULL;`
- Make sure you have pets with photos

**"Function not found"**
- Make sure you ran the SQL script
- Check: `SELECT * FROM pg_proc WHERE proname = 'get_next_pet_of_day';`

## 📖 Full Guide

See `ZAPIER_PET_OF_DAY_SETUP.md` for detailed instructions.
