-- Itineraries, FX snapshot, bundle support, destination enrichment, i18n prep
-- Run after 20260127_* and 20260118_create_all_tables

-- ============================================
-- 1. Itineraries table
-- ============================================
CREATE TABLE IF NOT EXISTS public.itineraries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  start_date DATE,
  end_date DATE,
  items JSONB NOT NULL DEFAULT '[]',
  -- [{ "id": "uuid", "type": "rental"|"boat"|"activity", "refId": "...", "name": "...", "price": 100, "date": "..." }]
  total_estimated_cost DECIMAL(12, 2) DEFAULT 0,
  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'saved', 'booked', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_itineraries_user ON public.itineraries(user_id);
CREATE INDEX IF NOT EXISTS idx_itineraries_dates ON public.itineraries(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_itineraries_status ON public.itineraries(status);

ALTER TABLE public.itineraries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read own itineraries" ON public.itineraries;
CREATE POLICY "Users can read own itineraries" ON public.itineraries FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own itineraries" ON public.itineraries;
CREATE POLICY "Users can insert own itineraries" ON public.itineraries FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own itineraries" ON public.itineraries;
CREATE POLICY "Users can update own itineraries" ON public.itineraries FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can delete own itineraries" ON public.itineraries;
CREATE POLICY "Users can delete own itineraries" ON public.itineraries FOR DELETE TO authenticated USING (auth.uid() = user_id);

COMMENT ON TABLE public.itineraries IS 'User trip plans: rentals, boats, activities with estimated cost';

-- ============================================
-- 2. Bookings: FX snapshot columns
-- ============================================
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS fx_currency VARCHAR(3),
  ADD COLUMN IF NOT EXISTS fx_rate_to_usd DECIMAL(18, 8),
  ADD COLUMN IF NOT EXISTS amount_usd DECIMAL(10, 2),
  ADD COLUMN IF NOT EXISTS fx_snapshot_at TIMESTAMPTZ;

COMMENT ON COLUMN public.bookings.fx_currency IS 'User display currency at booking time (e.g. EUR)';
COMMENT ON COLUMN public.bookings.fx_rate_to_usd IS 'Rate 1 USD = this many units of fx_currency';
COMMENT ON COLUMN public.bookings.amount_usd IS 'Total in USD (source of truth)';
COMMENT ON COLUMN public.bookings.fx_snapshot_at IS 'When FX rate was captured';

-- ============================================
-- 3. Unified_bookings: currency columns
-- ============================================
ALTER TABLE public.unified_bookings
  ADD COLUMN IF NOT EXISTS fx_currency VARCHAR(3),
  ADD COLUMN IF NOT EXISTS fx_rate_to_usd DECIMAL(18, 8),
  ADD COLUMN IF NOT EXISTS total_amount_usd DECIMAL(10, 2),
  ADD COLUMN IF NOT EXISTS fx_snapshot_at TIMESTAMPTZ;

-- ============================================
-- 4. Destinations: enrichment columns
-- ============================================
ALTER TABLE public.destinations
  ADD COLUMN IF NOT EXISTS country_code VARCHAR(2),
  ADD COLUMN IF NOT EXISTS best_season TEXT,
  ADD COLUMN IF NOT EXISTS enrichment_synced_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS enrichment_data JSONB DEFAULT '{}';

COMMENT ON COLUMN public.destinations.enrichment_data IS 'External API payload (city photos, scores, etc.)';

-- ============================================
-- 5. shared_users: preferred_language for i18n
-- ============================================
ALTER TABLE public.shared_users
  ADD COLUMN IF NOT EXISTS preferred_language VARCHAR(5) DEFAULT 'en';

COMMENT ON COLUMN public.shared_users.preferred_language IS 'BCP 47 e.g. en, es, fr, pt-BR';
