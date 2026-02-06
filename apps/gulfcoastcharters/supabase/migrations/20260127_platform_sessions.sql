-- Platform Sessions Table
-- Tracks SSO sessions across GCC and WTV platforms
-- This is the simplest cross-platform table to start with

-- Ensure extensions are available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Platform Sessions table
CREATE TABLE IF NOT EXISTS public.platform_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL, -- References auth.users(id) via Supabase Auth
  platform VARCHAR(20) NOT NULL CHECK (platform IN ('gcc', 'wtv', 'both')),
  session_token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_accessed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT,
  is_active BOOLEAN DEFAULT true
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_platform_sessions_user_id ON public.platform_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_platform_sessions_session_token ON public.platform_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_platform_sessions_expires_at ON public.platform_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_platform_sessions_platform ON public.platform_sessions(platform);
CREATE INDEX IF NOT EXISTS idx_platform_sessions_active ON public.platform_sessions(is_active) WHERE is_active = true;

-- Enable RLS
ALTER TABLE public.platform_sessions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own sessions
DROP POLICY IF EXISTS "Users can read own sessions" ON public.platform_sessions;
CREATE POLICY "Users can read own sessions"
  ON public.platform_sessions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy: Service role can do everything (for API operations)
DROP POLICY IF EXISTS "Service role full access" ON public.platform_sessions;
CREATE POLICY "Service role full access"
  ON public.platform_sessions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Function to clean up expired sessions (can be called by cron)
CREATE OR REPLACE FUNCTION public.cleanup_expired_sessions()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.platform_sessions
  WHERE expires_at < NOW() OR is_active = false;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- Comment for documentation
COMMENT ON TABLE public.platform_sessions IS 'Tracks SSO sessions across GCC and WTV platforms';
COMMENT ON COLUMN public.platform_sessions.platform IS 'Platform where session was created: gcc, wtv, or both';
COMMENT ON COLUMN public.platform_sessions.session_token IS 'Unique session token (JWT or similar)';
COMMENT ON FUNCTION public.cleanup_expired_sessions() IS 'Removes expired and inactive sessions';
