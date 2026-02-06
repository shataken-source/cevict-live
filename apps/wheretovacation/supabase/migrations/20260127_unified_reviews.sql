-- Unified Reviews Table
-- Cross-platform reviews that can reference bookings/properties/vessels from both platforms
-- Simpler than unified_bookings - just links reviews to shared_users

-- Ensure extensions are available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Review type enum
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'unified_review_type_enum'
  ) THEN
    CREATE TYPE public.unified_review_type_enum AS ENUM (
      'wtv_property',    -- Review for vacation rental property
      'wtv_booking',     -- Review for vacation rental booking
      'gcc_vessel',      -- Review for boat/charter vessel
      'gcc_booking',     -- Review for boat/charter booking
      'gcc_captain',     -- Review for captain
      'package'          -- Review for unified package booking
    );
  END IF;
END $$;

-- Unified Reviews table
CREATE TABLE IF NOT EXISTS public.unified_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- User (references shared_users)
  user_id UUID NOT NULL REFERENCES public.shared_users(id) ON DELETE CASCADE,
  
  -- Review type
  review_type unified_review_type_enum NOT NULL,
  
  -- WTV references (if applicable)
  wtv_booking_id UUID, -- References bookings.id in WTV
  wtv_property_id UUID, -- References accommodations.id in WTV
  
  -- GCC references (if applicable)
  gcc_booking_id UUID, -- References bookings.id in GCC
  gcc_vessel_id UUID, -- References vessels.id in GCC
  gcc_captain_id UUID, -- References captains.id in GCC
  
  -- Unified booking reference (if reviewing a package)
  unified_booking_id UUID REFERENCES public.unified_bookings(id) ON DELETE SET NULL,
  
  -- Review content
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title VARCHAR(255),
  content TEXT,
  
  -- Specific ratings (optional, for detailed reviews)
  communication_rating INTEGER CHECK (communication_rating >= 1 AND communication_rating <= 5),
  value_rating INTEGER CHECK (value_rating >= 1 AND value_rating <= 5),
  cleanliness_rating INTEGER CHECK (cleanliness_rating >= 1 AND cleanliness_rating <= 5),
  location_rating INTEGER CHECK (location_rating >= 1 AND location_rating <= 5),
  experience_rating INTEGER CHECK (experience_rating >= 1 AND experience_rating <= 5),
  
  -- Photos (array of URLs)
  photos TEXT[] DEFAULT '{}',
  
  -- Response from owner/captain
  owner_response TEXT,
  owner_response_at TIMESTAMPTZ,
  
  -- Moderation
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'hidden', 'rejected')),
  
  -- Platform tracking
  platform VARCHAR(20) NOT NULL CHECK (platform IN ('gcc', 'wtv', 'both')),
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_unified_reviews_user_id ON public.unified_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_unified_reviews_review_type ON public.unified_reviews(review_type);
CREATE INDEX IF NOT EXISTS idx_unified_reviews_status ON public.unified_reviews(status);
CREATE INDEX IF NOT EXISTS idx_unified_reviews_platform ON public.unified_reviews(platform);
CREATE INDEX IF NOT EXISTS idx_unified_reviews_rating ON public.unified_reviews(rating);
CREATE INDEX IF NOT EXISTS idx_unified_reviews_wtv_property ON public.unified_reviews(wtv_property_id) WHERE wtv_property_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_unified_reviews_gcc_vessel ON public.unified_reviews(gcc_vessel_id) WHERE gcc_vessel_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_unified_reviews_gcc_captain ON public.unified_reviews(gcc_captain_id) WHERE gcc_captain_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_unified_reviews_unified_booking ON public.unified_reviews(unified_booking_id) WHERE unified_booking_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_unified_reviews_created_at ON public.unified_reviews(created_at DESC);

-- Enable RLS
ALTER TABLE public.unified_reviews ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read all approved reviews
DROP POLICY IF EXISTS "Anyone can read approved reviews" ON public.unified_reviews;
CREATE POLICY "Anyone can read approved reviews"
  ON public.unified_reviews
  FOR SELECT
  TO authenticated
  USING (status = 'approved');

