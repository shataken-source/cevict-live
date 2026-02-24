-- User Stats and Badges System
-- Created by Cascade

-- Create user_stats table to track comprehensive user statistics
CREATE TABLE IF NOT EXISTS public.user_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Points and Level
  total_points INTEGER DEFAULT 0,
  current_level INTEGER DEFAULT 1,
  level_progress INTEGER DEFAULT 0,
  points_to_next_level INTEGER DEFAULT 100,
  
  -- Activity Counts
  total_charters_booked INTEGER DEFAULT 0,
  total_charters_completed INTEGER DEFAULT 0,
  total_messages_sent INTEGER DEFAULT 0,
  total_threads_created INTEGER DEFAULT 0,
  total_reactions_received INTEGER DEFAULT 0,
  total_photos_uploaded INTEGER DEFAULT 0,
  total_reviews_written INTEGER DEFAULT 0,
  
  -- Engagement Metrics
  consecutive_days_active INTEGER DEFAULT 0,
  total_days_active INTEGER DEFAULT 0,
  last_active_date DATE,
  join_date DATE DEFAULT CURRENT_DATE,
  
  -- Achievement Stats
  badges_earned INTEGER DEFAULT 0,
  achievements_unlocked INTEGER DEFAULT 0,
  tournament_wins INTEGER DEFAULT 0,
  contest_wins INTEGER DEFAULT 0,
  
  -- Social Stats
  friends_count INTEGER DEFAULT 0,
  followers_count INTEGER DEFAULT 0,
  following_count INTEGER DEFAULT 0,
  
  -- Fishing Specific Stats
  total_fish_caught INTEGER DEFAULT 0,
  biggest_catch_weight DECIMAL(10,2),
  rare_species_caught INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id)
);

-- Create badges table
CREATE TABLE IF NOT EXISTS public.badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  icon_url TEXT,
  rarity TEXT NOT NULL DEFAULT 'common',
  requirement_type TEXT NOT NULL,
  requirement_value INTEGER NOT NULL,
  points_awarded INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create user_badges table to track earned badges
CREATE TABLE IF NOT EXISTS public.user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  badge_id UUID REFERENCES public.badges(id) ON DELETE CASCADE NOT NULL,
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  progress INTEGER DEFAULT 0,
  is_displayed BOOLEAN DEFAULT true,
  UNIQUE(user_id, badge_id)
);

-- Create badge_categories table
CREATE TABLE IF NOT EXISTS public.badge_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  icon_url TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create user_achievements table for specific achievements
CREATE TABLE IF NOT EXISTS public.user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  achievement_type TEXT NOT NULL,
  achievement_name TEXT NOT NULL,
  description TEXT,
  progress INTEGER DEFAULT 0,
  target_value INTEGER NOT NULL,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  points_awarded INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, achievement_type)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_stats_user_id ON public.user_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_user_stats_level ON public.user_stats(current_level);
CREATE INDEX IF NOT EXISTS idx_user_stats_points ON public.user_stats(total_points);
CREATE INDEX IF NOT EXISTS idx_user_stats_active_date ON public.user_stats(last_active_date);

CREATE INDEX IF NOT EXISTS idx_badges_category ON public.badges(category);
CREATE INDEX IF NOT EXISTS idx_badges_rarity ON public.badges(rarity);
CREATE INDEX IF NOT EXISTS idx_badges_active ON public.badges(is_active);

CREATE INDEX IF NOT EXISTS idx_user_badges_user ON public.user_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_badge ON public.user_badges(badge_id);
CREATE INDEX IF NOT EXISTS idx_user_badges_earned ON public.user_badges(earned_at);

CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON public.user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_type ON public.user_achievements(achievement_type);
CREATE INDEX IF NOT EXISTS idx_user_achievements_completed ON public.user_achievements(completed);

-- Enable Row Level Security
ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.badge_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own stats"
  ON public.user_stats
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own stats"
  ON public.user_stats
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Badges are public"
  ON public.badges
  FOR SELECT
  USING (is_active = true);

