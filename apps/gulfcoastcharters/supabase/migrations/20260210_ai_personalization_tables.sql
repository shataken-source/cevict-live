-- AI Personalization: tables used by PersonalizedHomepage, UserInterestsManager, SmartSearchBar
-- (ai-personalization-engine is an edge function; interest_notifications + scanner not implemented)

-- One row per user: interests array
CREATE TABLE IF NOT EXISTS public.user_interests (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  interests JSONB DEFAULT '[]',
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Search history for autocomplete / personalization
CREATE TABLE IF NOT EXISTS public.user_searches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  query TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_searches_user_id ON public.user_searches(user_id);
CREATE INDEX IF NOT EXISTS idx_user_searches_created_at ON public.user_searches(created_at DESC);

-- Activity for "recently viewed" and recommendation input
CREATE TABLE IF NOT EXISTS public.user_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  charter_id UUID,
  activity_type TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_activity_user_id ON public.user_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_created_at ON public.user_activity(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_activity_type ON public.user_activity(activity_type);

ALTER TABLE public.user_interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_activity ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_interests_own" ON public.user_interests;
CREATE POLICY "user_interests_own" ON public.user_interests FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_searches_own" ON public.user_searches;
CREATE POLICY "user_searches_own" ON public.user_searches FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_activity_own" ON public.user_activity;
CREATE POLICY "user_activity_own" ON public.user_activity FOR ALL USING (auth.uid() = user_id);
