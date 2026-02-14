-- Create email_unsubscribes table for CAN-SPAM compliance
-- This table tracks users who have opted out of emails

CREATE TABLE IF NOT EXISTS public.email_unsubscribes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  source TEXT, -- 'boat_notification', 'marketing', etc.
  unsubscribed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  -- Ensure email is unique
  CONSTRAINT email_unsubscribes_email_unique UNIQUE (email)
);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_email_unsubscribes_email ON public.email_unsubscribes(email);
CREATE INDEX IF NOT EXISTS idx_email_unsubscribes_source ON public.email_unsubscribes(source);
CREATE INDEX IF NOT EXISTS idx_email_unsubscribes_unsubscribed_at ON public.email_unsubscribes(unsubscribed_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE public.email_unsubscribes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public can insert unsubscribes" ON public.email_unsubscribes;
DROP POLICY IF EXISTS "Service role can manage unsubscribes" ON public.email_unsubscribes;

-- Allow anyone to unsubscribe (public insert)
CREATE POLICY "Public can insert unsubscribes" ON public.email_unsubscribes
  FOR INSERT WITH CHECK (true);

-- Allow service role to read/manage (for checking unsubscribe status)
CREATE POLICY "Service role can manage unsubscribes" ON public.email_unsubscribes
  FOR ALL USING (true);

-- Add comment
COMMENT ON TABLE public.email_unsubscribes IS 'Email unsubscribe list for CAN-SPAM compliance';