-- Policy: Users can read their own reviews (even if pending)
DROP POLICY IF EXISTS "Users can read own reviews" ON public.unified_reviews;
CREATE POLICY "Users can read own reviews"
  ON public.unified_reviews
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy: Users can create their own reviews
DROP POLICY IF EXISTS "Users can create own reviews" ON public.unified_reviews;
CREATE POLICY "Users can create own reviews"
  ON public.unified_reviews
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own reviews (if pending)
DROP POLICY IF EXISTS "Users can update own reviews" ON public.unified_reviews;
CREATE POLICY "Users can update own reviews"
  ON public.unified_reviews
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id AND status = 'pending')
  WITH CHECK (auth.uid() = user_id);

-- Policy: Service role can do everything (for API operations)
DROP POLICY IF EXISTS "Service role full access unified reviews" ON public.unified_reviews;
CREATE POLICY "Service role full access unified reviews"
  ON public.unified_reviews
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_unified_reviews_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS trigger_unified_reviews_updated_at ON public.unified_reviews;
CREATE TRIGGER trigger_unified_reviews_updated_at
  BEFORE UPDATE ON public.unified_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.update_unified_reviews_updated_at();

-- Function to calculate average rating for a property/vessel
CREATE OR REPLACE FUNCTION public.get_average_rating(
  p_review_type unified_review_type_enum,
  p_wtv_property_id UUID DEFAULT NULL,
  p_gcc_vessel_id UUID DEFAULT NULL,
  p_gcc_captain_id UUID DEFAULT NULL
)
RETURNS DECIMAL
LANGUAGE plpgsql
AS $$
DECLARE
  avg_rating DECIMAL;
BEGIN
  SELECT AVG(rating)::DECIMAL(3,2)
  INTO avg_rating
  FROM public.unified_reviews
  WHERE status = 'approved'
    AND review_type = p_review_type
    AND (
      (p_wtv_property_id IS NOT NULL AND wtv_property_id = p_wtv_property_id)
      OR (p_gcc_vessel_id IS NOT NULL AND gcc_vessel_id = p_gcc_vessel_id)
      OR (p_gcc_captain_id IS NOT NULL AND gcc_captain_id = p_gcc_captain_id)
    );
  
  RETURN COALESCE(avg_rating, 0);
END;
$$;

-- Function to get review count
CREATE OR REPLACE FUNCTION public.get_review_count(
  p_review_type unified_review_type_enum,
  p_wtv_property_id UUID DEFAULT NULL,
  p_gcc_vessel_id UUID DEFAULT NULL,
  p_gcc_captain_id UUID DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
  review_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO review_count
  FROM public.unified_reviews
  WHERE status = 'approved'
    AND review_type = p_review_type
    AND (
      (p_wtv_property_id IS NOT NULL AND wtv_property_id = p_wtv_property_id)
      OR (p_gcc_vessel_id IS NOT NULL AND gcc_vessel_id = p_gcc_vessel_id)
      OR (p_gcc_captain_id IS NOT NULL AND gcc_captain_id = p_gcc_captain_id)
    );
  
  RETURN COALESCE(review_count, 0);
END;
$$;

-- Comments for documentation
COMMENT ON TABLE public.unified_reviews IS 'Cross-platform reviews for properties, vessels, captains, and bookings';
COMMENT ON COLUMN public.unified_reviews.review_type IS 'Type: wtv_property, wtv_booking, gcc_vessel, gcc_booking, gcc_captain, or package';
COMMENT ON COLUMN public.unified_reviews.platform IS 'Platform where review was created: gcc, wtv, or both';
COMMENT ON FUNCTION public.get_average_rating(unified_review_type_enum, UUID, UUID, UUID) IS 'Calculates average rating for a property, vessel, or captain';
COMMENT ON FUNCTION public.get_review_count(unified_review_type_enum, UUID, UUID, UUID) IS 'Gets count of approved reviews for a property, vessel, or captain';
