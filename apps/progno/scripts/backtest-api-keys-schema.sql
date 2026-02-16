-- PROGNO Backtesting API Keys Schema
-- Store and manage API keys for users purchasing backtesting data access

-- Table: backtest_api_keys
-- Stores API keys for users who purchase backtesting data access
CREATE TABLE IF NOT EXISTS backtest_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key TEXT UNIQUE NOT NULL,
  user_email TEXT NOT NULL,
  user_name TEXT,
  tier TEXT NOT NULL CHECK (tier IN ('basic', 'pro', 'enterprise')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'expired', 'revoked')),
  
  -- Rate limiting and usage tracking
  requests_per_day INTEGER DEFAULT 100,
  requests_used_today INTEGER DEFAULT 0,
  total_requests INTEGER DEFAULT 0,
  
  -- Access scope
  allowed_sports TEXT[] DEFAULT ARRAY['nhl', 'nba', 'nfl', 'mlb', 'ncaab', 'ncaaf', 'nascar'],
  historical_years INTEGER DEFAULT 1, -- How many years of historical data they can access
  
  -- Dates
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  
  -- Metadata
  purchase_reference TEXT, -- Stripe/payment reference
  notes TEXT
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_backtest_api_keys_key ON backtest_api_keys(api_key);
CREATE INDEX IF NOT EXISTS idx_backtest_api_keys_email ON backtest_api_keys(user_email);
CREATE INDEX IF NOT EXISTS idx_backtest_api_keys_status ON backtest_api_keys(status);

-- View: active_api_keys
-- Convenience view for only active, non-expired keys
CREATE OR REPLACE VIEW active_backtest_api_keys AS
SELECT *
FROM backtest_api_keys
WHERE status = 'active'
  AND (expires_at IS NULL OR expires_at > NOW());

-- Function: validate_backtest_api_key
-- Validates an API key and updates usage statistics
CREATE OR REPLACE FUNCTION validate_backtest_api_key(p_api_key TEXT)
RETURNS TABLE (
  valid BOOLEAN,
  key_id UUID,
  user_email TEXT,
  tier TEXT,
  requests_remaining INTEGER,
  allowed_sports TEXT[],
  historical_years INTEGER,
  message TEXT
)
LANGUAGE plpgsql
AS $$
DECLARE
  v_key_record backtest_api_keys%ROWTYPE;
  v_requests_remaining INTEGER;
BEGIN
  -- Look up the key
  SELECT * INTO v_key_record
  FROM backtest_api_keys
  WHERE api_key = p_api_key;
  
  -- Check if key exists
  IF v_key_record IS NULL THEN
    RETURN QUERY SELECT FALSE, NULL::UUID, NULL::TEXT, NULL::TEXT, NULL::INTEGER, NULL::TEXT[], NULL::INTEGER, 'Invalid API key'::TEXT;
    RETURN;
  END IF;
  
  -- Check status
  IF v_key_record.status != 'active' THEN
    RETURN QUERY SELECT FALSE, v_key_record.id, v_key_record.user_email, v_key_record.tier, 0::INTEGER, v_key_record.allowed_sports, v_key_record.historical_years, 
      CASE v_key_record.status
        WHEN 'suspended' THEN 'API key suspended'
        WHEN 'expired' THEN 'API key expired'
        WHEN 'revoked' THEN 'API key revoked'
        ELSE 'API key inactive'
      END;
    RETURN;
  END IF;
  
  -- Check expiration
  IF v_key_record.expires_at IS NOT NULL AND v_key_record.expires_at < NOW() THEN
    -- Auto-update status to expired
    UPDATE backtest_api_keys SET status = 'expired' WHERE id = v_key_record.id;
    RETURN QUERY SELECT FALSE, v_key_record.id, v_key_record.user_email, v_key_record.tier, 0::INTEGER, v_key_record.allowed_sports, v_key_record.historical_years, 'API key expired'::TEXT;
    RETURN;
  END IF;
  
  -- Check rate limit
  v_requests_remaining := v_key_record.requests_per_day - v_key_record.requests_used_today;
  IF v_requests_remaining <= 0 THEN
    RETURN QUERY SELECT FALSE, v_key_record.id, v_key_record.user_email, v_key_record.tier, 0::INTEGER, v_key_record.allowed_sports, v_key_record.historical_years, 'Daily rate limit exceeded'::TEXT;
    RETURN;
  END IF;
  
  -- Update usage statistics
  UPDATE backtest_api_keys
  SET 
    requests_used_today = requests_used_today + 1,
    total_requests = total_requests + 1,
    last_used_at = NOW()
  WHERE id = v_key_record.id;
  
  -- Return success
  RETURN QUERY SELECT 
    TRUE, 
    v_key_record.id, 
    v_key_record.user_email, 
    v_key_record.tier,
    v_requests_remaining - 1,
    v_key_record.allowed_sports,
    v_key_record.historical_years,
    'Valid'::TEXT;
END;
$$;

-- Function: reset_daily_usage
-- Resets daily usage counters (run at midnight via cron/job scheduler)
CREATE OR REPLACE FUNCTION reset_daily_api_usage()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_affected INTEGER;
BEGIN
  UPDATE backtest_api_keys
  SET requests_used_today = 0
  WHERE status = 'active';
  
  GET DIAGNOSTICS v_affected = ROW_COUNT;
  RETURN v_affected;
END;
$$;

-- Function: create_api_key
-- Helper function to generate and insert a new API key
CREATE OR REPLACE FUNCTION create_backtest_api_key(
  p_user_email TEXT,
  p_user_name TEXT,
  p_tier TEXT,
  p_historical_years INTEGER DEFAULT 1,
  p_purchase_reference TEXT DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_new_key TEXT;
BEGIN
  -- Generate a secure random API key: progno_live_ prefix + 32 random chars
  v_new_key := 'progno_live_' || encode(gen_random_bytes(24), 'hex');
  
  -- Determine limits based on tier
  INSERT INTO backtest_api_keys (
    api_key,
    user_email,
    user_name,
    tier,
    requests_per_day,
    historical_years,
    expires_at,
    purchase_reference
  ) VALUES (
    v_new_key,
    p_user_email,
    p_user_name,
    p_tier,
    CASE p_tier
      WHEN 'basic' THEN 100
      WHEN 'pro' THEN 500
      WHEN 'enterprise' THEN 5000
      ELSE 100
    END,
    p_historical_years,
    CASE p_tier
      WHEN 'basic' THEN NOW() + INTERVAL '1 year'
      WHEN 'pro' THEN NOW() + INTERVAL '2 years'
      WHEN 'enterprise' THEN NULL -- No expiration
      ELSE NOW() + INTERVAL '1 year'
    END,
    p_purchase_reference
  );
  
  RETURN v_new_key;
END;
$$;

-- Sample data (for testing - remove in production)
-- Uncomment to create a test key:
-- SELECT create_backtest_api_key('test@example.com', 'Test User', 'pro', 3, 'TEST-REF-001');
