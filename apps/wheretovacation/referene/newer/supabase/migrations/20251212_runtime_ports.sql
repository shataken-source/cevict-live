CREATE TABLE IF NOT EXISTS public.runtime_ports (
  environment TEXT NOT NULL DEFAULT 'dev',
  app_id TEXT NOT NULL,
  port INTEGER NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (environment, app_id)
);

ALTER TABLE public.runtime_ports ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'runtime_ports'
      AND policyname = 'runtime_ports_select_public'
  ) THEN
    CREATE POLICY runtime_ports_select_public
      ON public.runtime_ports
      FOR SELECT
      USING (true);
  END IF;
END $$;

INSERT INTO public.runtime_ports (environment, app_id, port)
VALUES
  ('dev', 'gateway', 3000),
  ('dev', 'cevict-ai', 3000),
  ('dev', 'cevict', 3001),
  ('dev', 'forge', 3001),
  ('dev', 'petreunion', 3001),
  ('dev', 'praxis', 3002),
  ('dev', 'wtv', 3003),
  ('dev', 'gcc', 3005),
  ('dev', 'calmcast', 3005),
  ('dev', 'alexa-skill', 3016),
  ('dev', 'accu-solar', 3122)
ON CONFLICT (environment, app_id) DO NOTHING;
