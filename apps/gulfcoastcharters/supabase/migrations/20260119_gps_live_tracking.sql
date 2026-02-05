-- GPS Live Tracking (minimal, production-safe)
-- Creates captain GPS connection settings + live location updates.
--
-- Notes:
-- - This app currently does not have a `bookings` table, so we track by `captain_id`.
-- - We ENABLE RLS and rely on server routes (service role) for reads/writes.

create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;
create extension if not exists postgis;

-- 1) Captain GPS connection + sharing preferences
create table if not exists public.captain_gps_connections (
  id uuid primary key default uuid_generate_v4(),
  captain_id uuid not null references public.profiles(id) on delete cascade,
  provider text not null, -- 'browser', 'garmin', etc
  credentials jsonb,
  is_active boolean default true,
  share_public boolean default false,
  update_interval_seconds integer default 5,
  last_connected timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (captain_id, provider)
);

create index if not exists idx_captain_gps_connections_captain_id on public.captain_gps_connections(captain_id);
create index if not exists idx_captain_gps_connections_share_public on public.captain_gps_connections(share_public);

alter table public.captain_gps_connections enable row level security;

-- 2) Live location updates (append-only)
create table if not exists public.captain_location_updates (
  id uuid primary key default uuid_generate_v4(),
  captain_id uuid not null references public.profiles(id) on delete cascade,
  latitude numeric(10, 8) not null,
  longitude numeric(11, 8) not null,
  accuracy_m numeric(8, 2),
  speed_mps numeric(8, 2),
  heading_deg numeric(6, 2),
  provider text,
  captured_at timestamptz not null default now(),
  created_at timestamptz default now()
);

create index if not exists idx_captain_location_updates_captain_id on public.captain_location_updates(captain_id);
create index if not exists idx_captain_location_updates_captured_at on public.captain_location_updates(captured_at desc);
create index if not exists idx_captain_location_updates_coordinates on public.captain_location_updates using gist (
  st_makepoint(longitude, latitude)::geography
);

alter table public.captain_location_updates enable row level security;

-- Intentionally no RLS policies here.
-- Access is intended via Next.js API routes using SUPABASE_SERVICE_ROLE_KEY.

