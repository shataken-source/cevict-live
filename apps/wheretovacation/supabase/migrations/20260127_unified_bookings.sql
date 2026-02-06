-- Unified Bookings Table
-- Allows booking BOTH vacation rental AND boat experience in single transaction
-- Links to existing bookings tables on both platforms
-- This is the core of cross-platform package deals

-- Ensure extensions are available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Booking type enum
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'unified_booking_type_enum'
  ) THEN
    CREATE TYPE public.unified_booking_type_enum AS ENUM (
      'package',      -- Both rental and boat
      'rental_only',  -- Just vacation rental
      'boat_only'     -- Just boat/charter
    );
  END IF;
END $$;

-- Unified Bookings table
CREATE TABLE IF NOT EXISTS public.unified_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- User (references shared_users we just created)
  user_id UUID NOT NULL REFERENCES public.shared_users(id) ON DELETE CASCADE,
  
  -- Booking type
  booking_type unified_booking_type_enum NOT NULL DEFAULT 'package',
  
  -- WTV (vacation rental) booking reference
  -- Note: References WTV's bookings table (if exists) or stores direct data
  wtv_booking_id UUID, -- References bookings.id in WTV database
  wtv_property_id UUID, -- References accommodations.id in WTV
  wtv_check_in DATE,
  wtv_check_out DATE,
  wtv_guests INTEGER,
  wtv_nights INTEGER,
  wtv_total DECIMAL(10,2),
  
  -- GCC (boat/charter) booking reference
  -- Note: References GCC's bookings table (if cross-DB) or stores direct data
  gcc_booking_id UUID, -- References bookings.id in GCC database (if cross-DB) or NULL
  gcc_vessel_id UUID, -- References vessels.id in GCC
  gcc_trip_date TIMESTAMPTZ,
  gcc_duration_hours DECIMAL(5,2),
  gcc_passengers INTEGER,
  gcc_total DECIMAL(10,2),
  
  -- Combined pricing
  wtv_subtotal DECIMAL(10,2) DEFAULT 0,
  gcc_subtotal DECIMAL(10,2) DEFAULT 0,
  subtotal DECIMAL(10,2) NOT NULL, -- wtv_subtotal + gcc_subtotal
  discount_amount DECIMAL(10,2) DEFAULT 0,
  tax_amount DECIMAL(10,2) DEFAULT 0,
  total_amount DECIMAL(10,2) NOT NULL,
  
  -- Package deals
  is_package BOOLEAN DEFAULT false,
  package_discount_percent DECIMAL(5,2) DEFAULT 0, -- e.g., 15.00 for 15%
  
  -- Payment (Stripe)
  payment_status VARCHAR(50) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded', 'partial')),
  stripe_payment_intent_id TEXT,
  stripe_session_id TEXT,
  
  -- Status
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed', 'partial')),
  
  -- Metadata
  confirmation_code TEXT UNIQUE, -- e.g., "GCWV-2025-12345"
  notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_unified_bookings_user_id ON public.unified_bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_unified_bookings_booking_type ON public.unified_bookings(booking_type);
CREATE INDEX IF NOT EXISTS idx_unified_bookings_status ON public.unified_bookings(status);
CREATE INDEX IF NOT EXISTS idx_unified_bookings_payment_status ON public.unified_bookings(payment_status);
CREATE INDEX IF NOT EXISTS idx_unified_bookings_is_package ON public.unified_bookings(is_package) WHERE is_package = true;
CREATE INDEX IF NOT EXISTS idx_unified_bookings_wtv_booking ON public.unified_bookings(wtv_booking_id) WHERE wtv_booking_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_unified_bookings_gcc_booking ON public.unified_bookings(gcc_booking_id) WHERE gcc_booking_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_unified_bookings_confirmation_code ON public.unified_bookings(confirmation_code) WHERE confirmation_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_unified_bookings_created_at ON public.unified_bookings(created_at DESC);

-- Enable RLS
ALTER TABLE public.unified_bookings ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own bookings
DROP POLICY IF EXISTS "Users can read own unified bookings" ON public.unified_bookings;
CREATE POLICY "Users can read own unified bookings"
  ON public.unified_bookings
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy: Users can update their own bookings (for status changes, etc.)
DROP POLICY IF EXISTS "Users can update own unified bookings" ON public.unified_bookings;
CREATE POLICY "Users can update own unified bookings"
  ON public.unified_bookings
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Service role can do everything (for API operations)
DROP POLICY IF EXISTS "Service role full access unified" ON public.unified_bookings;
CREATE POLICY "Service role full access unified"
  ON public.unified_bookings
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_unified_bookings_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS trigger_unified_bookings_updated_at ON public.unified_bookings;
CREATE TRIGGER trigger_unified_bookings_updated_at
  BEFORE UPDATE ON public.unified_bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_unified_bookings_updated_at();

-- Function to generate confirmation code
CREATE OR REPLACE FUNCTION public.generate_unified_booking_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  year_code TEXT;
  random_part TEXT;
  code TEXT;
BEGIN
  year_code := TO_CHAR(NOW(), 'YYYY');
  random_part := UPPER(SUBSTRING(MD5(RANDOM()::TEXT || NOW()::TEXT) FROM 1 FOR 5));
  code := 'GCWV-' || year_code || '-' || random_part;
  RETURN code;
END;
$$;

-- Function to calculate package discount
CREATE OR REPLACE FUNCTION public.calculate_package_discount(
  p_wtv_subtotal DECIMAL,
  p_gcc_subtotal DECIMAL,
  p_discount_percent DECIMAL
)
RETURNS DECIMAL
LANGUAGE plpgsql
AS $$
DECLARE
  total_before_discount DECIMAL;
  discount_amount DECIMAL;
BEGIN
  total_before_discount := COALESCE(p_wtv_subtotal, 0) + COALESCE(p_gcc_subtotal, 0);
  discount_amount := total_before_discount * (p_discount_percent / 100.0);
  RETURN discount_amount;
END;
$$;

-- Comments for documentation
COMMENT ON TABLE public.unified_bookings IS 'Cross-platform bookings combining vacation rentals (WTV) and boat charters (GCC)';
COMMENT ON COLUMN public.unified_bookings.booking_type IS 'Type: package (both), rental_only, or boat_only';
COMMENT ON COLUMN public.unified_bookings.wtv_booking_id IS 'Reference to WTV bookings.id';
COMMENT ON COLUMN public.unified_bookings.gcc_booking_id IS 'Reference to GCC bookings.id (if cross-DB, may be NULL)';
COMMENT ON COLUMN public.unified_bookings.is_package IS 'True if booking includes both rental and boat (package deal)';
COMMENT ON FUNCTION public.generate_unified_booking_code() IS 'Generates unique confirmation code like GCWV-2025-ABC12';
COMMENT ON FUNCTION public.calculate_package_discount(DECIMAL, DECIMAL, DECIMAL) IS 'Calculates discount amount for package deals';
