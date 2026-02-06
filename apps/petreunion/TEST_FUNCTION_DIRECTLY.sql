-- ============================================
-- TEST: Direct query that should work
-- This is what the function should be doing
-- ============================================

-- Test 1: Can we query lost_pets directly?
SELECT 
  'Test 1: Direct query' as test_name,
  COUNT(*) as total_pets,
  COUNT(*) FILTER (WHERE photo_url IS NOT NULL AND photo_url != '' AND photo_url != 'null') as with_photos
FROM lost_pets;

-- Test 2: Get a pet with photo (what function should return)
SELECT 
  'Test 2: Pet with photo' as test_name,
  id,
  pet_name as name,
  description,
  photo_url as image_url,
  breed,
  age,
  color,
  size,
  location_city,
  location_state,
  status,
  pet_type,
  created_at
FROM lost_pets
WHERE photo_url IS NOT NULL
  AND photo_url != ''
  AND photo_url != 'null'
  AND NOT EXISTS (
    SELECT 1 FROM pet_of_day_log 
    WHERE pet_id = lost_pets.id 
    AND posted_date = CURRENT_DATE
  )
ORDER BY created_at ASC
LIMIT 1;

-- Test 3: Check if function exists
SELECT 
  'Test 3: Function check' as test_name,
  proname,
  prosecdef,
  proargtypes::regtype[]
FROM pg_proc
WHERE proname = 'get_next_pet_of_day';

-- Test 4: Try calling function with explicit schema
SELECT 'Test 4: Function call' as test_name;
SELECT * FROM public.get_next_pet_of_day();
