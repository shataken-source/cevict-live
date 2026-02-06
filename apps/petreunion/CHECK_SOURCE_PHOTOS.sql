-- ============================================
-- CHECK SOURCE PHOTOS - FREE Database
-- Run this in FREE database (nqkbqtiramecvmmpaxzk) to see if source has photos
-- ============================================

-- Check pets table in FREE database
SELECT 
  'Total pets in FREE database' as check_name,
  COUNT(*) as count
FROM pets;

-- Check pets with photos in source
SELECT 
  'Pets with photo_url in source' as check_name,
  COUNT(*) as count
FROM pets
WHERE photo_url IS NOT NULL AND photo_url != '';

-- Check pets with image_url in source (alternative field name)
SELECT 
  'Pets with image_url in source' as check_name,
  COUNT(*) as count
FROM pets
WHERE image_url IS NOT NULL AND image_url != '';

-- Check pets with EITHER photo field
SELECT 
  'Pets with ANY photo field' as check_name,
  COUNT(*) as count
FROM pets
WHERE (photo_url IS NOT NULL AND photo_url != '')
   OR (image_url IS NOT NULL AND image_url != '');

-- Sample pets with photos from source
SELECT 
  'Sample pets WITH photos' as check_name,
  id,
  name,
  photo_url,
  image_url,
  created_at
FROM pets
WHERE (photo_url IS NOT NULL AND photo_url != '')
   OR (image_url IS NOT NULL AND image_url != '')
ORDER BY created_at DESC
LIMIT 5;

-- Check column names in pets table
SELECT 
  'Column names in pets table' as check_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'pets'
  AND (column_name LIKE '%photo%' OR column_name LIKE '%image%')
ORDER BY column_name;
