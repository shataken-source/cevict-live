-- Fish Recognition Corrections Table
-- Stores user corrections for AI model improvement

CREATE TABLE IF NOT EXISTS public.fish_recognition_corrections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url TEXT,
  predicted_species TEXT NOT NULL,
  actual_species TEXT NOT NULL,
  confidence DECIMAL(3, 2),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fish_corrections_created_at ON public.fish_recognition_corrections(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fish_corrections_predicted ON public.fish_recognition_corrections(predicted_species);
CREATE INDEX IF NOT EXISTS idx_fish_corrections_actual ON public.fish_recognition_corrections(actual_species);

-- RLS Policies
ALTER TABLE public.fish_recognition_corrections ENABLE ROW LEVEL SECURITY;

-- Users can view own corrections
CREATE POLICY "Users view own corrections" ON public.fish_recognition_corrections
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert corrections
CREATE POLICY "Users insert corrections" ON public.fish_recognition_corrections
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Admins can view all corrections
CREATE POLICY "Admins view all corrections" ON public.fish_recognition_corrections
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
