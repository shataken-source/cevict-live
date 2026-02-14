-- Biometric Authentication System Migration
-- Creates tables for WebAuthn/Passkey authentication

-- Create webauthn_credentials table if not exists
CREATE TABLE IF NOT EXISTS webauthn_credentials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  credential_id TEXT UNIQUE NOT NULL,
  public_key TEXT NOT NULL,
  device_name TEXT,
  device_type TEXT,
  user_agent TEXT,
  counter BIGINT DEFAULT 0,
  transports TEXT[],
  authenticator_attachment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT webauthn_credentials_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_webauthn_user_id ON webauthn_credentials(user_id);
CREATE INDEX IF NOT EXISTS idx_webauthn_credential_id ON webauthn_credentials(credential_id);
CREATE INDEX IF NOT EXISTS idx_webauthn_last_used ON webauthn_credentials(last_used_at DESC);

-- Create webauthn_challenges table for temporary challenge storage
CREATE TABLE IF NOT EXISTS webauthn_challenges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  challenge TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '5 minutes'),
  used BOOLEAN DEFAULT FALSE
);

-- Create index for challenge lookup
CREATE INDEX IF NOT EXISTS idx_webauthn_challenges_user ON webauthn_challenges(user_id);
CREATE INDEX IF NOT EXISTS idx_webauthn_challenges_expires ON webauthn_challenges(expires_at);

-- Create function to clean up expired challenges
CREATE OR REPLACE FUNCTION cleanup_expired_challenges()
RETURNS void AS $$
BEGIN
  DELETE FROM webauthn_challenges
  WHERE expires_at < NOW() OR used = TRUE;
END;
$$ LANGUAGE plpgsql;

-- Create biometric_auth_logs table for security auditing
CREATE TABLE IF NOT EXISTS biometric_auth_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  credential_id TEXT,
  action TEXT NOT NULL, -- 'register', 'authenticate', 'delete'
  success BOOLEAN NOT NULL,
  ip_address INET,
  user_agent TEXT,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for audit logs
CREATE INDEX IF NOT EXISTS idx_biometric_logs_user ON biometric_auth_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_biometric_logs_created ON biometric_auth_logs(created_at DESC);

-- Enable Row Level Security
ALTER TABLE webauthn_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE webauthn_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE biometric_auth_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for webauthn_credentials
CREATE POLICY "Users can view their own credentials"
  ON webauthn_credentials FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own credentials"
  ON webauthn_credentials FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own credentials"
  ON webauthn_credentials FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own credentials"
  ON webauthn_credentials FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for webauthn_challenges
CREATE POLICY "Users can view their own challenges"
  ON webauthn_challenges FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own challenges"
  ON webauthn_challenges FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for biometric_auth_logs
CREATE POLICY "Users can view their own auth logs"
  ON biometric_auth_logs FOR SELECT
  USING (auth.uid() = user_id);

-- Grant permissions
GRANT ALL ON webauthn_credentials TO authenticated;
GRANT ALL ON webauthn_challenges TO authenticated;
GRANT SELECT ON biometric_auth_logs TO authenticated;

-- Comments for documentation
COMMENT ON TABLE webauthn_credentials IS 'Stores WebAuthn/Passkey credentials for biometric authentication';
COMMENT ON TABLE webauthn_challenges IS 'Temporary storage for WebAuthn challenges during registration/authentication';
COMMENT ON TABLE biometric_auth_logs IS 'Audit log for biometric authentication events';

-- Create view for user's active biometric devices
CREATE OR REPLACE VIEW user_biometric_devices AS
SELECT 
  wc.id,
  wc.user_id,
  wc.credential_id,
  wc.device_name,
  wc.device_type,
  wc.created_at,
  wc.last_used_at,
  COUNT(bal.id) as total_uses
FROM webauthn_credentials wc
LEFT JOIN biometric_auth_logs bal ON bal.credential_id = wc.credential_id AND bal.success = TRUE
GROUP BY wc.id, wc.user_id, wc.credential_id, wc.device_name, wc.device_type, wc.created_at, wc.last_used_at;

GRANT SELECT ON user_biometric_devices TO authenticated;
