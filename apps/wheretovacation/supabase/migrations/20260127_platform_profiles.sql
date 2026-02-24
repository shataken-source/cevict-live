-- Platform Profiles Tables
-- Platform-specific user profiles that extend shared_users
-- Simple tables for platform-specific data

-- Ensure extensions are available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- GCC Profiles (for Gulf Coast Charters specific data)
CREATE TABLE IF NOT EXISTS public.gcc_profiles (
  user_id UUID PRIMARY KEY REFERENCES public.shared_users(id) ON DELETE CASCADE,
  
  -- Captain status
  is_captain BOOLEAN DEFAULT false,
  captain_verified BOOLEAN DEFAULT false,
  
  -- Activity counts
  vessel_count INTEGER DEFAULT 0,
  total_bookings INTEGER DEFAULT 0,
  total_reviews_received INTEGER DEFAULT 0,
  
  -- Ratings
  average_rating DECIMAL(3, 2), -- Average of all reviews
  captain_rating DECIMAL(3, 2), -- Captain-specific rating
  
  -- Specialties (array of fishing types, etc.)
  specialties TEXT[] DEFAULT '{}',
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- WTV Profiles (for Where To Vacation specific data)
CREATE TABLE IF NOT EXISTS public.wtv_profiles (
  user_id UUID PRIMARY KEY REFERENCES public.shared_users(id) ON DELETE CASCADE,
  
  -- Property owner status
  is_property_owner BOOLEAN DEFAULT false,
  owner_verified BOOLEAN DEFAULT false,
  
  -- Activity counts
  property_count INTEGER DEFAULT 0,
  total_bookings INTEGER DEFAULT 0,
  total_reviews_received INTEGER DEFAULT 0,
  
  -- Ratings
  average_rating DECIMAL(3, 2), -- Average of all reviews
  
  -- Travel preferences (JSONB for flexibility)
  travel_preferences JSONB DEFAULT '{}',
  /* Example:
  {
    "preferred_destinations": ["gulf-shores", "orange-beach"],
    "travel_style": "family",
    "budget_range": "moderate",
    "activities": ["beach", "fishing", "dining"]
  }
  */
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for GCC Profiles
CREATE INDEX IF NOT EXISTS idx_gcc_profiles_is_captain ON public.gcc_profiles(is_captain) WHERE is_captain = true;
CREATE INDEX IF NOT EXISTS idx_gcc_profiles_captain_verified ON public.gcc_profiles(captain_verified) WHERE captain_verified = true;
CREATE INDEX IF NOT EXISTS idx_gcc_profiles_average_rating ON public.gcc_profiles(average_rating) WHERE average_rating IS NOT NULL;

-- Indexes for WTV Profiles
CREATE INDEX IF NOT EXISTS idx_wtv_profiles_is_owner ON public.wtv_profiles(is_property_owner) WHERE is_property_owner = true;
CREATE INDEX IF NOT EXISTS idx_wtv_profiles_owner_verified ON public.wtv_profiles(owner_verified) WHERE owner_verified = true;
CREATE INDEX IF NOT EXISTS idx_wtv_profiles_average_rating ON public.wtv_profiles(average_rating) WHERE average_rating IS NOT NULL;

-- Enable RLS
ALTER TABLE public.gcc_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wtv_profiles ENABLE ROW LEVEL SECURITY;

-- GCC Profiles Policies
DROP POLICY IF EXISTS "Users can read own GCC profile" ON public.gcc_profiles;
CREATE POLICY "Users can read own GCC profile"
  ON public.gcc_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own GCC profile" ON public.gcc_profiles;
CREATE POLICY "Users can update own GCC profile"
  ON public.gcc_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role full access GCC" ON public.gcc_profiles;
CREATE POLICY "Service role full access GCC"
  ON public.gcc_profiles
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- WTV Profiles Policies
DROP POLICY IF EXISTS "Users can read own WTV profile" ON public.wtv_profiles;
CREATE POLICY "Users can read own WTV profile"
  ON public.wtv_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own WTV profile" ON public.wtv_profiles;
CREATE POLICY "Users can update own WTV profile"
  ON public.wtv_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role full access WTV" ON public.wtv_profiles;
CREATE POLICY "Service role full access WTV"
  ON public.wtv_profiles
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Functions to update updated_at
CREATE OR REPLACE FUNCTION public.update_gcc_profiles_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_wtv_profiles_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS trigger_gcc_profiles_updated_at ON public.gcc_profiles;
CREATE TRIGGER trigger_gcc_profiles_updated_at
  BEFORE UPDATE ON public.gcc_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_gcc_profiles_updated_at();

DROP TRIGGER IF EXISTS trigger_wtv_profiles_updated_at ON public.wtv_profiles;
CREATE TRIGGER trigger_wtv_profiles_updated_at
  BEFORE UPDATE ON public.wtv_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_wtv_profiles_updated_at();

-- Comments for documentation
COMMENT ON TABLE public.gcc_profiles IS 'Gulf Coast Charters specific user profile data';
COMMENT ON TABLE public.wtv_profiles IS 'Where To Vacation specific user profile data';
COMMENT ON COLUMN public.gcc_profiles.specialties IS 'Array of fishing specialties (e.g., ["inshore", "offshore", "fly fishing"])';
COMMENT ON COLUMN public.wtv_profiles.travel_preferences IS 'JSONB object with travel preferences and settings';
