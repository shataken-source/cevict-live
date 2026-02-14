-- =============================================================================
-- Finn + Fishy memory & user special dates (shared GCC + WTV, same Supabase)
-- =============================================================================
-- Run this in your single Supabase project so both sites can use the same
-- Finn profile, special dates (birthdays/anniversaries), and Fishy user link.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Finn concierge profile (one per user, shared across GCC and WTV)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.finn_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  platform TEXT NOT NULL DEFAULT 'both' CHECK (platform IN ('gcc', 'wtv', 'both')),

  -- Preferences (mirrors FINNMemoryProfile)
  preferred_locations TEXT[] DEFAULT '{}',
  avoided_issues TEXT[] DEFAULT '{}',
  species_preferences TEXT[] DEFAULT '{}',
  boat_type_preferences TEXT[] DEFAULT '{}',
  captain_preferences TEXT[] DEFAULT '{}',
  weather_tolerance TEXT DEFAULT 'moderate' CHECK (weather_tolerance IN ('low', 'moderate', 'high')),
  budget_min DECIMAL(10, 2) DEFAULT 200,
  budget_max DECIMAL(10, 2) DEFAULT 1000,
  traditions TEXT[] DEFAULT '{}',
  family_members TEXT[] DEFAULT '{}',

  -- Learned state
  learned_preferences JSONB DEFAULT '[]',
  question_patterns JSONB DEFAULT '[]',
  conversation_history JSONB DEFAULT '[]',
  recent_bookings JSONB DEFAULT '[]',
  gear_purchase_history JSONB DEFAULT '[]',

  interaction_count INTEGER NOT NULL DEFAULT 0,
  last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_finn_profiles_user_id ON public.finn_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_finn_profiles_last_updated ON public.finn_profiles(last_updated DESC);

COMMENT ON TABLE public.finn_profiles IS 'Finn concierge memory: one row per user, shared by GCC and WTV';

-- -----------------------------------------------------------------------------
-- 2. User special dates (birthdays, anniversaries) - shared across sites
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_special_dates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('anniversary', 'birthday')),
  occasion_date DATE NOT NULL,
  name TEXT,
  original_booking_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_special_dates_user_id ON public.user_special_dates(user_id);
CREATE INDEX IF NOT EXISTS idx_user_special_dates_occasion ON public.user_special_dates(occasion_date);
CREATE INDEX IF NOT EXISTS idx_user_special_dates_user_occasion ON public.user_special_dates(user_id, occasion_date);

COMMENT ON TABLE public.user_special_dates IS 'Birthdays and anniversaries extracted from conversations; used by Finn on both GCC and WTV';

-- -----------------------------------------------------------------------------
-- 3. Fishy: add user_id to conversations (optional, for per-user history)
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'fishy_conversations' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE public.fishy_conversations ADD COLUMN user_id UUID;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_fishy_conversations_user_id ON public.fishy_conversations(user_id) WHERE user_id IS NOT NULL;

COMMENT ON COLUMN public.fishy_conversations.user_id IS 'Optional: link conversation to user for cross-session memory (GCC/WTV)';

-- -----------------------------------------------------------------------------
-- 4. Local attractions: indoor/rainy-day flag (for Finn "rain day alternatives")
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'attractions') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'attractions' AND column_name = 'indoor') THEN
      ALTER TABLE public.attractions ADD COLUMN indoor BOOLEAN NOT NULL DEFAULT false;
    END IF;
  END IF;
END $$;

-- If attractions table does not exist (e.g. only in WTV migration), create a minimal one for shared use
CREATE TABLE IF NOT EXISTS public.local_attractions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  indoor BOOLEAN NOT NULL DEFAULT false,
  destination_id UUID,
  address TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  price_range TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_local_attractions_indoor ON public.local_attractions(indoor) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_local_attractions_destination ON public.local_attractions(destination_id);

COMMENT ON TABLE public.local_attractions IS 'Local attractions for concierge; indoor=true used for rainy-day recommendations (GCC/WTV)';

-- -----------------------------------------------------------------------------
-- 5. Nearby attractions when new charter or rental is added (for scrapers)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.listing_nearby_attractions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_platform TEXT NOT NULL CHECK (source_platform IN ('gcc', 'wtv')),
  source_listing_type TEXT NOT NULL CHECK (source_listing_type IN ('charter', 'accommodation', 'vessel')),
  source_listing_id UUID NOT NULL,
  attraction_id UUID,
  destination_id UUID,
  distance_km DECIMAL(10, 4),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- One row per listing–attraction pair (attraction_id set when linking from attractions table)
