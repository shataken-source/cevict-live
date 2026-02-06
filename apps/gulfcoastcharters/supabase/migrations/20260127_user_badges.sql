-- User Badges Table
-- Tracks badges earned by users
-- Created: 2026-01-27

-- Ensure extensions are available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Badge definitions (stored in code, but we track earned badges here)
CREATE TABLE IF NOT EXISTS public.user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.shared_users(id) ON DELETE CASCADE,
  
  -- Badge info
  badge_id VARCHAR(100) NOT NULL, -- e.g., 'breaking_ice', 'storyteller'
  badge_name VARCHAR(200) NOT NULL, -- e.g., '🎣 Breaking the Ice'
  badge_description TEXT,
  badge_icon VARCHAR(10), -- Emoji icon
  
  -- Metadata
  earned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  points_awarded INTEGER DEFAULT 0, -- Bonus points for earning badge
  
  -- Unique constraint: user can only earn each badge once
  UNIQUE(user_id, badge_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_badges_user_id ON public.user_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_badge_id ON public.user_badges(badge_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_earned_at ON public.user_badges(earned_at DESC);

-- Enable RLS
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own badges
DROP POLICY IF EXISTS "Users can read own badges" ON public.user_badges;
CREATE POLICY "Users can read own badges"
  ON public.user_badges
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy: Public can read badges (for display on posts)
DROP POLICY IF EXISTS "Public can read badges" ON public.user_badges;
CREATE POLICY "Public can read badges"
  ON public.user_badges
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Service role can do everything
DROP POLICY IF EXISTS "Service role full access" ON public.user_badges;
CREATE POLICY "Service role full access"
  ON public.user_badges
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Function to award badge
CREATE OR REPLACE FUNCTION public.award_badge(
  p_user_id UUID,
  p_badge_id VARCHAR(100),
  p_badge_name VARCHAR(200),
  p_badge_description TEXT DEFAULT NULL,
  p_badge_icon VARCHAR(10) DEFAULT NULL,
  p_points_awarded INTEGER DEFAULT 0
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if already earned
  IF EXISTS (
    SELECT 1 FROM public.user_badges
    WHERE user_id = p_user_id AND badge_id = p_badge_id
  ) THEN
    RETURN false;
  END IF;
  
  -- Award badge
  INSERT INTO public.user_badges (
    user_id,
    badge_id,
    badge_name,
    badge_description,
    badge_icon,
    points_awarded
  ) VALUES (
    p_user_id,
    p_badge_id,
    p_badge_name,
    p_badge_description,
    p_badge_icon,
    p_points_awarded
  );
  
  -- Award bonus points if specified (using loyalty_transactions)
  IF p_points_awarded > 0 THEN
    INSERT INTO public.loyalty_transactions (
      user_id,
      transaction_type,
      points,
      platform,
      source_type,
      description
    ) VALUES (
      p_user_id,
      'earned',
      p_points_awarded,
      'gcc',
      'badge_bonus',
      'Bonus points for earning badge: ' || p_badge_name
    );
    
    -- Update loyalty tier (which updates total_points)
    PERFORM public.update_loyalty_tier(p_user_id);
  END IF;
  
  RETURN true;
END;
$$;

-- Comment
COMMENT ON TABLE public.user_badges IS 'Tracks badges earned by users';
COMMENT ON FUNCTION public.award_badge(UUID, VARCHAR, VARCHAR, TEXT, VARCHAR, INTEGER) IS 'Awards a badge to a user if not already earned';
