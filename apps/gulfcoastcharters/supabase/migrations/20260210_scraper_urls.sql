-- scraper_urls: URL list for automated charter scraper (scraper-scheduler)
CREATE TABLE IF NOT EXISTS public.scraper_urls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category TEXT,
  priority INTEGER DEFAULT 5,
  active BOOLEAN DEFAULT true,
  last_scraped TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scraper_urls_active_priority ON public.scraper_urls(active, priority DESC) WHERE active = true;

ALTER TABLE public.scraper_urls ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin full access scraper_urls" ON public.scraper_urls;
CREATE POLICY "Admin full access scraper_urls" ON public.scraper_urls
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

-- Service role needs to read/update for scheduler (RLS bypass with service role)
COMMENT ON TABLE public.scraper_urls IS 'URLs for scraper-scheduler; cron invokes scheduler which calls enhanced-smart-scraper per URL';
