-- Gamification System Tables
-- Daily check-ins, streaks, quests, and achievements

-- Daily Check-Ins Table
CREATE TABLE IF NOT EXISTS public.daily_check_ins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_check_in DATE NOT NULL,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  total_check_ins INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_daily_check_ins_user_id ON public.daily_check_ins(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_check_ins_streak ON public.daily_check_ins(current_streak DESC);

-- Quest Progress Table
CREATE TABLE IF NOT EXISTS public.quest_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quest_id TEXT NOT NULL,
  quest_type TEXT NOT NULL CHECK (quest_type IN ('daily', 'weekly', 'special')),
  progress INTEGER DEFAULT 0,
  target INTEGER NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, quest_id, quest_type)
);

CREATE INDEX IF NOT EXISTS idx_quest_progress_user_id ON public.quest_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_quest_progress_quest_id ON public.quest_progress(quest_id);
CREATE INDEX IF NOT EXISTS idx_quest_progress_completed ON public.quest_progress(completed);

-- Quest Rewards Table (tracks claimed rewards)
CREATE TABLE IF NOT EXISTS public.quest_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quest_id TEXT NOT NULL,
  points_awarded INTEGER NOT NULL,
  claimed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, quest_id)
);

CREATE INDEX IF NOT EXISTS idx_quest_rewards_user_id ON public.quest_rewards(user_id);

-- Achievement Progress Table
CREATE TABLE IF NOT EXISTS public.achievement_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id TEXT NOT NULL,
  progress INTEGER DEFAULT 0,
  target INTEGER NOT NULL,
  unlocked BOOLEAN DEFAULT FALSE,
  unlocked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, achievement_id)
);

CREATE INDEX IF NOT EXISTS idx_achievement_progress_user_id ON public.achievement_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_achievement_progress_unlocked ON public.achievement_progress(unlocked);

-- Point Transactions Table (if not exists)
CREATE TABLE IF NOT EXISTS public.point_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  points INTEGER NOT NULL,
  transaction_type TEXT NOT NULL,
  reference_id TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_point_transactions_user_id ON public.point_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_point_transactions_created_at ON public.point_transactions(created_at DESC);

-- RLS Policies
ALTER TABLE public.daily_check_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quest_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quest_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievement_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.point_transactions ENABLE ROW LEVEL SECURITY;

-- Users can read their own data
CREATE POLICY "Users can view own check-ins" ON public.daily_check_ins
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own quest progress" ON public.quest_progress
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own quest rewards" ON public.quest_rewards
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own achievements" ON public.achievement_progress
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can view own point transactions" ON public.point_transactions
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert/update their own data
CREATE POLICY "Users can update own check-ins" ON public.daily_check_ins
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can update own quest progress" ON public.quest_progress
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can claim own quest rewards" ON public.quest_rewards
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own achievements" ON public.achievement_progress
  FOR ALL USING (auth.uid() = user_id);

-- Functions for points calculation
CREATE OR REPLACE FUNCTION get_user_points(user_uuid UUID)
RETURNS INTEGER AS $$
  SELECT COALESCE(SUM(points), 0)::INTEGER
  FROM public.point_transactions
  WHERE user_id = user_uuid;
$$ LANGUAGE SQL SECURITY DEFINER;

CREATE OR REPLACE FUNCTION award_points(
  user_uuid UUID,
  points_amount INTEGER,
  trans_type TEXT,
  reference_id TEXT DEFAULT NULL,
  description TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.point_transactions (
    user_id, points, transaction_type, reference_id, description
  ) VALUES (
    user_uuid, points_amount, trans_type, reference_id, description
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
