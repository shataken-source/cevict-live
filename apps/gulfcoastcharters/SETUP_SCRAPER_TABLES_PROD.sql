-- Setup Scraper Tables for PRODUCTION Database (rdbuwyefbgnbuhmjrizo)
-- Run this in your PRODUCTION database SQL Editor

-- First, check if tables already exist
SELECT 
  'scraper_config' AS table_name,
  EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'scraper_config') AS exists
UNION ALL
SELECT 'scraper_status',
  EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'scraper_status')
UNION ALL
SELECT 'scraped_boats',
  EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'scraped_boats')
UNION ALL
SELECT 'scraper_logs',
  EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'scraper_logs')
UNION ALL
SELECT 'scraper_failure_reports',
  EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'scraper_failure_reports');

-- If any tables don't exist, run the full migration below
-- Otherwise, skip to the initialization section

-- ============================================
-- FULL MIGRATION (run if tables don't exist)
-- ============================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Scraper config table
CREATE TABLE IF NOT EXISTS public.scraper_config (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  sources jsonb NOT NULL DEFAULT '{}'::jsonb,
  filters jsonb NOT NULL DEFAULT '{}'::jsonb,
  schedule jsonb NOT NULL DEFAULT '{}'::jsonb,
  max_boats_per_run integer NOT NULL DEFAULT 10,
  updated_at timestamptz DEFAULT now()
);

-- Scraper status table
CREATE TABLE IF NOT EXISTS public.scraper_status (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  is_running boolean NOT NULL DEFAULT false,
  last_run timestamptz,
  next_scheduled_run timestamptz,
  total_boats_scraped integer NOT NULL DEFAULT 0,
  new_boats_today integer NOT NULL DEFAULT 0,
  scheduled_enabled boolean NOT NULL DEFAULT false,
  updated_at timestamptz DEFAULT now()
);

-- Scraped boats table
CREATE TABLE IF NOT EXISTS public.scraped_boats (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  source text NOT NULL,
  source_url text,
  source_post_id text,
  name text,
  location text,
  captain text,
  phone text,
  email text,
  boat_type text,
  length integer,
  description text,
  first_seen timestamptz,
  last_seen timestamptz,
  times_seen integer NOT NULL DEFAULT 1,
  claimed boolean NOT NULL DEFAULT false,
  data_complete boolean NOT NULL DEFAULT false,
  missing_fields text[] NOT NULL DEFAULT '{}'::text[],
  data_quality_score integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Scraper logs table
CREATE TABLE IF NOT EXISTS public.scraper_logs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  mode text,
  sources text[],
  filter_state text,
  target_boats integer,
  boats_scraped integer,
  complete_boats integer,
  incomplete_boats integer,
  new_boats integer,
  updated_boats integer,
  failures_count integer,
  errors_count integer,
  errors jsonb,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Scraper failure reports table
CREATE TABLE IF NOT EXISTS public.scraper_failure_reports (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  run_timestamp timestamptz,
  mode text,
  sources text[],
  total_failures integer,
  total_incomplete integer,
  failures jsonb,
  incomplete_boats jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_scraped_boats_last_seen ON public.scraped_boats(last_seen DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_scraped_boats_claimed ON public.scraped_boats(claimed);
CREATE INDEX IF NOT EXISTS idx_scraped_boats_quality ON public.scraped_boats(data_quality_score DESC);
CREATE INDEX IF NOT EXISTS idx_scraped_boats_source ON public.scraped_boats(source);

-- Enable RLS (but allow service role to access)
ALTER TABLE public.scraper_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scraper_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scraped_boats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scraper_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scraper_failure_reports ENABLE ROW LEVEL SECURITY;

-- ============================================
-- INITIALIZE DATA (run after tables exist)
-- ============================================

-- Initialize scraper config
INSERT INTO public.scraper_config (sources, filters, max_boats_per_run)
SELECT 
  '{"thehulltruth": true, "craigslist": true}'::jsonb,
  '{"states": ["AL", "FL", "MS", "LA", "TX"]}'::jsonb,
  10
WHERE NOT EXISTS (SELECT 1 FROM public.scraper_config);

-- Initialize scraper status
INSERT INTO public.scraper_status (is_running, total_boats_scraped, new_boats_today, scheduled_enabled)
SELECT false, 0, 0, false
WHERE NOT EXISTS (SELECT 1 FROM public.scraper_status);

-- Verify setup
SELECT 
  'Setup Complete' AS status,
  (SELECT COUNT(*) FROM public.scraper_config) AS config_rows,
  (SELECT COUNT(*) FROM public.scraper_status) AS status_rows,
  (SELECT COUNT(*) FROM public.scraped_boats) AS scraped_boats_count;
