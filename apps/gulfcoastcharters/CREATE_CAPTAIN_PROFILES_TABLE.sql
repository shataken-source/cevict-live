-- Create captain_profiles table
-- Run this in Supabase SQL Editor
-- This script is idempotent - safe to run multiple times

-- Step 1: Ensure profiles table exists (captain_profiles references it)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    phone TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 2: Create captain_profiles table
CREATE TABLE IF NOT EXISTS public.captain_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
    
    -- License & Verification
    license_number TEXT,
    license_expiry DATE,
    is_verified BOOLEAN DEFAULT FALSE,
    
    -- Experience
    years_experience INTEGER,
    
    -- Boat Info
    boat_name TEXT,
    boat_type TEXT,
    boat_capacity INTEGER,
    boat_length DECIMAL(10,2),
    
    -- Location
    home_port TEXT,
    service_area TEXT[],
    
    -- Pricing
    hourly_rate DECIMAL(10,2),
    half_day_rate DECIMAL(10,2),
    full_day_rate DECIMAL(10,2),
    
    -- Specialties & Languages
    specialties TEXT[] DEFAULT ARRAY[]::TEXT[],
    languages TEXT[] DEFAULT ARRAY['English']::TEXT[],
    
    -- Ratings & Stats
    rating DECIMAL(3,2) DEFAULT 0.00,
    total_reviews INTEGER DEFAULT 0,
    total_trips INTEGER DEFAULT 0,
    
    -- Status
    status TEXT DEFAULT 'active',
    
    -- Bio
    bio TEXT,
    location TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 3: Add status constraint if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'captain_profiles_status_check'
    ) THEN
        ALTER TABLE public.captain_profiles
        ADD CONSTRAINT captain_profiles_status_check 
        CHECK (status IN ('active', 'inactive', 'suspended'));
    END IF;
END $$;

-- Step 4: Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_captain_profiles_user_id ON public.captain_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_captain_profiles_status ON public.captain_profiles(status);

-- Step 5: Enable Row Level Security
ALTER TABLE public.captain_profiles ENABLE ROW LEVEL SECURITY;

-- Step 6: Create/update RLS Policies
DROP POLICY IF EXISTS "captain_profiles_public_read" ON public.captain_profiles;
CREATE POLICY "captain_profiles_public_read"
  ON public.captain_profiles
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "captain_profiles_owner_update" ON public.captain_profiles;
CREATE POLICY "captain_profiles_owner_update"
  ON public.captain_profiles
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "captain_profiles_owner_insert" ON public.captain_profiles;
CREATE POLICY "captain_profiles_owner_insert"
  ON public.captain_profiles
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Step 7: Create function to update updated_at timestamp (if it doesn't exist)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 8: Create trigger for updated_at
DROP TRIGGER IF EXISTS trg_captain_profiles_updated_at ON public.captain_profiles;
CREATE TRIGGER trg_captain_profiles_updated_at
BEFORE UPDATE ON public.captain_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ captain_profiles table created successfully!';
    RAISE NOTICE '✅ You can now create a captain profile for your user.';
END $$;
