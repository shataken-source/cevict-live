-- Comprehensive Schema Verification and Fix
-- Run this to ensure all tables exist and schema cache is refreshed

-- Step 1: Check if headlines table exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'headlines'
  ) THEN
    RAISE NOTICE 'headlines table does NOT exist - you need to run schema.sql first!';
  ELSE
    RAISE NOTICE 'headlines table EXISTS';
  END IF;
END $$;

-- Step 2: Check if trending_topics table exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'trending_topics'
  ) THEN
    RAISE NOTICE 'trending_topics table does NOT exist - you need to run schema.sql first!';
  ELSE
    RAISE NOTICE 'trending_topics table EXISTS';
  END IF;
END $$;

-- Step 3: List all tables in public schema
SELECT 
  table_name,
  CASE 
    WHEN table_name IN ('headlines', 'trending_topics', 'votes', 'reactions', 'user_alerts') 
    THEN '✅ Required'
    ELSE 'Optional'
  END as status
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- Step 4: Check if bias_label column exists in headlines
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public'
AND table_name = 'headlines' 
AND column_name = 'bias_label';

-- Step 5: Refresh schema cache (CRITICAL!)
NOTIFY pgrst, 'reload schema';

-- Step 6: Verify RLS is enabled
SELECT 
  tablename, 
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('headlines', 'trending_topics', 'votes', 'reactions')
ORDER BY tablename;
