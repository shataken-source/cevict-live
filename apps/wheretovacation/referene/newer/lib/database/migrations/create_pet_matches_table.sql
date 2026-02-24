-- Create pet_matches table for storing match results
-- Enterprise-level schema with proper indexes and constraints

CREATE TABLE IF NOT EXISTS public.pet_matches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lost_pet_id UUID NOT NULL REFERENCES public.lost_pets(id) ON DELETE CASCADE,
  found_pet_id UUID NOT NULL REFERENCES public.lost_pets(id) ON DELETE CASCADE,
  match_score INTEGER NOT NULL CHECK (match_score >= 0 AND match_score <= 100),
  match_reasons TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'contacted', 'reunited', 'not_match')),
  contacted_at TIMESTAMP WITH TIME ZONE,
  reunited_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  
  -- Ensure unique matches
  UNIQUE(lost_pet_id, found_pet_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_pet_matches_score_status ON public.pet_matches(match_score DESC, status);
CREATE INDEX IF NOT EXISTS idx_pet_matches_lost_pet ON public.pet_matches(lost_pet_id);
CREATE INDEX IF NOT EXISTS idx_pet_matches_found_pet ON public.pet_matches(found_pet_id);
CREATE INDEX IF NOT EXISTS idx_pet_matches_status ON public.pet_matches(status);
CREATE INDEX IF NOT EXISTS idx_pet_matches_created ON public.pet_matches(created_at DESC);

-- Create indexes on lost_pets for better query performance
CREATE INDEX IF NOT EXISTS idx_lost_pets_status_type ON public.lost_pets(status, pet_type);
CREATE INDEX IF NOT EXISTS idx_lost_pets_location ON public.lost_pets(location_state, location_city);
CREATE INDEX IF NOT EXISTS idx_lost_pets_search ON public.lost_pets USING gin(to_tsvector('english', coalesce(pet_name, '') || ' ' || coalesce(breed, '') || ' ' || coalesce(description, '')));
CREATE INDEX IF NOT EXISTS idx_lost_pets_created ON public.lost_pets(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.pet_matches ENABLE ROW LEVEL SECURITY;

-- RLS Policies for pet_matches
-- Allow public read access to matches
CREATE POLICY "Matches are viewable by everyone" ON public.pet_matches
  FOR SELECT USING (true);

-- Allow authenticated users to insert matches
CREATE POLICY "Authenticated users can create matches" ON public.pet_matches
  FOR INSERT WITH CHECK (true);

-- Allow authenticated users to update matches
CREATE POLICY "Authenticated users can update matches" ON public.pet_matches
  FOR UPDATE USING (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_pet_matches_updated_at
  BEFORE UPDATE ON public.pet_matches
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE public.pet_matches IS 'Stores potential matches between lost and found pets';
COMMENT ON COLUMN public.pet_matches.match_score IS 'Match confidence score (0-100)';
COMMENT ON COLUMN public.pet_matches.match_reasons IS 'Array of reasons why this is a match';












