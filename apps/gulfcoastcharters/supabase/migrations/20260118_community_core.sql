-- Community core tables + alignment for gamification/engagement features.
-- This migration intentionally focuses on tables referenced by existing edge functions/components:
-- - catch-of-the-day edge function: catch_submissions, catch_votes
-- - fishing-buddy-finder edge function: fishing_profiles, buddy_connections
-- - social sharing analytics: social_shares
-- - points UI expects profiles.points: add + keep in sync with point_transactions

-- =========================
-- Profiles points (sync)
-- =========================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS points INTEGER NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.recompute_profile_points(target_user UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.profiles p
  SET points = (
    SELECT COALESCE(SUM(pt.points), 0)
    FROM public.point_transactions pt
    WHERE pt.user_id = target_user
  )
  WHERE p.id = target_user;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public._trg_recompute_profile_points()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM public.recompute_profile_points(COALESCE(NEW.user_id, OLD.user_id));
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_recompute_points_after_change ON public.point_transactions;

CREATE TRIGGER trg_recompute_points_after_change
AFTER INSERT OR UPDATE OR DELETE ON public.point_transactions
FOR EACH ROW
EXECUTE FUNCTION public._trg_recompute_profile_points();

-- =========================
-- Catch of the Day
-- =========================

CREATE TABLE IF NOT EXISTS public.catch_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  trip_id UUID,
  species TEXT NOT NULL,
  weight NUMERIC,
  length NUMERIC,
  location TEXT,
  photo_url TEXT,
  description TEXT,
  vote_count INTEGER NOT NULL DEFAULT 0,
  is_public BOOLEAN NOT NULL DEFAULT TRUE,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.catch_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  catch_id UUID NOT NULL REFERENCES public.catch_submissions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  vote_type TEXT NOT NULL CHECK (vote_type IN ('upvote', 'downvote')),
  voted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (catch_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_catch_submissions_public ON public.catch_submissions(is_public, submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_catch_votes_catch ON public.catch_votes(catch_id);
CREATE INDEX IF NOT EXISTS idx_catch_votes_user ON public.catch_votes(user_id);

ALTER TABLE public.catch_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.catch_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View public catches"
  ON public.catch_submissions
  FOR SELECT
  USING (is_public = true OR auth.uid() = user_id);

CREATE POLICY "Create own catch submission"
  ON public.catch_submissions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Update own catch submission"
  ON public.catch_submissions
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Delete own catch submission"
  ON public.catch_submissions
  FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Users manage own catch votes"
  ON public.catch_votes
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =========================
-- Fishing Buddy Finder
-- =========================

CREATE TABLE IF NOT EXISTS public.fishing_profiles (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  fishing_preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
  availability TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  location JSONB,
  looking_for_buddies BOOLEAN NOT NULL DEFAULT TRUE,
  total_catches INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.buddy_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  buddy_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, buddy_id)
);

CREATE INDEX IF NOT EXISTS idx_buddy_connections_user ON public.buddy_connections(user_id, status);
CREATE INDEX IF NOT EXISTS idx_buddy_connections_buddy ON public.buddy_connections(buddy_id, status);

ALTER TABLE public.fishing_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buddy_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View buddy finder profiles"
  ON public.fishing_profiles
  FOR SELECT
  USING (true);

CREATE POLICY "Manage own fishing profile"
  ON public.fishing_profiles
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "View own buddy connections"
  ON public.buddy_connections
  FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() = buddy_id);

CREATE POLICY "Create own buddy connections"
  ON public.buddy_connections
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Update own buddy connections"
  ON public.buddy_connections
  FOR UPDATE
  USING (auth.uid() = user_id OR auth.uid() = buddy_id);

-- =========================
-- Social sharing analytics
-- =========================

CREATE TABLE IF NOT EXISTS public.social_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  share_type TEXT,
  platform TEXT,
  share_url TEXT,
  image_url TEXT,
  content_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_social_shares_user_id ON public.social_shares(user_id);
CREATE INDEX IF NOT EXISTS idx_social_shares_created_at ON public.social_shares(created_at);

ALTER TABLE public.social_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own shares"
  ON public.social_shares
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users create shares"
  ON public.social_shares
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

