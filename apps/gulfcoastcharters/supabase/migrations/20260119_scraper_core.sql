-- Scraper Core Tables (Enhanced Scraper + Failure Reports)
--
-- This supports the restored documentation + the `enhanced-smart-scraper` edge function.
-- We intentionally keep access via server-side (service role) routes.

create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;

-- -------------------------------
-- Scraper config (1 row)
-- -------------------------------
create table if not exists public.scraper_config (
  id bigint primary key generated always as identity,
  sources jsonb not null default '{}'::jsonb,
  filters jsonb not null default '{}'::jsonb,
  schedule jsonb not null default '{}'::jsonb,
  max_boats_per_run integer not null default 10,
  updated_at timestamptz default now()
);

-- If these tables already existed, `create table if not exists` will NOT add new columns.
-- These ALTERs make the migration upgrade-safe across environments.
alter table public.scraper_config add column if not exists sources jsonb;
alter table public.scraper_config add column if not exists filters jsonb;
alter table public.scraper_config add column if not exists schedule jsonb;
alter table public.scraper_config add column if not exists max_boats_per_run integer;
alter table public.scraper_config add column if not exists updated_at timestamptz;

-- Ensure at least one row exists for UI (after columns exist).
insert into public.scraper_config (sources, filters, schedule, max_boats_per_run)
select '{}'::jsonb, '{}'::jsonb, '{}'::jsonb, 10
where not exists (select 1 from public.scraper_config);

alter table public.scraper_config enable row level security;

-- -------------------------------
-- Scraper status (single row)
-- -------------------------------
create table if not exists public.scraper_status (
  id bigint primary key generated always as identity,
  is_running boolean not null default false,
  last_run timestamptz,
  next_scheduled_run timestamptz,
  total_boats_scraped integer not null default 0,
  new_boats_today integer not null default 0,
  scheduled_enabled boolean not null default false,
  updated_at timestamptz default now()
);

alter table public.scraper_status add column if not exists is_running boolean;
alter table public.scraper_status add column if not exists last_run timestamptz;
alter table public.scraper_status add column if not exists next_scheduled_run timestamptz;
alter table public.scraper_status add column if not exists total_boats_scraped integer;
alter table public.scraper_status add column if not exists new_boats_today integer;
alter table public.scraper_status add column if not exists scheduled_enabled boolean;
alter table public.scraper_status add column if not exists updated_at timestamptz;

insert into public.scraper_status (is_running, total_boats_scraped, new_boats_today, scheduled_enabled)
select false, 0, 0, false
where not exists (select 1 from public.scraper_status);

alter table public.scraper_status enable row level security;

