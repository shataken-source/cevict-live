-- Add Facebook post tracking columns to lost_pets table
-- This allows us to deduplicate posts and track their source

-- Add columns if they don't exist
DO $$ 
BEGIN
  -- Add facebook_post_id column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lost_pets' AND column_name = 'facebook_post_id'
  ) THEN
    ALTER TABLE lost_pets ADD COLUMN facebook_post_id TEXT;
  END IF;
  
  -- Add facebook_post_url column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'lost_pets' AND column_name = 'facebook_post_url'
  ) THEN
    ALTER TABLE lost_pets ADD COLUMN facebook_post_url TEXT;
  END IF;
END $$;

-- Create unique index on facebook_post_id to prevent duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_lost_pets_facebook_post_id 
  ON lost_pets(facebook_post_id) 
  WHERE facebook_post_id IS NOT NULL;

-- Create index for Facebook post lookups
CREATE INDEX IF NOT EXISTS idx_lost_pets_facebook_post 
  ON lost_pets(facebook_post_id, created_at DESC) 
  WHERE facebook_post_id IS NOT NULL;

-- Add comment
COMMENT ON COLUMN lost_pets.facebook_post_id IS 'Facebook post ID for deduplication';
COMMENT ON COLUMN lost_pets.facebook_post_url IS 'URL to the original Facebook post';





