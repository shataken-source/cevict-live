-- ============================================
-- ADD PLACEHOLDER PHOTO - PRO Database
-- This will add a placeholder photo to enable Pet of Day testing
-- ============================================

-- Method 1: Update first visible pet (works with RLS)
UPDATE lost_pets 
SET photo_url = 'https://via.placeholder.com/400x400?text=Pet+Photo'
WHERE id IN (
  SELECT id FROM lost_pets 
  ORDER BY created_at ASC 
  LIMIT 1
);

-- Verify it worked
SELECT 
  'Updated pet' as check_name,
  id,
  pet_name,
  photo_url,
  created_at
FROM lost_pets
WHERE photo_url IS NOT NULL AND photo_url != ''
ORDER BY created_at DESC
LIMIT 1;

-- Test the function
SELECT 'Testing get_next_pet_of_day()...' as check_name;
SELECT * FROM get_next_pet_of_day();
