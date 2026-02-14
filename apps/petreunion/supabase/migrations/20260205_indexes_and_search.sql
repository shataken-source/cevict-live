-- PetReunion: performance indexes (Verdant AI / external audit)
-- Run in Supabase SQL Editor or via supabase db push.
--
-- RUN IN: Free project only — https://nqkbqtiramecvmmpaxzk.supabase.co
-- (lost_pets exists only there; Prod = rdbuwyefbgnbuhmjrizo has no lost_pets.)
-- If you get "relation lost_pets does not exist", you are in the wrong project.

-- Location lookups (city, state filters)
CREATE INDEX IF NOT EXISTS idx_lost_pets_location ON lost_pets(location_state, location_city);

-- Status filter (lost vs found)
CREATE INDEX IF NOT EXISTS idx_lost_pets_status ON lost_pets(status);

-- Pet type filter
CREATE INDEX IF NOT EXISTS idx_lost_pets_type ON lost_pets(pet_type);

-- Date sorting (newest first)
CREATE INDEX IF NOT EXISTS idx_lost_pets_created ON lost_pets(created_at DESC);

-- Composite for common filter combo
CREATE INDEX IF NOT EXISTS idx_lost_pets_status_type_state ON lost_pets(status, pet_type, location_state);
