-- Community Engagement: Daily Check-ins, Streaks, Quests, Catch of the Day, Leaderboards

-- ═══════════════════════════════════════════════════════════════════════════
-- DAILY CHECK-INS & STREAKS
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS daily_check_ins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  check_in_date DATE NOT NULL DEFAULT CURRENT_DATE,
  streak_count INTEGER DEFAULT 1,
  streak_protected BOOLEAN DEFAULT false,    -- used a streak freeze
  points_earned INTEGER DEFAULT 0,
  bonus_type TEXT,                            -- 'milestone_3', 'milestone_7', etc.
  bonus_points INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, check_in_date)
);

CREATE INDEX IF NOT EXISTS idx_checkins_user ON daily_check_ins(user_id);
CREATE INDEX IF NOT EXISTS idx_checkins_date ON daily_check_ins(check_in_date);
CREATE INDEX IF NOT EXISTS idx_checkins_streak ON daily_check_ins(user_id, streak_count DESC);

-- ═══════════════════════════════════════════════════════════════════════════
-- QUEST SYSTEM (daily + weekly)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS quests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  quest_type TEXT NOT NULL DEFAULT 'daily',   -- 'daily', 'weekly', 'monthly', 'special'
  action_type TEXT NOT NULL,                  -- 'check_in', 'post', 'comment', 'catch_log', 'photo', 'review', 'booking', 'share', 'forum_reply', 'buddy_connect'
  target_count INTEGER NOT NULL DEFAULT 1,
  points_reward INTEGER NOT NULL DEFAULT 10,
  is_active BOOLEAN DEFAULT true,
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS quest_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  quest_id UUID NOT NULL REFERENCES quests(id) ON DELETE CASCADE,
  current_count INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  points_claimed BOOLEAN DEFAULT false,
  reset_date DATE,                            -- when daily/weekly quests reset
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, quest_id, reset_date)
);

CREATE INDEX IF NOT EXISTS idx_quest_progress_user ON quest_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_quest_progress_quest ON quest_progress(quest_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- CATCH OF THE DAY
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS catch_of_the_day (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  featured_date DATE NOT NULL UNIQUE,
  catch_id UUID,                              -- fishing_journal_entries or journal_catches id
  user_id UUID NOT NULL,
  species TEXT,
  weight_lbs DECIMAL(6,2),
  photo_url TEXT,
  location TEXT,
  description TEXT,
  votes INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS catch_of_the_day_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  catch_day_id UUID NOT NULL REFERENCES catch_of_the_day(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(catch_day_id, user_id)
);

CREATE TABLE IF NOT EXISTS catch_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  species TEXT NOT NULL,
  weight_lbs DECIMAL(6,2),
  length_inches DECIMAL(5,1),
  photo_url TEXT NOT NULL,
  location TEXT,
  lat DECIMAL(10,8),
  lon DECIMAL(11,8),
  bait_used TEXT,
  notes TEXT,
  submitted_date DATE DEFAULT CURRENT_DATE,
  approved BOOLEAN DEFAULT false,
  points_awarded INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_catch_submissions_date ON catch_submissions(submitted_date);
CREATE INDEX IF NOT EXISTS idx_catch_submissions_user ON catch_submissions(user_id);
CREATE INDEX IF NOT EXISTS idx_cotd_date ON catch_of_the_day(featured_date);

-- ═══════════════════════════════════════════════════════════════════════════
-- SEED: Default quests
-- ═══════════════════════════════════════════════════════════════════════════

INSERT INTO quests (title, description, quest_type, action_type, target_count, points_reward) VALUES
-- Daily quests
('Daily Check-In', 'Check in today to earn points and keep your streak alive', 'daily', 'check_in', 1, 5),
('Share a Catch', 'Log a catch with a photo', 'daily', 'catch_log', 1, 25),
('Community Contributor', 'Post or reply in the forums', 'daily', 'forum_reply', 1, 10),
('React & Engage', 'Like or comment on 3 feed posts', 'daily', 'comment', 3, 10),
-- Weekly quests
('Review Master', 'Leave 3 reviews this week', 'weekly', 'review', 3, 100),
('Photo Collector', 'Upload 5 photos this week', 'weekly', 'photo', 5, 75),
('Social Butterfly', 'Post 10 messages this week', 'weekly', 'post', 10, 150),
('Fishing Reporter', 'Submit 3 catch reports this week', 'weekly', 'catch_log', 3, 125),
('Buddy Builder', 'Connect with 2 fishing buddies this week', 'weekly', 'buddy_connect', 2, 80)
ON CONFLICT DO NOTHING;
