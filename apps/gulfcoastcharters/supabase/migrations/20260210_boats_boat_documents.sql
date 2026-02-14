-- Boats and boat_documents for Compliance Dashboard
-- ComplianceDashboard reads from boats + boat_documents (fleet-wide document tracking).

-- Fleet vessels list (for compliance; can align with vessels table or be standalone)
CREATE TABLE IF NOT EXISTS public.boats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  registration_number TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Documents per boat (expiration tracking)
CREATE TABLE IF NOT EXISTS public.boat_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  boat_id UUID NOT NULL REFERENCES public.boats(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  expiration_date DATE,
  status TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_boat_documents_boat_id ON public.boat_documents(boat_id);
CREATE INDEX IF NOT EXISTS idx_boat_documents_expiration ON public.boat_documents(expiration_date);

ALTER TABLE public.boats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.boat_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read boats" ON public.boats;
CREATE POLICY "Allow read boats" ON public.boats FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow insert boats" ON public.boats;
CREATE POLICY "Allow insert boats" ON public.boats FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Allow update boats" ON public.boats;
CREATE POLICY "Allow update boats" ON public.boats FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow read boat_documents" ON public.boat_documents;
CREATE POLICY "Allow read boat_documents" ON public.boat_documents FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow insert boat_documents" ON public.boat_documents;
CREATE POLICY "Allow insert boat_documents" ON public.boat_documents FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Allow update boat_documents" ON public.boat_documents;
CREATE POLICY "Allow update boat_documents" ON public.boat_documents FOR UPDATE USING (true);
