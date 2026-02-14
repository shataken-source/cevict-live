-- ═══════════════════════════════════════════════════════════════════════════
-- USER AUTHENTICATION SYSTEM
-- Supports Email/Password + OAuth (Facebook, Google)
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Create users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Basic Info
  email TEXT UNIQUE,
  email_verified BOOLEAN DEFAULT FALSE,
  phone TEXT,
  phone_verified BOOLEAN DEFAULT FALSE,
  
  -- Profile
  display_name TEXT,
  first_name TEXT,
  last_name TEXT,
  avatar_url TEXT,
  
  -- Password Auth (optional - null if using OAuth only)
  password_hash TEXT,
  
  -- Role
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin', 'shelter', 'officer', 'volunteer')),
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  last_login_at TIMESTAMPTZ,
  login_count INTEGER DEFAULT 0,
  
  -- Location (for features like Camera Watch)
  home_lat DECIMAL(10, 8),
  home_lon DECIMAL(11, 8),
  home_city TEXT,
  home_state TEXT,
  home_zip TEXT,
  
  -- Preferences
  notification_preferences JSONB DEFAULT '{"email": true, "sms": false, "push": true}'::JSONB,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create oauth_accounts table (supports multiple providers per user)
CREATE TABLE IF NOT EXISTS oauth_accounts (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- OAuth Provider Details
  provider TEXT NOT NULL CHECK (provider IN ('facebook', 'google', 'apple')),
  provider_account_id TEXT NOT NULL, -- Facebook ID, Google ID, etc.
  provider_email TEXT,
  
  -- Tokens (encrypted in production)
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  
  -- Provider Profile Data
  provider_data JSONB, -- Raw profile data from provider
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Each provider account can only link to one user
  UNIQUE(provider, provider_account_id)
);

-- 3. Create user_sessions table
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Session Data
  token_hash TEXT NOT NULL UNIQUE,
  ip_address TEXT,
  user_agent TEXT,
  device_type TEXT,
  
  -- Validity
  expires_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create password_reset_tokens table
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Create email_verification_tokens table
CREATE TABLE IF NOT EXISTS email_verification_tokens (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);

CREATE INDEX IF NOT EXISTS idx_oauth_accounts_user_id ON oauth_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_oauth_accounts_provider ON oauth_accounts(provider, provider_account_id);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires ON user_sessions(expires_at);

-- 7. Update timestamp trigger
CREATE OR REPLACE FUNCTION update_user_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS users_updated_at ON users;
CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_user_timestamp();

DROP TRIGGER IF EXISTS oauth_accounts_updated_at ON oauth_accounts;
CREATE TRIGGER oauth_accounts_updated_at
  BEFORE UPDATE ON oauth_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_user_timestamp();

-- 8. Function to update login stats
CREATE OR REPLACE FUNCTION update_login_stats()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE users 
  SET last_login_at = NOW(), 
      login_count = login_count + 1
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS session_created_trigger ON user_sessions;
CREATE TRIGGER session_created_trigger
  AFTER INSERT ON user_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_login_stats();

-- 9. Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE oauth_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_verification_tokens ENABLE ROW LEVEL SECURITY;

-- 10. Service role access
CREATE POLICY "Service role full access to users"
  ON users FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY "Service role full access to oauth_accounts"
  ON oauth_accounts FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY "Service role full access to user_sessions"
  ON user_sessions FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY "Service role full access to password_reset_tokens"
  ON password_reset_tokens FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

CREATE POLICY "Service role full access to email_verification_tokens"
  ON email_verification_tokens FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

-- 11. Users can read their own data
CREATE POLICY "Users can read own data"
  ON users FOR SELECT TO authenticated
  USING (id = auth.uid());

-- 12. Function to clean up expired sessions (run periodically)
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM user_sessions 
  WHERE expires_at < NOW() OR is_active = FALSE;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- 13. Function to find or create user from OAuth
CREATE OR REPLACE FUNCTION find_or_create_oauth_user(
  p_provider TEXT,
  p_provider_account_id TEXT,
  p_email TEXT,
  p_display_name TEXT,
  p_first_name TEXT,
  p_last_name TEXT,
  p_avatar_url TEXT,
  p_access_token TEXT,
  p_provider_data JSONB
) RETURNS UUID AS $$
DECLARE
  v_user_id UUID;
  v_existing_oauth oauth_accounts%ROWTYPE;
BEGIN
  -- Check if OAuth account already exists
  SELECT * INTO v_existing_oauth 
  FROM oauth_accounts 
  WHERE provider = p_provider AND provider_account_id = p_provider_account_id;
  
  IF FOUND THEN
    -- Update tokens and return existing user
    UPDATE oauth_accounts SET
      access_token = p_access_token,
      provider_data = p_provider_data,
      updated_at = NOW()
    WHERE id = v_existing_oauth.id;
    
    RETURN v_existing_oauth.user_id;
  END IF;
  
  -- Check if user with this email exists
  SELECT id INTO v_user_id FROM users WHERE email = p_email;
  
  IF NOT FOUND THEN
    -- Create new user
    INSERT INTO users (email, email_verified, display_name, first_name, last_name, avatar_url)
    VALUES (p_email, TRUE, p_display_name, p_first_name, p_last_name, p_avatar_url)
    RETURNING id INTO v_user_id;
  END IF;
  
  -- Link OAuth account to user
  INSERT INTO oauth_accounts (user_id, provider, provider_account_id, provider_email, access_token, provider_data)
  VALUES (v_user_id, p_provider, p_provider_account_id, p_email, p_access_token, p_provider_data);
  
  RETURN v_user_id;
END;
$$ LANGUAGE plpgsql;

