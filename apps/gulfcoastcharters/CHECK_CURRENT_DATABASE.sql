-- Check which database/project you're currently connected to
-- Run this in Supabase SQL Editor to see your current project

-- Check project info
SELECT 
  current_database() AS database_name,
  current_user AS current_user,
  version() AS postgres_version;

-- Check if vessels table exists and has data
SELECT 
  'vessels' AS table_name,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'vessels')
    THEN (SELECT COUNT(*) FROM vessels)
    ELSE 0
  END AS row_count
UNION ALL
SELECT 
  'boats',
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'boats')
    THEN (SELECT COUNT(*) FROM boats)
    ELSE 0
  END
UNION ALL
SELECT 
  'charters',
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'charters')
    THEN (SELECT COUNT(*) FROM charters)
    ELSE 0
  END
UNION ALL
SELECT 
  'captains',
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'captains')
    THEN (SELECT COUNT(*) FROM captains)
    ELSE 0
  END;

-- Show project URL (if available in settings)
-- Note: This might not work in all Supabase projects
SELECT 
  'Project Info' AS info_type,
  current_setting('app.settings.project_url', true) AS project_url;