CREATE POLICY "Badge categories are public"
  ON public.badge_categories
  FOR SELECT
  USING (true);

CREATE POLICY "Users can view their own badges"
  ON public.user_badges
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own badges"
  ON public.user_badges
  FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own achievements"
  ON public.user_achievements
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own achievements"
  ON public.user_achievements
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Functions for user stats management
CREATE OR REPLACE FUNCTION public.update_user_stats(
  user_uuid UUID,
  stat_type TEXT,
  increment_value INTEGER DEFAULT 1
) RETURNS VOID AS $$
BEGIN
  INSERT INTO public.user_stats (
    user_id,
    total_points,
    current_level,
    updated_at
  ) VALUES (
    user_uuid,
    0,
    1,
    NOW()
  )
  ON CONFLICT (user_id) DO NOTHING;
  
  CASE stat_type
    WHEN 'charters_booked' THEN
      UPDATE public.user_stats 
      SET total_charters_booked = total_charters_booked + increment_value,
          updated_at = NOW()
      WHERE user_id = user_uuid;
    
    WHEN 'charters_completed' THEN
      UPDATE public.user_stats 
      SET total_charters_completed = total_charters_completed + increment_value,
          updated_at = NOW()
      WHERE user_id = user_uuid;
    
    WHEN 'messages_sent' THEN
      UPDATE public.user_stats 
      SET total_messages_sent = total_messages_sent + increment_value,
          updated_at = NOW()
      WHERE user_id = user_uuid;
    
    WHEN 'threads_created' THEN
      UPDATE public.user_stats 
      SET total_threads_created = total_threads_created + increment_value,
          updated_at = NOW()
      WHERE user_id = user_uuid;
    
    WHEN 'reactions_received' THEN
      UPDATE public.user_stats 
      SET total_reactions_received = total_reactions_received + increment_value,
          updated_at = NOW()
      WHERE user_id = user_uuid;
    
    WHEN 'photos_uploaded' THEN
      UPDATE public.user_stats 
      SET total_photos_uploaded = total_photos_uploaded + increment_value,
          updated_at = NOW()
      WHERE user_id = user_uuid;
    
    WHEN 'reviews_written' THEN
      UPDATE public.user_stats 
      SET total_reviews_written = total_reviews_written + increment_value,
          updated_at = NOW()
      WHERE user_id = user_uuid;
    
    WHEN 'fish_caught' THEN
      UPDATE public.user_stats 
      SET total_fish_caught = total_fish_caught + increment_value,
          updated_at = NOW()
      WHERE user_id = user_uuid;
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.check_and_award_badges(
  user_uuid UUID
) RETURNS JSONB AS $$
DECLARE
  earned_badges JSONB := '[]'::JSONB;
  badge_record RECORD;
BEGIN
  -- Check for various badge conditions and award them
  FOR badge_record IN 
    SELECT b.* FROM public.badges b
    WHERE b.is_active = true
    AND NOT EXISTS (
      SELECT 1 FROM public.user_badges ub 
      WHERE ub.user_id = user_uuid AND ub.badge_id = b.id
    )
  LOOP
    -- Check if user meets badge requirements
    IF public.user_meets_badge_requirement(user_uuid, badge_record.id) THEN
      INSERT INTO public.user_badges (user_id, badge_id, earned_at)
      VALUES (user_uuid, badge_record.id, NOW());
      
      earned_badges := earned_badges || jsonb_build_object(
        'badge_id', badge_record.id,
        'name', badge_record.display_name,
        'description', badge_record.description,
        'points', badge_record.points_awarded
      );
      
      -- Award points for badge
      PERFORM public.award_points(user_uuid, badge_record.points_awarded, 'badge_earned', badge_record.id, 'Badge earned: ' || badge_record.display_name);
    END IF;
  END LOOP;
  
  RETURN earned_badges;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.user_meets_badge_requirement(
  user_uuid UUID,
  badge_uuid UUID
) RETURNS BOOLEAN AS $$
DECLARE
  badge_info RECORD;
  user_stat RECORD;
