-- Enhanced Vessel System (supports charter fishing + inland waterway rentals)
-- Docs: ENHANCED_VESSEL_SYSTEM.md

-- Ensure UUID generator available
create extension if not exists pgcrypto;

-- Enum for vessel types (safe create)
do $$
begin
  if not exists (
    select 1
    from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'vessel_type_enum'
  ) then
    create type public.vessel_type_enum as enum (
      -- Charter Fishing
      'sport_fishing',
      'deep_sea_fishing',
      'inshore_fishing',
      'bay_boat',
      'center_console',

      -- PWC
      'jet_ski',
      'sea_doo',
      'waverunner',

      -- Pontoon
      'party_pontoon',
      'fishing_pontoon',
      'luxury_pontoon',

      -- Ski/Wake
      'wakeboard_boat',
      'ski_boat',
      'surf_boat',

      -- Other
      'deck_boat',
      'bowrider',
      'cruiser',
      'sailboat',
      'kayak',
      'canoe',
      'paddleboard',
      'yacht'
    );
  end if;
end $$;

-- Main vessels table
create table if not exists public.vessels (
  id uuid primary key default gen_random_uuid(),

  -- Owner/Captain (use public.profiles as canonical user table)
  owner_id uuid references public.profiles(id) on delete cascade,
  captain_id uuid references public.profiles(id),

  -- Basic info
  name text not null,
  vessel_type public.vessel_type_enum not null,
  category text not null check (category in ('charter_fishing', 'inland_waterway', 'recreation')),

  -- Details
  make text,
  model text,
  year integer,
  length_feet numeric(5,2),
  capacity integer,

  -- Features
  amenities jsonb not null default '[]'::jsonb,
  equipment jsonb not null default '[]'::jsonb,

  -- Location
  home_marina text,
  home_latitude numeric(10,8),
  home_longitude numeric(11,8),
  operating_area text,

  -- Pricing
  hourly_rate numeric(10,2),
  half_day_rate numeric(10,2),
  full_day_rate numeric(10,2),
  weekly_rate numeric(10,2),
  deposit_required numeric(10,2),

  -- Requirements
  requires_captain boolean not null default false,
  requires_license boolean not null default false,
  minimum_age integer not null default 18,

  -- Safety
  insurance_verified boolean not null default false,
  safety_inspection_date date,
  uscg_certified boolean not null default false,

  -- Media
  photos text[] not null default '{}'::text[],
  videos text[] not null default '{}'::text[],
  virtual_tour_url text,

  -- Status
  status text not null default 'active' check (status in ('active', 'maintenance', 'inactive')),
  verified boolean not null default false,
  featured boolean not null default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Search
  search_vector tsvector
);

create index if not exists idx_vessels_owner on public.vessels(owner_id);
create index if not exists idx_vessels_captain on public.vessels(captain_id);
create index if not exists idx_vessels_type on public.vessels(vessel_type);
create index if not exists idx_vessels_category on public.vessels(category);
create index if not exists idx_vessels_location on public.vessels(home_latitude, home_longitude);
create index if not exists idx_vessels_status on public.vessels(status, verified);
create index if not exists idx_vessels_search on public.vessels using gin(search_vector);

-- Update timestamps + search vector
create or replace function public._trg_vessels_set_updated_at_and_search()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  new.search_vector :=
    setweight(to_tsvector('english', coalesce(new.name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(new.vessel_type::text, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(new.make, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(new.model, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(new.operating_area, '')), 'D') ||
    setweight(to_tsvector('english', coalesce(new.home_marina, '')), 'D');
  return new;
end;
$$;

drop trigger if exists trg_vessels_set_updated_at_and_search on public.vessels;
create trigger trg_vessels_set_updated_at_and_search
before insert or update on public.vessels
for each row execute function public._trg_vessels_set_updated_at_and_search();

-- Availability table
create table if not exists public.vessel_availability (
  id uuid primary key default gen_random_uuid(),
  vessel_id uuid not null references public.vessels(id) on delete cascade,

  day_of_week integer check (day_of_week between 0 and 6),
  start_time time,
  end_time time,

  specific_date date,
  available boolean not null default true,

  season_start date,
  season_end date,

  created_at timestamptz not null default now()
);

create index if not exists idx_vessel_availability_date on public.vessel_availability(vessel_id, specific_date);
create index if not exists idx_vessel_availability_dow on public.vessel_availability(vessel_id, day_of_week);

-- Best-effort: extend bookings if table exists
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'bookings'
  ) then
    alter table public.bookings add column if not exists vessel_id uuid references public.vessels(id);
    alter table public.bookings add column if not exists booking_type text default 'charter_fishing';
    alter table public.bookings add column if not exists rental_duration_hours numeric(5,2);
    alter table public.bookings add column if not exists requires_captain boolean default true;
    alter table public.bookings add column if not exists equipment_included jsonb default '[]'::jsonb;
    alter table public.bookings add column if not exists add_ons jsonb default '[]'::jsonb;
  end if;
end $$;

-- RLS
alter table public.vessels enable row level security;
alter table public.vessel_availability enable row level security;

-- Public can view active/verified vessels (public listings feed)
drop policy if exists "vessels_public_read_active" on public.vessels;
create policy "vessels_public_read_active"
on public.vessels
for select
using (status = 'active' and verified = true);

-- Owners can read their own (including inactive/unverified)
drop policy if exists "vessels_owner_read" on public.vessels;
create policy "vessels_owner_read"
on public.vessels
for select
to authenticated
using (auth.uid() = owner_id);

-- Owners can write their own
drop policy if exists "vessels_owner_insert" on public.vessels;
create policy "vessels_owner_insert"
on public.vessels
for insert
to authenticated
with check (auth.uid() = owner_id);

drop policy if exists "vessels_owner_update" on public.vessels;
create policy "vessels_owner_update"
on public.vessels
for update
to authenticated
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

drop policy if exists "vessels_owner_delete" on public.vessels;
create policy "vessels_owner_delete"
on public.vessels
for delete
to authenticated
using (auth.uid() = owner_id);

-- Availability policies
drop policy if exists "vessel_availability_public_read" on public.vessel_availability;
create policy "vessel_availability_public_read"
on public.vessel_availability
for select
using (
  exists (
    select 1 from public.vessels v
    where v.id = vessel_availability.vessel_id
      and v.status = 'active'
      and v.verified = true
  )
);

drop policy if exists "vessel_availability_owner_write" on public.vessel_availability;
create policy "vessel_availability_owner_write"
on public.vessel_availability
for all
to authenticated
using (
  exists (
    select 1 from public.vessels v
    where v.id = vessel_availability.vessel_id and v.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.vessels v
    where v.id = vessel_availability.vessel_id and v.owner_id = auth.uid()
  )
);

