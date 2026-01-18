-- 2026-01-18: Enterprise persistence hardening
-- - Ensure strict RLS on unified_users + sr_bookmarks
-- - Create sr_bookmarks + sr_bookmark_folders if missing
-- - Add minimal geo fields needed for Paul Revere targeting

-- ---------------------------------------------------------------------------
-- unified_users hardening
-- ---------------------------------------------------------------------------

-- Add fields used for geo-targeted alerts / age-gate sync
ALTER TABLE unified_users
  ADD COLUMN IF NOT EXISTS state_code TEXT,
  ADD COLUMN IF NOT EXISTS zip_code TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT;

-- Enforce RLS strictly
ALTER TABLE unified_users ENABLE ROW LEVEL SECURITY;

-- Remove permissive policies if they exist (best-effort; names may vary)
DROP POLICY IF EXISTS "Public read unified users" ON unified_users;
DROP POLICY IF EXISTS "Anyone can read unified users" ON unified_users;
DROP POLICY IF EXISTS "Anyone can update unified users" ON unified_users;

-- Users can read their own profile row
CREATE POLICY "Users can read own unified_users row"
  ON unified_users
  FOR SELECT
  USING (auth.uid() = id);

-- Users can update limited fields on their own row
-- NOTE: Supabase PostgREST cannot column-restrict via policy; enforce sensitive writes server-side.
CREATE POLICY "Users can update own unified_users row"
  ON unified_users
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Service role full access (bots, admin ops)
CREATE POLICY "Service role full access unified_users"
  ON unified_users
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role')
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

-- ---------------------------------------------------------------------------
-- Bookmarks
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS sr_bookmark_folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES unified_users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  color text,
  is_public boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sr_bookmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES unified_users(id) ON DELETE CASCADE,
  folder_id uuid REFERENCES sr_bookmark_folders(id) ON DELETE SET NULL,
  item_type text NOT NULL CHECK (item_type IN ('law', 'place', 'comparison')),
  item_id text NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, item_type, item_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sr_bookmarks_user_id ON sr_bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_sr_bookmarks_folder_id ON sr_bookmarks(folder_id);
CREATE INDEX IF NOT EXISTS idx_sr_bookmarks_item_type ON sr_bookmarks(item_type);
CREATE INDEX IF NOT EXISTS idx_sr_bookmark_folders_user_id ON sr_bookmark_folders(user_id);

-- Triggers (uses update_updated_at_column() if present from other migrations)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    DROP TRIGGER IF EXISTS sr_bookmarks_updated_at ON sr_bookmarks;
    CREATE TRIGGER sr_bookmarks_updated_at
      BEFORE UPDATE ON sr_bookmarks
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

    DROP TRIGGER IF EXISTS sr_bookmark_folders_updated_at ON sr_bookmark_folders;
    CREATE TRIGGER sr_bookmark_folders_updated_at
      BEFORE UPDATE ON sr_bookmark_folders
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Strict RLS
ALTER TABLE sr_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE sr_bookmark_folders ENABLE ROW LEVEL SECURITY;

-- Users can read/write only their own bookmarks/folders
CREATE POLICY "Users manage own sr_bookmarks"
  ON sr_bookmarks
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own sr_bookmark_folders"
  ON sr_bookmark_folders
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Service role full access
CREATE POLICY "Service role full access sr_bookmarks"
  ON sr_bookmarks
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role')
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role full access sr_bookmark_folders"
  ON sr_bookmark_folders
  FOR ALL
  USING (auth.jwt()->>'role' = 'service_role')
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

