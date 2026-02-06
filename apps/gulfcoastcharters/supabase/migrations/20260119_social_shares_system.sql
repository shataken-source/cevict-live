-- Social Shares System - Database Schema
-- Tracks social media shares for analytics and viral growth

-- Social Shares Table
CREATE TABLE IF NOT EXISTS public.social_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  share_type TEXT NOT NULL CHECK (share_type IN ('avatar', 'achievement', 'catch', 'booking', 'review')),
  platform TEXT NOT NULL,
  share_url TEXT NOT NULL,
  image_url TEXT,
  content_id UUID,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_social_shares_user_id ON public.social_shares(user_id);
CREATE INDEX IF NOT EXISTS idx_social_shares_created_at ON public.social_shares(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_social_shares_share_type ON public.social_shares(share_type);
CREATE INDEX IF NOT EXISTS idx_social_shares_platform ON public.social_shares(platform);

-- RLS Policies
ALTER TABLE public.social_shares ENABLE ROW LEVEL SECURITY;

-- Users can view own shares
CREATE POLICY "Users view own shares" ON public.social_shares
  FOR SELECT USING (auth.uid() = user_id);

-- Users can create shares
CREATE POLICY "Users create shares" ON public.social_shares
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admins can view all shares
CREATE POLICY "Admins view all shares" ON public.social_shares
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
