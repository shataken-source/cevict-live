-- Quick Fix: Enable RLS for trending_topics
-- Run this in Supabase SQL Editor

ALTER TABLE trending_topics ENABLE ROW LEVEL SECURITY;

-- Verify it worked
SELECT 
  tablename, 
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'trending_topics';

-- Should show: trending_topics | true