-- -------------------------------
-- Scraped boats (results)
-- -------------------------------
create table if not exists public.scraped_boats (
  id uuid primary key default uuid_generate_v4(),

  source text not null,
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
  times_seen integer not null default 1,

  claimed boolean not null default false,

  data_complete boolean not null default false,
  missing_fields text[] not null default '{}'::text[],
  data_quality_score integer not null default 0,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.scraped_boats add column if not exists source text;
alter table public.scraped_boats add column if not exists source_url text;
alter table public.scraped_boats add column if not exists source_post_id text;
alter table public.scraped_boats add column if not exists name text;
alter table public.scraped_boats add column if not exists location text;
alter table public.scraped_boats add column if not exists captain text;
alter table public.scraped_boats add column if not exists phone text;
alter table public.scraped_boats add column if not exists email text;
alter table public.scraped_boats add column if not exists boat_type text;
alter table public.scraped_boats add column if not exists length integer;
alter table public.scraped_boats add column if not exists description text;
alter table public.scraped_boats add column if not exists first_seen timestamptz;
alter table public.scraped_boats add column if not exists last_seen timestamptz;
alter table public.scraped_boats add column if not exists times_seen integer;
alter table public.scraped_boats add column if not exists claimed boolean;
alter table public.scraped_boats add column if not exists data_complete boolean;
alter table public.scraped_boats add column if not exists missing_fields text[];
alter table public.scraped_boats add column if not exists data_quality_score integer;
alter table public.scraped_boats add column if not exists created_at timestamptz;
alter table public.scraped_boats add column if not exists updated_at timestamptz;

-- Create indexes only after columns exist (upgrade-safe).
create index if not exists idx_scraped_boats_last_seen on public.scraped_boats(last_seen desc nulls last);
create index if not exists idx_scraped_boats_claimed on public.scraped_boats(claimed);
create index if not exists idx_scraped_boats_quality on public.scraped_boats(data_quality_score desc);
create index if not exists idx_scraped_boats_source on public.scraped_boats(source);

alter table public.scraped_boats enable row level security;

-- -------------------------------
-- Scraper run logs
-- -------------------------------
create table if not exists public.scraper_logs (
  id uuid primary key default uuid_generate_v4(),
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

  created_at timestamptz default now()
);

-- This fixes: ERROR: 42703: column "started_at" does not exist
alter table public.scraper_logs add column if not exists mode text;
alter table public.scraper_logs add column if not exists sources text[];
alter table public.scraper_logs add column if not exists filter_state text;
alter table public.scraper_logs add column if not exists target_boats integer;
alter table public.scraper_logs add column if not exists boats_scraped integer;
alter table public.scraper_logs add column if not exists complete_boats integer;
alter table public.scraper_logs add column if not exists incomplete_boats integer;
alter table public.scraper_logs add column if not exists new_boats integer;
alter table public.scraper_logs add column if not exists updated_boats integer;
alter table public.scraper_logs add column if not exists failures_count integer;
alter table public.scraper_logs add column if not exists errors_count integer;
alter table public.scraper_logs add column if not exists errors jsonb;
alter table public.scraper_logs add column if not exists started_at timestamptz;
alter table public.scraper_logs add column if not exists completed_at timestamptz;
alter table public.scraper_logs add column if not exists created_at timestamptz;

-- Create index after columns exist
create index if not exists idx_scraper_logs_started_at on public.scraper_logs(started_at desc nulls last);

-- Enable RLS after schema is in place
alter table public.scraper_logs enable row level security;

-- -------------------------------
-- Failure reports
-- -------------------------------
create table if not exists public.scraper_failure_reports (
  id uuid primary key default uuid_generate_v4(),

  run_timestamp timestamptz not null,
  mode text,
  sources text[],

  total_failures integer not null default 0,
  total_incomplete integer not null default 0,

  failures jsonb,
  incomplete_boats jsonb,

  created_at timestamptz default now()
);

alter table public.scraper_failure_reports add column if not exists run_timestamp timestamptz;
alter table public.scraper_failure_reports add column if not exists mode text;
alter table public.scraper_failure_reports add column if not exists sources text[];
alter table public.scraper_failure_reports add column if not exists total_failures integer;
alter table public.scraper_failure_reports add column if not exists total_incomplete integer;
alter table public.scraper_failure_reports add column if not exists failures jsonb;
alter table public.scraper_failure_reports add column if not exists incomplete_boats jsonb;
alter table public.scraper_failure_reports add column if not exists created_at timestamptz;

create index if not exists idx_scraper_failure_reports_run_timestamp on public.scraper_failure_reports(run_timestamp desc);

alter table public.scraper_failure_reports enable row level security;

-- -------------------------------
-- Notifications (minimal)
-- -------------------------------
create table if not exists public.notifications (
  id uuid primary key default uuid_generate_v4(),
  type text not null,
  title text,
  message text,
  user_id uuid,
  link_url text,
  metadata jsonb,
  created_at timestamptz default now()
);

alter table public.notifications add column if not exists type text;
alter table public.notifications add column if not exists title text;
alter table public.notifications add column if not exists message text;
alter table public.notifications add column if not exists user_id uuid;
alter table public.notifications add column if not exists link_url text;
alter table public.notifications add column if not exists metadata jsonb;
alter table public.notifications add column if not exists created_at timestamptz;

alter table public.notifications enable row level security;

