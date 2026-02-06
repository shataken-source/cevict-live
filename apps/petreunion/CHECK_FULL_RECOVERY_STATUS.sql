-- ============================================
-- CHECK FULL RECOVERY STATUS - PRO Database
-- Comprehensive check after RLS fix
-- ============================================

-- Total count (should be 10,397+)
SELECT 
  'Total lost_pets' as check_name,
  COUNT(*) as count,
  CASE 
    WHEN COUNT(*) >= 10000 THEN '✅ GOOD'
    WHEN COUNT(*) >= 1000 THEN '⚠️ LOW'
    ELSE '❌ CRITICAL'
  END as status
FROM lost_pets;

-- Pets with photos (CRITICAL for Pet of Day)
SELECT 
  'Pets with photos' as check_name,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM lost_pets), 2) as percentage,
  CASE 
    WHEN COUNT(*) >= 1000 THEN '✅ GOOD'
    WHEN COUNT(*) >= 100 THEN '⚠️ LOW'
    WHEN COUNT(*) >= 1 THEN '⚠️ VERY LOW'
    ELSE '❌ CRITICAL - Pet of Day will not work'
  END as status
FROM lost_pets 
WHERE photo_url IS NOT NULL AND photo_url != '';

-- Pets WITHOUT photos (problem)
SELECT 
  'Pets WITHOUT photos' as check_name,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM lost_pets), 2) as percentage
FROM lost_pets 
WHERE photo_url IS NULL OR photo_url = '';

-- Sample pets with photos (if any)
SELECT 
  'Sample pets WITH photos' as check_name,
  id,
  pet_name,
  photo_url,
  created_at
FROM lost_pets
WHERE photo_url IS NOT NULL AND photo_url != ''
ORDER BY created_at DESC
LIMIT 5;

-- Check photo_url field mapping issue
-- The recovery script maps: photo_url: pet.photo_url || pet.image_url || null
-- If both are null in source, result is null
SELECT 
  'Photo URL analysis' as check_name,
  COUNT(*) as total,
  COUNT(photo_url) as has_photo_url,
  COUNT(CASE WHEN photo_url IS NOT NULL AND photo_url != '' THEN 1 END) as has_valid_photo_url
FROM lost_pets;

-- Check if we need to re-run recovery with photo fix
SELECT 
  'Recovery status' as check_name,
  CASE 
    WHEN (SELECT COUNT(*) FROM lost_pets) >= 10000 
      AND (SELECT COUNT(*) FROM lost_pets WHERE photo_url IS NOT NULL AND photo_url != '') >= 1000
    THEN '✅ Recovery complete with photos'
    WHEN (SELECT COUNT(*) FROM lost_pets) >= 10000 
      AND (SELECT COUNT(*) FROM lost_pets WHERE photo_url IS NOT NULL AND photo_url != '') < 1000
    THEN '⚠️ Recovery complete but missing photos - Check source data'
    WHEN (SELECT COUNT(*) FROM lost_pets) < 10000
    THEN '❌ Recovery incomplete - Re-run recover-all-pets.ts'
    ELSE '❌ Unknown status'
  END as status;
