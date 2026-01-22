-- Enable RLS for trending_topics table
-- Run this if trending_topics shows rls_enabled = false

ALTER TABLE trending_topics ENABLE ROW LEVEL SECURITY;

-- Verify it's enabled
SELECT 
  tablename, 
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'trending_topics';

-- The policy should already exist from rls-policies.sql, but verify:
SELECT policyname 
FROM pg_policies 
WHERE tablename = 'trending_topics';
