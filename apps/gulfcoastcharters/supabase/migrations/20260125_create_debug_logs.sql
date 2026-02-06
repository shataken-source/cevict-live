-- Create debug_logs table for webhook debugging
-- This allows us to verify function execution even if console.log doesn't work

CREATE TABLE IF NOT EXISTS public.debug_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_debug_logs_created_at ON public.debug_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_debug_logs_event_type ON public.debug_logs(event_type);

-- Allow service role to insert (webhook uses service role)
ALTER TABLE public.debug_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can insert debug logs"
  ON public.debug_logs
  FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Service role can read debug logs"
  ON public.debug_logs
  FOR SELECT
  TO service_role
  USING (true);

-- Allow anon to read for debugging (optional, can be removed later)
CREATE POLICY "Anon can read debug logs"
  ON public.debug_logs
  FOR SELECT
  TO anon
  USING (true);
