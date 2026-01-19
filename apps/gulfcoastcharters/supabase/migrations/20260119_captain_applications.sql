-- Captain applications + basic admin review plumbing.
-- This migration is additive and safe to run on existing installs.

-- Ensure profiles has a role column (RBAC helpers use profiles.role)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user';

-- Optional CHECK constraint for role values (safe create)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_role_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_role_check CHECK (role IN ('admin', 'captain', 'user'));
  END IF;
END $$;

-- Captain applications table
CREATE TABLE IF NOT EXISTS public.captain_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  captain_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  location TEXT,

  uscg_license TEXT,
  years_experience INTEGER,
  specialties TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  bio TEXT,

  insurance_provider TEXT,
  insurance_coverage TEXT,
  insurance_policy_number TEXT,

  documents JSONB NOT NULL DEFAULT '{}'::jsonb,

  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'under_review', 'approved', 'rejected')),
  admin_notes TEXT,
  reviewed_by UUID REFERENCES public.profiles(id),
  reviewed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_captain_applications_captain_id ON public.captain_applications(captain_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_captain_applications_status ON public.captain_applications(status, created_at DESC);

-- Minimal captain_profiles table (used by public listings feed joins).
-- If you already have a richer captain_profiles table, this block is a no-op / additive.
CREATE TABLE IF NOT EXISTS public.captain_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rating NUMERIC,
  total_reviews INTEGER,
  half_day_rate NUMERIC,
  full_day_rate NUMERIC,
  specialties TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.captain_profiles
  ADD COLUMN IF NOT EXISTS rating NUMERIC;
ALTER TABLE public.captain_profiles
  ADD COLUMN IF NOT EXISTS total_reviews INTEGER;
ALTER TABLE public.captain_profiles
  ADD COLUMN IF NOT EXISTS half_day_rate NUMERIC;
ALTER TABLE public.captain_profiles
  ADD COLUMN IF NOT EXISTS full_day_rate NUMERIC;
ALTER TABLE public.captain_profiles
  ADD COLUMN IF NOT EXISTS specialties TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE public.captain_profiles
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE public.captain_profiles
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_captain_profiles_user_id ON public.captain_profiles(user_id);

DROP TRIGGER IF EXISTS trg_captain_profiles_updated_at ON public.captain_profiles;
CREATE TRIGGER trg_captain_profiles_updated_at
BEFORE UPDATE ON public.captain_profiles
FOR EACH ROW EXECUTE FUNCTION public._trg_set_updated_at();

ALTER TABLE public.captain_profiles ENABLE ROW LEVEL SECURITY;
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

DROP POLICY IF EXISTS "captain_profiles_admin_all" ON public.captain_profiles;
CREATE POLICY "captain_profiles_admin_all"
  ON public.captain_profiles
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

-- updated_at trigger
CREATE OR REPLACE FUNCTION public._trg_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_captain_applications_updated_at ON public.captain_applications;
CREATE TRIGGER trg_captain_applications_updated_at
BEFORE UPDATE ON public.captain_applications
FOR EACH ROW EXECUTE FUNCTION public._trg_set_updated_at();

-- RLS
ALTER TABLE public.captain_applications ENABLE ROW LEVEL SECURITY;

-- Applicants can create/view/update their own (while pending/under_review)
DROP POLICY IF EXISTS "captain_applications_create_own" ON public.captain_applications;
CREATE POLICY "captain_applications_create_own"
  ON public.captain_applications
  FOR INSERT
  WITH CHECK (auth.uid() = captain_id);

DROP POLICY IF EXISTS "captain_applications_view_own" ON public.captain_applications;
CREATE POLICY "captain_applications_view_own"
  ON public.captain_applications
  FOR SELECT
  USING (auth.uid() = captain_id);

DROP POLICY IF EXISTS "captain_applications_update_own_pending" ON public.captain_applications;
CREATE POLICY "captain_applications_update_own_pending"
  ON public.captain_applications
  FOR UPDATE
  USING (auth.uid() = captain_id AND status IN ('pending', 'under_review'))
  WITH CHECK (auth.uid() = captain_id AND status IN ('pending', 'under_review'));

-- Admins can manage all
DROP POLICY IF EXISTS "captain_applications_admin_all" ON public.captain_applications;
CREATE POLICY "captain_applications_admin_all"
  ON public.captain_applications
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

