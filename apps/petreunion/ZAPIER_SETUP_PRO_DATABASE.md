# Zapier Pet of the Day - PRO Database Setup

## ✅ Step 1: Run SQL Script in PRO Database

**Go to:** Supabase Dashboard → **PRO Database** (`rdbuwyefbgnbuhmjrizo`) → SQL Editor

**Run this SQL script:**
```sql
-- Create pet_of_day_log table (tracks posts)
CREATE TABLE IF NOT EXISTS pet_of_day_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pet_id UUID NOT NULL REFERENCES lost_pets(id) ON DELETE CASCADE,
  posted_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(pet_id, posted_date) -- Prevent duplicate posts on same day
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pet_of_day_log_posted_date ON pet_of_day_log(posted_date DESC);
CREATE INDEX IF NOT EXISTS idx_pet_of_day_log_pet_id ON pet_of_day_log(pet_id);

-- Create function
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
  -- First, try to find a pet that hasn't been posted today
  SELECT lp.*
  INTO selected_pet
  FROM lost_pets lp
  WHERE NOT EXISTS (
    SELECT 1 
    FROM pet_of_day_log l 
    WHERE l.pet_id = lp.id 
    AND l.posted_date = today_date
  )
  AND lp.photo_url IS NOT NULL
  AND lp.photo_url != ''
  ORDER BY 
    (SELECT MAX(posted_date) FROM pet_of_day_log WHERE pet_id = lp.id) ASC NULLS FIRST,
    lp.created_at ASC
  LIMIT 1;

  -- If we found a pet, return it and log the post
  IF selected_pet IS NOT NULL THEN
    -- Log the post
    INSERT INTO pet_of_day_log (pet_id, posted_date)
    VALUES (selected_pet.id, today_date)
    ON CONFLICT (pet_id, posted_date) DO NOTHING;
    
    -- Return the pet (mapped to Zapier-friendly format)
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
    RETURN;
  END IF;

  -- Fallback: If all pets were posted today, find the one posted longest ago
  SELECT lp.*
  INTO selected_pet
  FROM lost_pets lp
  WHERE lp.photo_url IS NOT NULL
  AND lp.photo_url != ''
  ORDER BY 
    (SELECT MAX(posted_date) FROM pet_of_day_log WHERE pet_id = lp.id) ASC NULLS FIRST,
    lp.created_at ASC
  LIMIT 1;

  -- If we found a pet, update and return it
  IF selected_pet IS NOT NULL THEN
    -- Log the post
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

-- RLS Policies
ALTER TABLE pet_of_day_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Allow public read access to pet_of_day_log"
  ON pet_of_day_log
  FOR SELECT
  USING (true);
```

---

## ✅ Step 2: Test the Function

Run this in Supabase SQL Editor to verify it works:

```sql
-- Test the function
SELECT * FROM get_next_pet_of_day();

-- Check you have pets with photos
SELECT COUNT(*) FROM lost_pets 
WHERE photo_url IS NOT NULL 
AND photo_url != '';
```

---

## ✅ Step 3: Zapier Configuration

### Connect to PRO Database

**Supabase URL:** `https://rdbuwyefbgnbuhmjrizo.supabase.co`

**Get your API Key:**
1. Go to Supabase Dashboard → PRO Database → Settings → API
2. Copy **Service Role Key** (for Zapier)

### Create Your Zap

**Trigger:**
- **App:** Schedule by Zapier
- **Trigger:** Every Day
- **Time:** 9:00 AM (or your preferred time)

**Action 1: Supabase Query**
- **App:** Supabase
- **Action:** Run Query
- **Connection:** Connect to `https://rdbuwyefbgnbuhmjrizo.supabase.co`
- **Query Type:** Custom Query
- **Query:**
  ```sql
  SELECT * FROM get_next_pet_of_day();
  ```

**Action 2: Format Text** (Optional)
- **App:** Formatter by Zapier
- **Action:** Text Formatter
- **Template:**
  ```
  🐾 PET OF THE DAY 🐾

  Name: {{name}}
  Type: {{pet_type}}
  Breed: {{breed}}
  Color: {{color}}
  Size: {{size}}
  Location: {{location_city}}, {{location_state}}
  Status: {{status}}

  {{description}}

  #PetOfTheDay #PetReunion #LostPets
  ```

**Action 3: Post to Platform**
- **Facebook Pages:** Create Page Post
- **Twitter:** Create Tweet
- **Instagram:** Create Media
- Use `{{image_url}}` for the photo

---

## 📋 Available Fields

The function returns these fields (Zapier-friendly names):

| Field | Description | Example |
|-------|-------------|---------|
| `id` | Pet UUID | `550e8400-e29b-41d4-a716-446655440000` |
| `name` | Pet's name | `Buddy` |
| `image_url` | Photo URL | `https://example.com/photo.jpg` |
| `breed` | Breed | `Golden Retriever` |
| `age` | Age | `5 years` |
| `color` | Color | `Golden` |
| `size` | Size | `large` |
| `location_city` | City | `Birmingham` |
| `location_state` | State | `AL` |
| `status` | Status | `lost` or `found` |
| `pet_type` | Type | `dog` or `cat` |
| `description` | Description | `Friendly dog...` |
| `created_at` | Created date | `2026-01-13T10:00:00Z` |

---

## ✅ Quick Copy-Paste for Zapier

**Exact query to paste into Zapier:**

```sql
SELECT * FROM get_next_pet_of_day();
```

**That's it!** This single query:
- ✅ Automatically selects the next pet
- ✅ Avoids duplicates (won't post same pet twice in one day)
- ✅ Only returns pets with photos
- ✅ Logs the post automatically
- ✅ Returns Zapier-friendly field names

---

## 🔍 Troubleshooting

**"Function not found"**
- Make sure you ran the SQL script in Step 1
- Verify: `SELECT * FROM pg_proc WHERE proname = 'get_next_pet_of_day';`

**"No rows returned"**
- Check: `SELECT COUNT(*) FROM lost_pets WHERE photo_url IS NOT NULL;`
- You need pets with photos in the `lost_pets` table

**"Connection failed"**
- Verify you're using PRO database URL: `https://rdbuwyefbgnbuhmjrizo.supabase.co`
- Check your Service Role Key is correct

---

## 🎯 Summary

1. ✅ Run SQL script in PRO database
2. ✅ Connect Zapier to PRO database (`rdbuwyefbgnbuhmjrizo`)
3. ✅ Use query: `SELECT * FROM get_next_pet_of_day();`
4. ✅ Format and post!

**Done!** 🎉
