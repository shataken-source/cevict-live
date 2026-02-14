-- PetReunion: Enable pgvector for visual similarity search (CLIP embeddings)
-- Run on Free project only (nqkbqtiramecvmmpaxzk). See docs/PROJECT_MAP.md.

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding column (512-dim for CLIP ViT-B/32)
ALTER TABLE lost_pets
ADD COLUMN IF NOT EXISTS embedding vector(512);

-- Create index for cosine similarity search
CREATE INDEX IF NOT EXISTS lost_pets_embedding_idx ON lost_pets
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- RPC function: match_pets_by_image
-- Returns pets with embedding similarity > threshold, ordered by similarity desc
CREATE OR REPLACE FUNCTION match_pets_by_image (
  query_embedding vector(512),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10,
  pet_status text DEFAULT 'all'
)
RETURNS TABLE (
  id uuid,
  pet_name text,
  pet_type text,
  breed text,
  color text,
  photo_url text,
  location_city text,
  location_state text,
  status text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.pet_name,
    p.pet_type,
    p.breed,
    p.color,
    p.photo_url,
    p.location_city,
    p.location_state,
    p.status,
    (1 - (p.embedding <=> query_embedding))::float AS similarity
  FROM lost_pets p
  WHERE
    p.embedding IS NOT NULL
    AND (1 - (p.embedding <=> query_embedding)) > match_threshold
    AND (pet_status = 'all' OR p.status = pet_status)
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$;

COMMENT ON FUNCTION match_pets_by_image IS 'Find pets by visual similarity using CLIP embeddings. Returns pets with cosine similarity > threshold.';
