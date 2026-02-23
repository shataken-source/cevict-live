-- User profiles table — stores tier overrides and subscription state
-- Tier is set by: (1) manual override here, (2) Stripe webhook on subscription

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  tier TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'pro', 'elite')),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  subscription_status TEXT DEFAULT 'inactive',
  manual_override BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer ON profiles(stripe_customer_id);

-- Grant shataken@gmail.com elite access (manual override — bypasses Stripe check)
INSERT INTO profiles (email, tier, manual_override)
VALUES ('shataken@gmail.com', 'elite', true)
ON CONFLICT (email) DO UPDATE
  SET tier = 'elite',
      manual_override = true,
      updated_at = now();
