-- Create SMS subscriptions table
CREATE TABLE IF NOT EXISTS sms_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number TEXT NOT NULL,
  tier TEXT NOT NULL CHECK (tier IN ('free', 'pro', 'elite')),
  active BOOLEAN DEFAULT true,
  subscribed_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  unsubscribed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(phone_number, tier)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_sms_subscriptions_active ON sms_subscriptions(active, tier);
CREATE INDEX IF NOT EXISTS idx_sms_subscriptions_phone ON sms_subscriptions(phone_number);

-- Create SMS sent logs table
CREATE TABLE IF NOT EXISTS sms_sent_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier TEXT NOT NULL CHECK (tier IN ('free', 'pro', 'elite')),
  message_type TEXT NOT NULL,
  pick_game_id TEXT,
  pick_game TEXT,
  pick TEXT,
  sent_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for logs
CREATE INDEX IF NOT EXISTS idx_sms_sent_logs_tier ON sms_sent_logs(tier, sent_at);
CREATE INDEX IF NOT EXISTS idx_sms_sent_logs_date ON sms_sent_logs(sent_at);

-- Add RLS (Row Level Security) policies if needed
-- ALTER TABLE sms_subscriptions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE sms_sent_logs ENABLE ROW LEVEL SECURITY;

