-- Shared Users Table
-- Extends Supabase Auth (auth.users) with cross-platform metadata
-- Links to auth.users.id - does NOT replace authentication
-- This is the foundation for SSO and cross-platform features

-- Ensure extensions are available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Shared Users table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.shared_users (
  -- Link to Supabase Auth
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Email (denormalized from auth.users for easier queries)
  email VARCHAR(255) UNIQUE NOT NULL,
  
  -- Profile (basic info)
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  phone VARCHAR(20),
  avatar_url TEXT,
  
  -- Preferences
  home_location VARCHAR(255),
  preferred_currency VARCHAR(3) DEFAULT 'USD',
  notification_preferences JSONB DEFAULT '{}',
  
  -- Platform activity tracking
  gcc_active BOOLEAN DEFAULT false, -- Has used GulfCoastCharters
  wtv_active BOOLEAN DEFAULT false, -- Has used WhereToVacation
  last_gcc_activity TIMESTAMPTZ,
  last_wtv_activity TIMESTAMPTZ,
  
  -- Loyalty (links to loyalty_transactions table we just created)
  total_points INTEGER DEFAULT 0, -- Denormalized for quick access
  loyalty_tier VARCHAR(50) DEFAULT 'bronze' CHECK (loyalty_tier IN ('bronze', 'silver', 'gold', 'platinum')),
  
  -- Platform tracking
  primary_platform VARCHAR(20) CHECK (primary_platform IN ('gcc', 'wtv')),
  signup_source VARCHAR(50), -- Where they first signed up
  signup_platform VARCHAR(20) CHECK (signup_platform IN ('gcc', 'wtv')),
  
  -- Verification status (denormalized from auth.users)
  email_verified BOOLEAN DEFAULT false,
  phone_verified BOOLEAN DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login TIMESTAMPTZ
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_shared_users_email ON public.shared_users(email);
CREATE INDEX IF NOT EXISTS idx_shared_users_gcc_active ON public.shared_users(gcc_active) WHERE gcc_active = true;
CREATE INDEX IF NOT EXISTS idx_shared_users_wtv_active ON public.shared_users(wtv_active) WHERE wtv_active = true;
CREATE INDEX IF NOT EXISTS idx_shared_users_loyalty_tier ON public.shared_users(loyalty_tier);
CREATE INDEX IF NOT EXISTS idx_shared_users_primary_platform ON public.shared_users(primary_platform);

-- Enable RLS
ALTER TABLE public.shared_users ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own profile
DROP POLICY IF EXISTS "Users can read own profile" ON public.shared_users;
CREATE POLICY "Users can read own profile"
  ON public.shared_users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Policy: Users can update their own profile
DROP POLICY IF EXISTS "Users can update own profile" ON public.shared_users;
CREATE POLICY "Users can update own profile"
  ON public.shared_users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Policy: Service role can do everything (for API operations)
DROP POLICY IF EXISTS "Service role full access" ON public.shared_users;
CREATE POLICY "Service role full access"
  ON public.shared_users
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_shared_users_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS trigger_shared_users_updated_at ON public.shared_users;
CREATE TRIGGER trigger_shared_users_updated_at
  BEFORE UPDATE ON public.shared_users
  FOR EACH ROW
  EXECUTE FUNCTION public.update_shared_users_updated_at();

-- Function to sync email from auth.users (can be called after user creation)
CREATE OR REPLACE FUNCTION public.sync_shared_user_from_auth()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insert or update shared_users when auth.users is created/updated
  INSERT INTO public.shared_users (id, email, email_verified, created_at)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.email_confirmed_at IS NOT NULL,
    NEW.created_at
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    email = NEW.email,
    email_verified = NEW.email_confirmed_at IS NOT NULL,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$;

-- Function to calculate loyalty tier from points
CREATE OR REPLACE FUNCTION public.update_loyalty_tier(p_user_id UUID)
RETURNS VARCHAR(50)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_points INTEGER;
  new_tier VARCHAR(50);
BEGIN
  -- Get current points from loyalty_transactions
  SELECT COALESCE(SUM(points), 0) INTO current_points
  FROM public.loyalty_transactions
  WHERE user_id = p_user_id
    AND is_reversed = false
    AND (expires_at IS NULL OR expires_at > NOW());
  
  -- Determine tier
  IF current_points >= 10000 THEN
    new_tier := 'platinum';
  ELSIF current_points >= 5000 THEN
    new_tier := 'gold';
  ELSIF current_points >= 2500 THEN
    new_tier := 'silver';
  ELSE
    new_tier := 'bronze';
  END IF;
  
  -- Update shared_users
  UPDATE public.shared_users
  SET 
    total_points = current_points,
    loyalty_tier = new_tier,
    updated_at = NOW()
  WHERE id = p_user_id;
  
  RETURN new_tier;
END;
$$;

-- Comments for documentation
COMMENT ON TABLE public.shared_users IS 'Cross-platform user metadata extending Supabase Auth (auth.users)';
COMMENT ON COLUMN public.shared_users.id IS 'References auth.users(id) - same ID as Supabase Auth';
COMMENT ON COLUMN public.shared_users.total_points IS 'Denormalized from loyalty_transactions for quick access';
COMMENT ON FUNCTION public.sync_shared_user_from_auth() IS 'Syncs shared_users when auth.users is created/updated';
COMMENT ON FUNCTION public.update_loyalty_tier(UUID) IS 'Calculates and updates loyalty tier based on points balance';
