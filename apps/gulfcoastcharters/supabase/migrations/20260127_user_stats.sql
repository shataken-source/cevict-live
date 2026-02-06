-- User Stats Table
-- Tracks user activity for badges and trust levels
-- Created: 2026-01-27

-- Ensure extensions are available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- User Stats table
CREATE TABLE IF NOT EXISTS public.user_stats (
  user_id UUID PRIMARY KEY REFERENCES public.shared_users(id) ON DELETE CASCADE,
  
  -- Post counts
  posts_count INTEGER DEFAULT 0,
  replies_count INTEGER DEFAULT 0,
  total_posts INTEGER DEFAULT 0, -- posts + replies
  
  -- Engagement
  helpful_votes_received INTEGER DEFAULT 0,
  helpful_votes_given INTEGER DEFAULT 0,
  likes_received INTEGER DEFAULT 0,
  shares_count INTEGER DEFAULT 0,
  
  -- Media
  photos_shared INTEGER DEFAULT 0,
  videos_shared INTEGER DEFAULT 0,
  
  -- Activity
  days_active INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_check_in DATE,
  last_post_date DATE,
  
  -- Special content
  fishing_spots_shared INTEGER DEFAULT 0,
  gear_reviews INTEGER DEFAULT 0,
  weather_updates INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_stats_posts ON public.user_stats(posts_count DESC);
CREATE INDEX IF NOT EXISTS idx_user_stats_total_posts ON public.user_stats(total_posts DESC);
CREATE INDEX IF NOT EXISTS idx_user_stats_helpful ON public.user_stats(helpful_votes_received DESC);
CREATE INDEX IF NOT EXISTS idx_user_stats_streak ON public.user_stats(current_streak DESC);

-- Enable RLS
ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own stats
DROP POLICY IF EXISTS "Users can read own stats" ON public.user_stats;
CREATE POLICY "Users can read own stats"
  ON public.user_stats
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy: Service role can do everything
DROP POLICY IF EXISTS "Service role full access" ON public.user_stats;
CREATE POLICY "Service role full access"
  ON public.user_stats
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Function to get or create user stats
CREATE OR REPLACE FUNCTION public.get_or_create_user_stats(p_user_id UUID)
RETURNS public.user_stats
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_stats public.user_stats;
BEGIN
  SELECT * INTO v_stats
  FROM public.user_stats
  WHERE user_id = p_user_id;
  
  IF NOT FOUND THEN
    INSERT INTO public.user_stats (user_id)
    VALUES (p_user_id)
    RETURNING * INTO v_stats;
  END IF;
  
  RETURN v_stats;
END;
$$;

-- Function to increment post count
CREATE OR REPLACE FUNCTION public.increment_user_post_count(
  p_user_id UUID,
  p_is_reply BOOLEAN DEFAULT false
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Ensure stats exist
  PERFORM public.get_or_create_user_stats(p_user_id);
  
  IF p_is_reply THEN
    UPDATE public.user_stats
    SET 
      replies_count = replies_count + 1,
      total_posts = total_posts + 1,
      last_post_date = CURRENT_DATE,
      updated_at = NOW()
    WHERE user_id = p_user_id;
  ELSE
    UPDATE public.user_stats
    SET 
      posts_count = posts_count + 1,
      total_posts = total_posts + 1,
      last_post_date = CURRENT_DATE,
      updated_at = NOW()
    WHERE user_id = p_user_id;
  END IF;
END;
$$;

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION public.update_user_stats_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_user_stats_updated_at ON public.user_stats;
CREATE TRIGGER update_user_stats_updated_at
  BEFORE UPDATE ON public.user_stats
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_stats_updated_at();

-- Comment
COMMENT ON TABLE public.user_stats IS 'Tracks user activity for badges and trust levels';
COMMENT ON FUNCTION public.get_or_create_user_stats(UUID) IS 'Gets or creates user stats record';
COMMENT ON FUNCTION public.increment_user_post_count(UUID, BOOLEAN) IS 'Increments post or reply count';
