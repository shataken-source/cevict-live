-- PetReunion: full-text search via tsvector (optional — run on Free project only).
-- Run after 20260205_indexes_and_search.sql. See docs/PROJECT_MAP.md.

-- Add generated search vector column
ALTER TABLE lost_pets
ADD COLUMN IF NOT EXISTS search_vector tsvector
GENERATED ALWAYS AS (
  setweight(to_tsvector('english', coalesce(pet_name, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(breed, '')), 'B') ||
  setweight(to_tsvector('english', coalesce(color, '')), 'C') ||
  setweight(to_tsvector('english', coalesce(description, '')), 'C') ||
  setweight(to_tsvector('english', coalesce(location_city, '')), 'D')
) STORED;

CREATE INDEX IF NOT EXISTS lost_pets_search_idx ON lost_pets USING GIN(search_vector);
