-- Fix Schema Cache for reactions and crowd_drama_votes tables
-- This ensures the tables exist and are properly configured

-- ============================================
-- 1. Ensure reactions table exists
-- ============================================
CREATE TABLE IF NOT EXISTS reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  headline_id UUID,
  ip_address TEXT,
  reaction_type TEXT CHECK (reaction_type IN ('🔥', '🧢', '🧐', '🍿', '📈', '📉', '🎭')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(headline_id, ip_address, reaction_type),
  CONSTRAINT fk_headline_reaction FOREIGN KEY (headline_id) REFERENCES headlines(id) ON DELETE CASCADE
);

-- ============================================
-- 2. Ensure crowd_drama_votes table exists
-- ============================================
CREATE TABLE IF NOT EXISTS crowd_drama_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  headline_id UUID,
  ip_address TEXT,
  drama_score INTEGER NOT NULL CHECK (drama_score >= 1 AND drama_score <= 10),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(headline_id, ip_address),
  CONSTRAINT fk_headline_crowd_vote FOREIGN KEY (headline_id) REFERENCES headlines(id) ON DELETE CASCADE
);

-- ============================================
-- 3. Create indexes for performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_reactions_headline_id ON reactions(headline_id);
CREATE INDEX IF NOT EXISTS idx_reactions_type ON reactions(reaction_type);
CREATE INDEX IF NOT EXISTS idx_crowd_drama_votes_headline_id ON crowd_drama_votes(headline_id);
CREATE INDEX IF NOT EXISTS idx_crowd_drama_votes_drama_score ON crowd_drama_votes(drama_score);

-- ============================================
-- 4. Enable RLS (Row Level Security)
-- ============================================
ALTER TABLE reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE crowd_drama_votes ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 5. Create RLS Policies (if they don't exist)
-- ============================================

-- Reactions: Allow public read, insert, update
DROP POLICY IF EXISTS "Allow public read access to reactions" ON reactions;
CREATE POLICY "Allow public read access to reactions"
  ON reactions FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Allow public insert reactions" ON reactions;
CREATE POLICY "Allow public insert reactions"
  ON reactions FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update reactions" ON reactions;
CREATE POLICY "Allow public update reactions"
  ON reactions FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Crowd Drama Votes: Allow public read, insert, update
DROP POLICY IF EXISTS "Allow public read access to crowd_drama_votes" ON crowd_drama_votes;
CREATE POLICY "Allow public read access to crowd_drama_votes"
  ON crowd_drama_votes FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Allow public insert crowd_drama_votes" ON crowd_drama_votes;
CREATE POLICY "Allow public insert crowd_drama_votes"
  ON crowd_drama_votes FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update crowd_drama_votes" ON crowd_drama_votes;
CREATE POLICY "Allow public update crowd_drama_votes"
  ON crowd_drama_votes FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- ============================================
-- 6. Verify tables exist
-- ============================================
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'reactions') THEN
    RAISE NOTICE '✓ reactions table exists';
  ELSE
    RAISE EXCEPTION 'reactions table does NOT exist';
  END IF;

  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'crowd_drama_votes') THEN
    RAISE NOTICE '✓ crowd_drama_votes table exists';
  ELSE
    RAISE EXCEPTION 'crowd_drama_votes table does NOT exist';
  END IF;
END $$;

-- ============================================
-- IMPORTANT: After running this script:
-- ============================================
-- 1. Go to Supabase Dashboard
-- 2. Settings → API
-- 3. Click "Reload schema cache" button
-- 4. Wait 30-60 seconds
-- 5. Refresh your app
--
-- The tables exist, but Supabase's PostgREST API needs
-- the schema cache refreshed to recognize them.
