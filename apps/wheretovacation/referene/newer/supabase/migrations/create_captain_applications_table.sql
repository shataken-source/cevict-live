-- Create captain_applications table for GCC
-- This table stores captain application forms submitted through the website

CREATE TABLE IF NOT EXISTS public.captain_applications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Basic information
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  location TEXT,

  -- Credentials
  uscg_license TEXT,
  years_experience INTEGER DEFAULT 0,
  specialties TEXT[], -- Array of specialties
  bio TEXT,

  -- Boat information (if claiming an existing boat)
  boat_name TEXT,
  boat_id UUID, -- References scraped_boats.id if claiming

  -- Insurance information
  insurance_provider TEXT,
  insurance_coverage TEXT,
  insurance_policy_number TEXT,

  -- Application status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'approved', 'rejected')),
  admin_notes TEXT,
  reviewed_by UUID, -- References auth.users.id
  reviewed_at TIMESTAMPTZ,

  -- Additional verification info
  verification_info TEXT, -- Additional notes from boat claim process

  -- Documents (stored as JSONB for flexibility)
  documents JSONB DEFAULT '{}',

  -- Timestamps
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_captain_applications_email ON public.captain_applications(email);
CREATE INDEX IF NOT EXISTS idx_captain_applications_status ON public.captain_applications(status);
CREATE INDEX IF NOT EXISTS idx_captain_applications_boat_id ON public.captain_applications(boat_id);
CREATE INDEX IF NOT EXISTS idx_captain_applications_created_at ON public.captain_applications(created_at DESC);

-- Create a function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_captain_applications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_captain_applications_updated_at ON public.captain_applications;
CREATE TRIGGER update_captain_applications_updated_at
  BEFORE UPDATE ON public.captain_applications
  FOR EACH ROW
  EXECUTE FUNCTION update_captain_applications_updated_at();

-- Enable Row Level Security (RLS)
ALTER TABLE public.captain_applications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to allow re-running this migration)
DROP POLICY IF EXISTS "Public can insert captain applications" ON public.captain_applications;
DROP POLICY IF EXISTS "Public can view their own applications" ON public.captain_applications;
DROP POLICY IF EXISTS "Service role can manage captain applications" ON public.captain_applications;

-- Create policies
-- Public users can insert applications (submit forms)
CREATE POLICY "Public can insert captain applications"
  ON public.captain_applications
  FOR INSERT
  WITH CHECK (true);

-- Public users can view their own applications (by email)
CREATE POLICY "Public can view their own applications"
  ON public.captain_applications
  FOR SELECT
  USING (true); -- For now, allow public read (can restrict by email later)

-- Service role can manage all applications
CREATE POLICY "Service role can manage captain applications"
  ON public.captain_applications
  FOR ALL
  WITH CHECK (true);

-- Add comment to table
COMMENT ON TABLE public.captain_applications IS 'Stores captain application forms submitted through Gulf Coast Charters website';

