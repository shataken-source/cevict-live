-- Fishing License System - Database Schema
-- License purchase, storage, and captain verification

-- Fishing Licenses Table
CREATE TABLE IF NOT EXISTS public.fishing_licenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  license_number TEXT NOT NULL UNIQUE,
  state_code TEXT NOT NULL CHECK (state_code IN ('TX', 'LA', 'MS', 'AL', 'FL')),
  license_type TEXT NOT NULL CHECK (license_type IN ('saltwater', 'freshwater', 'all_water')),
  resident_status TEXT NOT NULL CHECK (resident_status IN ('resident', 'nonResident')),
  duration TEXT NOT NULL CHECK (duration IN ('day', '3day', '7day', 'annual')),
  guest_name TEXT NOT NULL,
  guest_email TEXT NOT NULL,
  guest_phone TEXT,
  date_of_birth DATE,
  address_street TEXT,
  address_city TEXT,
  address_state TEXT,
  address_zip TEXT,
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expiration_date DATE NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  stripe_payment_intent_id TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'expired', 'revoked', 'pending')),
  email_sent BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fishing_licenses_user_id ON public.fishing_licenses(user_id);
CREATE INDEX IF NOT EXISTS idx_fishing_licenses_booking_id ON public.fishing_licenses(booking_id);
CREATE INDEX IF NOT EXISTS idx_fishing_licenses_license_number ON public.fishing_licenses(license_number);
CREATE INDEX IF NOT EXISTS idx_fishing_licenses_state_code ON public.fishing_licenses(state_code);
CREATE INDEX IF NOT EXISTS idx_fishing_licenses_status ON public.fishing_licenses(status);
CREATE INDEX IF NOT EXISTS idx_fishing_licenses_expiration_date ON public.fishing_licenses(expiration_date);

-- License Verifications Table (Captain verification records)
CREATE TABLE IF NOT EXISTS public.license_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  license_id UUID REFERENCES public.fishing_licenses(id) ON DELETE CASCADE,
  license_number TEXT NOT NULL,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  captain_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  verified_at TIMESTAMPTZ DEFAULT NOW(),
  valid BOOLEAN DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_license_verifications_license_id ON public.license_verifications(license_id);
CREATE INDEX IF NOT EXISTS idx_license_verifications_license_number ON public.license_verifications(license_number);
CREATE INDEX IF NOT EXISTS idx_license_verifications_booking_id ON public.license_verifications(booking_id);
CREATE INDEX IF NOT EXISTS idx_license_verifications_captain_id ON public.license_verifications(captain_id);

-- RLS Policies for fishing_licenses
ALTER TABLE public.fishing_licenses ENABLE ROW LEVEL SECURITY;

-- Users can view own licenses
CREATE POLICY "Users view own licenses" ON public.fishing_licenses
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert own licenses
CREATE POLICY "Users create own licenses" ON public.fishing_licenses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Service role can manage all licenses
CREATE POLICY "Service role manages licenses" ON public.fishing_licenses
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- RLS Policies for license_verifications
ALTER TABLE public.license_verifications ENABLE ROW LEVEL SECURITY;

-- Captains can view verifications for their bookings
CREATE POLICY "Captains view own verifications" ON public.license_verifications
  FOR SELECT USING (auth.uid() = captain_id);

-- Captains can create verifications
CREATE POLICY "Captains create verifications" ON public.license_verifications
  FOR INSERT WITH CHECK (auth.uid() = captain_id);

-- Admins can view all verifications
CREATE POLICY "Admins view all verifications" ON public.license_verifications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Function to generate license number
CREATE OR REPLACE FUNCTION public.generate_license_number(
  p_state_code TEXT,
  p_year INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER
)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_sequence INTEGER;
  v_license_number TEXT;
BEGIN
  -- Get next sequence number for this state/year
  SELECT COALESCE(MAX(CAST(SUBSTRING(license_number FROM '\d+$') AS INTEGER)), 0) + 1
  INTO v_sequence
  FROM public.fishing_licenses
  WHERE state_code = p_state_code
    AND license_number LIKE p_state_code || '-' || p_year || '-%';
  
  -- Format: XX-YYYY-NNNNNN
  v_license_number := p_state_code || '-' || p_year || '-' || LPAD(v_sequence::TEXT, 6, '0');
  
  RETURN v_license_number;
END;
$$;

-- Function to calculate expiration date
CREATE OR REPLACE FUNCTION public.calculate_license_expiration(
  p_issue_date DATE,
  p_duration TEXT
)
RETURNS DATE
LANGUAGE plpgsql
AS $$
BEGIN
  CASE p_duration
    WHEN 'day' THEN
      RETURN p_issue_date + INTERVAL '1 day';
    WHEN '3day' THEN
      RETURN p_issue_date + INTERVAL '3 days';
    WHEN '7day' THEN
      RETURN p_issue_date + INTERVAL '7 days';
    WHEN 'annual' THEN
      RETURN p_issue_date + INTERVAL '1 year';
    ELSE
      RETURN p_issue_date + INTERVAL '1 day';
  END CASE;
END;
$$;