BEGIN
  -- Get badge requirements
  SELECT * INTO badge_info 
  FROM public.badges 
  WHERE id = badge_uuid;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Get user stats
  SELECT * INTO user_stat 
  FROM public.user_stats 
  WHERE user_id = user_uuid;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Check requirement based on type
  CASE badge_info.requirement_type
    WHEN 'charters_booked' THEN
      RETURN user_stat.total_charters_booked >= badge_info.requirement_value;
    
    WHEN 'charters_completed' THEN
      RETURN user_stat.total_charters_completed >= badge_info.requirement_value;
    
    WHEN 'messages_sent' THEN
      RETURN user_stat.total_messages_sent >= badge_info.requirement_value;
    
    WHEN 'threads_created' THEN
      RETURN user_stat.total_threads_created >= badge_info.requirement_value;
    
    WHEN 'photos_uploaded' THEN
      RETURN user_stat.total_photos_uploaded >= badge_info.requirement_value;
    
    WHEN 'reviews_written' THEN
      RETURN user_stat.total_reviews_written >= badge_info.requirement_value;
    
    WHEN 'points_earned' THEN
      RETURN user_stat.total_points >= badge_info.requirement_value;
    
    WHEN 'level_reached' THEN
      RETURN user_stat.current_level >= badge_info.requirement_value;
    
    WHEN 'days_active' THEN
      RETURN user_stat.total_days_active >= badge_info.requirement_value;
    
    ELSE
      RETURN FALSE;
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert default badge categories
INSERT INTO public.badge_categories (name, display_name, description, sort_order) VALUES
  ('general', 'General', 'General achievement badges', 1),
  ('fishing', 'Fishing', 'Fishing-related achievements', 2),
  ('social', 'Social', 'Social interaction badges', 3),
  ('community', 'Community', 'Community contribution badges', 4),
  ('milestone', 'Milestones', 'Milestone achievements', 5)
ON CONFLICT (name) DO NOTHING;

-- Insert default badges
INSERT INTO public.badges (name, display_name, description, category, rarity, requirement_type, requirement_value, points_awarded) VALUES
  ('first_charter', 'First Charter', 'Booked your first charter', 'general', 'common', 'charters_booked', 1, 10),
  ('charter_enthusiast', 'Charter Enthusiast', 'Booked 10 charters', 'general', 'uncommon', 'charters_booked', 10, 50),
  ('charter_veteran', 'Charter Veteran', 'Booked 50 charters', 'general', 'rare', 'charters_booked', 50, 200),
  ('first_catch', 'First Catch', 'Caught your first fish', 'fishing', 'common', 'fish_caught', 1, 5),
  ('fishing_pro', 'Fishing Pro', 'Caught 100 fish', 'fishing', 'uncommon', 'fish_caught', 100, 100),
  ('social_butterfly', 'Social Butterfly', 'Sent 50 messages', 'social', 'common', 'messages_sent', 50, 25),
  ('community_builder', 'Community Builder', 'Created 10 threads', 'community', 'uncommon', 'threads_created', 10, 75),
  ('photo_sharer', 'Photo Sharer', 'Uploaded 25 photos', 'social', 'common', 'photos_uploaded', 25, 40),
  ('review_contributor', 'Review Contributor', 'Wrote 10 reviews', 'community', 'uncommon', 'reviews_written', 10, 60),
  ('point_collector', 'Point Collector', 'Earned 1000 points', 'milestone', 'rare', 'points_earned', 1000, 150),
  ('level_5', 'Level 5', 'Reached level 5', 'milestone', 'common', 'level_reached', 5, 30),
  ('level_10', 'Level 10', 'Reached level 10', 'milestone', 'uncommon', 'level_reached', 10, 75),
  ('loyal_member', 'Loyal Member', 'Active for 30 days', 'milestone', 'rare', 'days_active', 30, 100)
ON CONFLICT (name) DO NOTHING;

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_stats_updated_at
  BEFORE UPDATE ON public.user_stats
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_achievements_updated_at
  BEFORE UPDATE ON public.user_achievements
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
