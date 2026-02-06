-- CREATE DEBUG LOGS TABLE FOR WEBHOOK DEBUGGING
-- Copy everything below this line and paste into Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.debug_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_debug_logs_created_at ON public.debug_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_debug_logs_event_type ON public.debug_logs(event_type);

ALTER TABLE public.debug_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role can insert debug logs" ON public.debug_logs;
CREATE POLICY "Service role can insert debug logs"
  ON public.debug_logs
  FOR INSERT
  TO service_role
  WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can read debug logs" ON public.debug_logs;
CREATE POLICY "Service role can read debug logs"
  ON public.debug_logs
  FOR SELECT
  TO service_role
  USING (true);

DROP POLICY IF EXISTS "Anon can read debug logs" ON public.debug_logs;
CREATE POLICY "Anon can read debug logs"
  ON public.debug_logs
  FOR SELECT
  TO anon
  USING (true);

SELECT 'debug_logs table created' as status, COUNT(*) as existing_rows FROM public.debug_logs;
