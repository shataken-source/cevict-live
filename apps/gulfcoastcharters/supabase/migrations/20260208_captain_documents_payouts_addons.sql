-- Captain documents: create if not exists (referenced by 20240123/20240122)
CREATE TABLE IF NOT EXISTS public.captain_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  captain_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  name TEXT,
  url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'expired')),
  expiry_date TIMESTAMPTZ,
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  ocr_data JSONB,
  last_reminder_sent_at TIMESTAMPTZ,
  reminder_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_captain_documents_captain ON public.captain_documents(captain_id);
CREATE INDEX IF NOT EXISTS idx_captain_docs_reminder ON public.captain_documents(expiry_date, last_reminder_sent_at);

ALTER TABLE public.captain_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Captains can manage own documents" ON public.captain_documents;
CREATE POLICY "Captains can manage own documents" ON public.captain_documents
  FOR ALL USING (auth.uid() = captain_id);

-- Captain payouts
CREATE TABLE IF NOT EXISTS public.captain_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  captain_id UUID NOT NULL REFERENCES public.captain_profiles(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'paid', 'failed', 'cancelled')),
  stripe_transfer_id TEXT,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paid_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_captain_payouts_captain ON public.captain_payouts(captain_id);
CREATE INDEX IF NOT EXISTS idx_captain_payouts_status ON public.captain_payouts(status);
CREATE INDEX IF NOT EXISTS idx_captain_payouts_requested ON public.captain_payouts(requested_at DESC);

ALTER TABLE public.captain_payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Captains can view own payouts" ON public.captain_payouts
  FOR SELECT USING (
    captain_id IN (SELECT id FROM public.captain_profiles WHERE user_id = auth.uid())
  );

-- Captain add-ons (fuel, tackle, catering, etc.)
CREATE TABLE IF NOT EXISTS public.captain_addons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  captain_id UUID NOT NULL REFERENCES public.captain_profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL CHECK (price >= 0),
  category TEXT NOT NULL DEFAULT 'other' CHECK (category IN ('food', 'beverage', 'equipment', 'fuel', 'tackle', 'license', 'other')),
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_captain_addons_captain ON public.captain_addons(captain_id);
CREATE INDEX IF NOT EXISTS idx_captain_addons_category ON public.captain_addons(category);

ALTER TABLE public.captain_addons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Captains can manage own addons" ON public.captain_addons
  FOR ALL USING (
    captain_id IN (SELECT id FROM public.captain_profiles WHERE user_id = auth.uid())
  );
