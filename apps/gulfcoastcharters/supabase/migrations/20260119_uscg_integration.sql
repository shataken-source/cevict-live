-- USCG License Verification System - Database Schema
-- Tracks USCG captain license verification status

-- USCG License Verifications Table
CREATE TABLE IF NOT EXISTS public.uscg_license_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  license_number TEXT NOT NULL,
  mmr_number TEXT,
  verification_status TEXT NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified', 'failed', 'expired')),
  verified_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  verification_data JSONB,
  discrepancy_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_uscg_verifications_user_id ON public.uscg_license_verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_uscg_verifications_license_number ON public.uscg_license_verifications(license_number);
CREATE INDEX IF NOT EXISTS idx_uscg_verifications_status ON public.uscg_license_verifications(verification_status);
CREATE INDEX IF NOT EXISTS idx_uscg_verifications_expires_at ON public.uscg_license_verifications(expires_at);

-- Add USCG verification status to profiles (if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'uscg_verified') THEN
    ALTER TABLE public.profiles ADD COLUMN uscg_verified BOOLEAN DEFAULT FALSE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'uscg_license_number') THEN
    ALTER TABLE public.profiles ADD COLUMN uscg_license_number TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'uscg_mmr_number') THEN
    ALTER TABLE public.profiles ADD COLUMN uscg_mmr_number TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'uscg_verified_at') THEN
    ALTER TABLE public.profiles ADD COLUMN uscg_verified_at TIMESTAMPTZ;
  END IF;
END $$;

-- RLS Policies for uscg_license_verifications
ALTER TABLE public.uscg_license_verifications ENABLE ROW LEVEL SECURITY;

-- Users can view own verifications
CREATE POLICY "Users view own USCG verifications" ON public.uscg_license_verifications
  FOR SELECT USING (auth.uid() = user_id);

-- Service role can manage all verifications
CREATE POLICY "Service role manages USCG verifications" ON public.uscg_license_verifications
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Function to update profile USCG status
CREATE OR REPLACE FUNCTION public.update_uscg_profile_status(
  p_user_id UUID,
  p_verified BOOLEAN,
  p_verified_at TIMESTAMPTZ DEFAULT NOW()
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.profiles
  SET 
    uscg_verified = p_verified,
    uscg_verified_at = CASE WHEN p_verified THEN p_verified_at ELSE NULL END
  WHERE id = p_user_id;
END;
$$;
