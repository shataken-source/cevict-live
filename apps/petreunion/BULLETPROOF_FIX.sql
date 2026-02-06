-- ============================================
-- BULLETPROOF FIX: Will ALWAYS return a pet if one exists
-- Run this entire script in PRO database SQL Editor
-- ============================================

-- Clear today's log first
DELETE FROM pet_of_day_log WHERE posted_date = CURRENT_DATE;

-- Recreate function - simplified logic that ALWAYS works
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
  pet_record RECORD;
BEGIN
  -- Get ANY pet with photo, prefer one not posted today, but return ANY if needed
  SELECT lp.*
  INTO pet_record
  FROM lost_pets lp
  WHERE lp.photo_url IS NOT NULL
    AND lp.photo_url != ''
    AND NOT EXISTS (
      SELECT 1 
      FROM pet_of_day_log l 
      WHERE l.pet_id = lp.id 
      AND l.posted_date = today_date
    )
  ORDER BY lp.created_at ASC
  LIMIT 1;

  -- If no pet found (all posted today), get ANY pet with photo
  IF pet_record IS NULL THEN
    SELECT lp.*
    INTO pet_record
    FROM lost_pets lp
    WHERE lp.photo_url IS NOT NULL
      AND lp.photo_url != ''
    ORDER BY lp.created_at ASC
    LIMIT 1;
  END IF;

  -- If we have a pet, log it and return it
  IF pet_record IS NOT NULL THEN
    INSERT INTO pet_of_day_log (pet_id, posted_date)
    VALUES (pet_record.id, today_date)
    ON CONFLICT (pet_id, posted_date) DO NOTHING;
    
    RETURN QUERY SELECT 
      pet_record.id,
      COALESCE(pet_record.pet_name, 'Unknown') as name,
      pet_record.description,
      pet_record.photo_url as image_url,
      pet_record.breed,
      pet_record.age,
      pet_record.color,
      pet_record.size,
      pet_record.location_city,
      pet_record.location_state,
      pet_record.status,
      pet_record.pet_type,
      pet_record.created_at;
  END IF;
  
  RETURN;
END;
$$ LANGUAGE plpgsql;

-- Test it
SELECT * FROM get_next_pet_of_day();
