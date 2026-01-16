-- Add owner_id to pets to support RLS and embeddings policies
ALTER TABLE IF EXISTS pets
  ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES auth.users(id);

-- Helpful index for owner-scoped queries
CREATE INDEX IF NOT EXISTS idx_pets_owner_id ON pets(owner_id);

COMMENT ON COLUMN pets.owner_id IS 'Supabase auth user who created/owns this pet record';
