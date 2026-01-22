-- Fix Schema Cache Issue for bias_label column
-- This script ensures the column exists and refreshes the schema cache

-- First, ensure the column exists (defensive check)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'headlines' 
    AND column_name = 'bias_label'
  ) THEN
    ALTER TABLE headlines 
    ADD COLUMN bias_label TEXT CHECK (bias_label IN ('mainstream', 'alternative', 'neutral'));
    
    RAISE NOTICE 'Added bias_label column to headlines table';
  ELSE
    RAISE NOTICE 'bias_label column already exists';
  END IF;
END $$;

-- Refresh Supabase schema cache
-- This is critical - Supabase caches the schema and needs to be refreshed
NOTIFY pgrst, 'reload schema';

-- Verify the column exists
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'headlines' 
AND column_name = 'bias_label';
