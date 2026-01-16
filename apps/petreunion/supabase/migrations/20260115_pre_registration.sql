-- PetReunion: Pre-registration ($19.99/yr placeholder) + proactive matching
-- Idempotent and safe to re-run.

CREATE TABLE IF NOT EXISTS public.pre_registered_pets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Subscription (placeholder: no payments wired yet)
  subscription_status TEXT NOT NULL DEFAULT 'active' CHECK (subscription_status IN ('active', 'inactive', 'cancelled', 'trial')),
  subscription_price_usd NUMERIC(10,2) NOT NULL DEFAULT 19.99,
  subscription_started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  subscription_expires_at TIMESTAMPTZ,

  -- Pet info (mirror core matching fields)
  pet_name TEXT,
  pet_type TEXT NOT NULL CHECK (pet_type IN ('dog', 'cat')),
  breed TEXT NOT NULL DEFAULT 'Unknown',
  color TEXT NOT NULL DEFAULT 'Unknown',
  size TEXT DEFAULT NULL,
  age TEXT,
  gender TEXT,
  description TEXT,
  photo_url TEXT,

  -- Home area (for matching)
  location_city TEXT,
  location_state TEXT,
  location_zip TEXT,

  -- Contact (PII: do NOT expose on public endpoints)
  owner_name TEXT,
  owner_email TEXT,
  owner_phone TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- If the table already existed (older draft), ensure required columns exist
ALTER TABLE public.pre_registered_pets
  ADD COLUMN IF NOT EXISTS subscription_status TEXT,
  ADD COLUMN IF NOT EXISTS subscription_price_usd NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS subscription_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pet_name TEXT,
  ADD COLUMN IF NOT EXISTS pet_type TEXT,
  ADD COLUMN IF NOT EXISTS breed TEXT,
  ADD COLUMN IF NOT EXISTS color TEXT,
  ADD COLUMN IF NOT EXISTS size TEXT,
  ADD COLUMN IF NOT EXISTS age TEXT,
  ADD COLUMN IF NOT EXISTS gender TEXT,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS photo_url TEXT,
  ADD COLUMN IF NOT EXISTS location_city TEXT,
  ADD COLUMN IF NOT EXISTS location_state TEXT,
  ADD COLUMN IF NOT EXISTS location_zip TEXT,
  ADD COLUMN IF NOT EXISTS owner_name TEXT,
  ADD COLUMN IF NOT EXISTS owner_email TEXT,
  ADD COLUMN IF NOT EXISTS owner_phone TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ,
  -- When a pre-registered pet becomes missing, we can create a public lost_pets row and link it here
  ADD COLUMN IF NOT EXISTS lost_pet_id uuid,
  ADD COLUMN IF NOT EXISTS activated_missing_at TIMESTAMPTZ;

-- Backfill defaults for existing rows (best-effort, safe)
UPDATE public.pre_registered_pets
SET
  subscription_status = COALESCE(subscription_status, 'active'),
  subscription_price_usd = COALESCE(subscription_price_usd, 19.99),
  subscription_started_at = COALESCE(subscription_started_at, NOW()),
  created_at = COALESCE(created_at, NOW()),
  updated_at = COALESCE(updated_at, NOW()),
  breed = COALESCE(NULLIF(breed, ''), 'Unknown'),
  color = COALESCE(NULLIF(color, ''), 'Unknown')
WHERE subscription_status IS NULL
   OR subscription_price_usd IS NULL
   OR subscription_started_at IS NULL
   OR created_at IS NULL
   OR updated_at IS NULL
   OR breed IS NULL
   OR color IS NULL;

CREATE INDEX IF NOT EXISTS idx_pre_registered_pets_type_state ON public.pre_registered_pets(pet_type, location_state);
CREATE INDEX IF NOT EXISTS idx_pre_registered_pets_created ON public.pre_registered_pets(created_at DESC);

-- Matches: pre-registered (lost-before-lost) vs found pets in lost_pets
CREATE TABLE IF NOT EXISTS public.pre_registered_pet_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pre_registered_pet_id uuid NOT NULL REFERENCES public.pre_registered_pets(id) ON DELETE CASCADE,
  found_pet_id uuid NOT NULL REFERENCES public.lost_pets(id) ON DELETE CASCADE,
  match_score DOUBLE PRECISION NOT NULL CHECK (match_score >= 0 AND match_score <= 1),
  score_breakdown JSONB,
  match_reasons TEXT[],
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'rejected')),
  notified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(pre_registered_pet_id, found_pet_id)
);

-- Ensure match table columns exist if it pre-existed
ALTER TABLE public.pre_registered_pet_matches
  ADD COLUMN IF NOT EXISTS score_breakdown JSONB,
  ADD COLUMN IF NOT EXISTS match_reasons TEXT[],
  ADD COLUMN IF NOT EXISTS status TEXT,
  ADD COLUMN IF NOT EXISTS notified BOOLEAN,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_pre_reg_matches_pre_id ON public.pre_registered_pet_matches(pre_registered_pet_id);
CREATE INDEX IF NOT EXISTS idx_pre_reg_matches_found_id ON public.pre_registered_pet_matches(found_pet_id);
CREATE INDEX IF NOT EXISTS idx_pre_reg_matches_score ON public.pre_registered_pet_matches(match_score DESC);

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
