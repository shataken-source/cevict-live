-- Custom @gulfcoastcharters.com Email System
-- Users and captains can purchase professional email addresses

CREATE TABLE IF NOT EXISTS custom_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  email_address TEXT NOT NULL UNIQUE,         -- full address: captain.john@gulfcoastcharters.com
  email_prefix TEXT NOT NULL,                 -- just the prefix: captain.john
  user_type TEXT NOT NULL DEFAULT 'customer', -- 'captain' | 'customer'
  payment_method TEXT NOT NULL DEFAULT 'cash', -- 'cash' | 'points' | 'prize' | 'referral'
  amount_paid DECIMAL(10,2) DEFAULT 0,        -- USD if cash
  points_spent INTEGER DEFAULT 0,             -- if points
  forward_to_email TEXT NOT NULL,             -- where mail gets forwarded
  is_active BOOLEAN DEFAULT true,
  subscription_tier TEXT DEFAULT 'basic',      -- 'basic' | 'pro' | 'premium'
  purchased_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,                     -- null = never expires, or annual renewal
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Email aliases for Pro/Premium subscribers
CREATE TABLE IF NOT EXISTS email_aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  custom_email_id UUID NOT NULL REFERENCES custom_emails(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  alias_address TEXT NOT NULL UNIQUE,          -- sales@gulfcoastcharters.com
  forward_to TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_custom_emails_user ON custom_emails(user_id);
CREATE INDEX IF NOT EXISTS idx_custom_emails_prefix ON custom_emails(email_prefix);
CREATE INDEX IF NOT EXISTS idx_custom_emails_active ON custom_emails(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_email_aliases_user ON email_aliases(user_id);
CREATE INDEX IF NOT EXISTS idx_email_aliases_custom ON email_aliases(custom_email_id);

-- Enforce: max 1 active custom email per (user_id, user_type)
CREATE UNIQUE INDEX IF NOT EXISTS idx_custom_emails_one_per_type
  ON custom_emails(user_id, user_type) WHERE is_active = true;
