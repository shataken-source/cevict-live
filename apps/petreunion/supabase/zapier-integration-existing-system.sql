-- Alternative: Use Existing lost_pets Table with Zapier
-- If you want to use the existing PetReunion lost_pets table instead of creating a new pets table

-- ============================================
-- Option A: Create function that works with existing lost_pets table
-- ============================================

CREATE OR REPLACE FUNCTION get_next_pet_of_day_from_lost_pets()
RETURNS TABLE (
  id UUID,
  pet_name TEXT,
  description TEXT,
  photo_url TEXT,
  breed TEXT,
  age TEXT,
  color TEXT,
  size TEXT,
  location_city TEXT,
  location_state TEXT,
  status TEXT,
  created_at TIMESTAMPTZ
) AS $$
DECLARE
  today_date DATE := CURRENT_DATE;
  selected_pet RECORD;
BEGIN
  -- Find a pet that hasn't been posted today
  -- Prefer pets that haven't been posted recently
  SELECT lp.*
  INTO selected_pet
  FROM lost_pets lp
  WHERE NOT EXISTS (
    SELECT 1 
    FROM pet_of_the_day potd 
    WHERE potd.pet_id = lp.id 
    AND DATE(potd.posted_at) = today_date
  )
  AND lp.photo_url IS NOT NULL
  AND lp.photo_url != ''
  ORDER BY 
    (SELECT MAX(posted_at) FROM pet_of_the_day WHERE pet_id = lp.id) ASC NULLS FIRST,
    lp.created_at ASC
  LIMIT 1;

  -- If found, return it
  IF selected_pet IS NOT NULL THEN
    RETURN QUERY SELECT 
      selected_pet.id,
      selected_pet.pet_name,
      selected_pet.description,
      selected_pet.photo_url,
      selected_pet.breed,
      selected_pet.age,
      selected_pet.color,
      selected_pet.size,
      selected_pet.location_city,
      selected_pet.location_state,
      selected_pet.status,
      selected_pet.created_at;
    RETURN;
  END IF;

  -- Fallback: any pet with photo, oldest posted_at first
  SELECT lp.*
  INTO selected_pet
  FROM lost_pets lp
  WHERE lp.photo_url IS NOT NULL
  AND lp.photo_url != ''
  ORDER BY 
    (SELECT MAX(posted_at) FROM pet_of_the_day WHERE pet_id = lp.id) ASC NULLS FIRST,
    lp.created_at ASC
  LIMIT 1;

  IF selected_pet IS NOT NULL THEN
    RETURN QUERY SELECT 
      selected_pet.id,
      selected_pet.pet_name,
      selected_pet.description,
      selected_pet.photo_url,
      selected_pet.breed,
      selected_pet.age,
      selected_pet.color,
      selected_pet.size,
      selected_pet.location_city,
      selected_pet.location_state,
      selected_pet.status,
      selected_pet.created_at;
  END IF;
  
  RETURN;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Option B: Create a view that maps lost_pets to pets format
-- ============================================
CREATE OR REPLACE VIEW pets_from_lost_pets AS
SELECT 
  id,
  COALESCE(pet_name, 'Unknown') as name,
  description,
  photo_url as image_url,
  breed,
  CASE 
    WHEN age ~ '^\d+$' THEN age::NUMERIC
    ELSE NULL
  END as age,
  created_at,
  (SELECT MAX(posted_at) FROM pet_of_the_day WHERE pet_id = lost_pets.id) as posted_at,
  updated_at
FROM lost_pets
WHERE photo_url IS NOT NULL
AND photo_url != '';

COMMENT ON FUNCTION get_next_pet_of_day_from_lost_pets() IS 'Gets next pet from existing lost_pets table for Pet of the Day';
COMMENT ON VIEW pets_from_lost_pets IS 'View that maps lost_pets table to pets format for Zapier compatibility';