CREATE UNIQUE INDEX IF NOT EXISTS idx_listing_nearby_unique_pair
  ON public.listing_nearby_attractions(source_platform, source_listing_type, source_listing_id, attraction_id)
  WHERE attraction_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_listing_nearby_source ON public.listing_nearby_attractions(source_platform, source_listing_type, source_listing_id);

COMMENT ON TABLE public.listing_nearby_attractions IS 'Cache: attractions near each charter/rental; can be filled by trigger or scraper when new listing is added';

-- Function: refresh nearby attractions for a listing (call from trigger or scraper)
CREATE OR REPLACE FUNCTION public.refresh_nearby_attractions_for_listing(
  p_platform TEXT,
  p_listing_type TEXT,
  p_listing_id UUID,
  p_destination_id UUID DEFAULT NULL,
  p_lat DECIMAL DEFAULT NULL,
  p_lon DECIMAL DEFAULT NULL,
  p_max_km DECIMAL DEFAULT 25
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Remove existing links for this listing
  DELETE FROM public.listing_nearby_attractions
  WHERE source_platform = p_platform AND source_listing_type = p_listing_type AND source_listing_id = p_listing_id;

  -- By destination_id: link attractions that belong to same destination
  IF p_destination_id IS NOT NULL THEN
    INSERT INTO public.listing_nearby_attractions (source_platform, source_listing_type, source_listing_id, attraction_id, destination_id, distance_km)
    SELECT p_platform, p_listing_type, p_listing_id, a.id, a.destination_id, 0
    FROM public.attractions a
    WHERE a.destination_id = p_destination_id AND (a.active IS NOT FALSE)
    ON CONFLICT DO NOTHING;
    RETURN;
  END IF;

  -- By lat/lon: if local_attractions or attractions have coordinates, use distance (simplified: same destination or within radius)
  -- Optional: add PostGIS or point type for real distance; here we only do destination-based link
  NULL;
END;
$$;

COMMENT ON FUNCTION public.refresh_nearby_attractions_for_listing IS 'Call when a new charter or accommodation is added (e.g. from scraper) to link nearby attractions';

-- Trigger: when a new vacation rental (WTV) is added, link attractions in the same destination
CREATE OR REPLACE FUNCTION public.trigger_refresh_nearby_after_listing()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_TABLE_NAME = 'accommodations' AND NEW.destination_id IS NOT NULL THEN
    PERFORM public.refresh_nearby_attractions_for_listing('wtv', 'accommodation', NEW.id, NEW.destination_id, NEW.latitude, NEW.longitude, 25);
  ELSIF TG_TABLE_NAME = 'charters' THEN
    -- Uncomment when charters has destination_id (or pass NULL and rely on lat/lon later)
    PERFORM public.refresh_nearby_attractions_for_listing('gcc', 'charter', NEW.id, NULL, NULL, NULL, 25);
  END IF;
  RETURN NEW;
END;
$$;

-- WTV: run when new accommodation is inserted (same DB)
DROP TRIGGER IF EXISTS after_accommodation_insert_nearby ON public.accommodations;
CREATE TRIGGER after_accommodation_insert_nearby
  AFTER INSERT ON public.accommodations
  FOR EACH ROW
  WHEN (NEW.destination_id IS NOT NULL)
  EXECUTE FUNCTION public.trigger_refresh_nearby_after_listing();

-- GCC: run when new charter is inserted (uncomment when charters has destination_id and you add it to the trigger above)
-- DROP TRIGGER IF EXISTS after_charter_insert_nearby ON public.charters;
-- CREATE TRIGGER after_charter_insert_nearby
--   AFTER INSERT ON public.charters
--   FOR EACH ROW EXECUTE FUNCTION public.trigger_refresh_nearby_after_listing();

-- -----------------------------------------------------------------------------
-- RLS (optional: enable and add policies for finn_profiles, user_special_dates)
-- -----------------------------------------------------------------------------
ALTER TABLE public.finn_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_special_dates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own finn profile" ON public.finn_profiles;
CREATE POLICY "Users can read own finn profile" ON public.finn_profiles FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own finn profile" ON public.finn_profiles;
CREATE POLICY "Users can update own finn profile" ON public.finn_profiles FOR ALL USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own finn profile" ON public.finn_profiles;
CREATE POLICY "Users can insert own finn profile" ON public.finn_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own special dates" ON public.user_special_dates;
CREATE POLICY "Users can manage own special dates" ON public.user_special_dates FOR ALL USING (auth.uid() = user_id);
