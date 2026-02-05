-- Community message board (no localStorage seed data).

CREATE TABLE IF NOT EXISTS public.community_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.community_posts(id) ON DELETE CASCADE,
  title TEXT,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_community_posts_parent ON public.community_posts(parent_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_posts_created ON public.community_posts(created_at DESC);

ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;

-- Public read (community forum is public). If you want auth-only later, change USING(true) to auth.uid() IS NOT NULL.
CREATE POLICY "View community posts"
  ON public.community_posts
  FOR SELECT
  USING (true);

-- Authenticated users can post (threads and replies).
CREATE POLICY "Create own community posts"
  ON public.community_posts
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Authors can edit/delete own posts.
CREATE POLICY "Update own community posts"
  ON public.community_posts
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Delete own community posts"
  ON public.community_posts
  FOR DELETE
  USING (auth.uid() = user_id);

