-- Live Booking Calendar System
-- Real-time availability, booking holds, and waitlist

-- Ensure UUID generator available
create extension if not exists pgcrypto;

-- Time slot enum
do $$
begin
  if not exists (
    select 1 from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'time_slot_enum'
  ) then
    create type public.time_slot_enum as enum (
      'morning',
      'afternoon',
      'full_day',
      'custom',
      'overnight'
    );
  end if;
end $$;

-- Availability status enum
do $$
begin
  if not exists (
    select 1 from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'availability_status_enum'
  ) then
    create type public.availability_status_enum as enum (
      'available',
      'booked',
      'blocked',
      'pending',
      'hold'
    );
  end if;
end $$;

-- Calendar availability table
create table if not exists public.calendar_availability (
  availability_id uuid primary key default gen_random_uuid(),
  captain_id uuid references public.captains(id) on delete cascade,
  date date not null,
  time_slot time_slot_enum not null,
  start_time time,
  end_time time,
  status availability_status_enum not null default 'available',
  booking_id uuid references public.bookings(booking_id) on delete set null,
  max_passengers integer,
  current_passengers integer default 0,
  price decimal(10,2),
  notes text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  unique(captain_id, date, time_slot, start_time, end_time)
);

-- Booking holds table (15-minute holds during booking process)
create table if not exists public.booking_holds (
  hold_id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  availability_id uuid references public.calendar_availability(availability_id) on delete cascade,
  held_at timestamp with time zone not null default now(),
  expires_at timestamp with time zone not null,
  extended boolean default false,
  booking_data jsonb,
  created_at timestamp with time zone not null default now()
);

-- Waitlist status enum
do $$
begin
  if not exists (
    select 1 from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'waitlist_status_enum'
  ) then
    create type public.waitlist_status_enum as enum (
      'waiting',
      'notified',
      'booked',
      'expired',
      'cancelled'
    );
  end if;
end $$;

-- Waitlist table
create table if not exists public.waitlist (
  waitlist_id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  captain_id uuid references public.captains(id) on delete cascade,
  desired_date date not null,
  trip_type text,
  time_slot_preference time_slot_enum,
  added_at timestamp with time zone not null default now(),
  position integer not null,
  notified boolean default false,
  notified_at timestamp with time zone,
  status waitlist_status_enum not null default 'waiting',
  expires_at timestamp with time zone,
  created_at timestamp with time zone not null default now()
);

-- Indexes
create index if not exists idx_calendar_availability_captain_date on public.calendar_availability(captain_id, date);
create index if not exists idx_calendar_availability_status on public.calendar_availability(status);
create index if not exists idx_booking_holds_user on public.booking_holds(user_id);
create index if not exists idx_booking_holds_expires on public.booking_holds(expires_at);
create index if not exists idx_waitlist_captain_date on public.waitlist(captain_id, desired_date);
create index if not exists idx_waitlist_user on public.waitlist(user_id);
create index if not exists idx_waitlist_status on public.waitlist(status);

-- Function to update updated_at
create or replace function update_calendar_availability_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Trigger for updated_at
drop trigger if exists trigger_update_calendar_availability_updated_at on public.calendar_availability;
create trigger trigger_update_calendar_availability_updated_at
  before update on public.calendar_availability
  for each row
  execute function update_calendar_availability_updated_at();

-- Function to automatically expire holds
create or replace function expire_booking_holds()
returns void as $$
begin
  delete from public.booking_holds
  where expires_at < now();
end;
$$ language plpgsql;

-- RLS Policies
alter table public.calendar_availability enable row level security;
alter table public.booking_holds enable row level security;
alter table public.waitlist enable row level security;

-- Public can view available slots
create policy "Public can view available calendar"
  on public.calendar_availability for select
  using (status in ('available', 'hold'));

-- Captains can manage their calendar
create policy "Captains can manage their calendar"
  on public.calendar_availability for all
  using (
    exists (
      select 1 from public.captains
      where id = captain_id and user_id = auth.uid()
    )
  );

-- Users can view their holds
create policy "Users can view their holds"
  on public.booking_holds for select
  using (auth.uid() = user_id);

-- Users can create holds
create policy "Users can create holds"
  on public.booking_holds for insert
  with check (auth.uid() = user_id);

-- Users can view their waitlist entries
create policy "Users can view their waitlist"
  on public.waitlist for select
  using (auth.uid() = user_id);

-- Users can join waitlist
create policy "Users can join waitlist"
  on public.waitlist for insert
  with check (auth.uid() = user_id);

-- Captains can view waitlist for their dates
create policy "Captains can view waitlist"
  on public.waitlist for select
  using (
    exists (
      select 1 from public.captains
      where id = captain_id and user_id = auth.uid()
    )
  );

-- Service role full access
create policy "Service role calendar access"
  on public.calendar_availability for all
  using (auth.jwt() ->> 'role' = 'service_role');

create policy "Service role holds access"
  on public.booking_holds for all
  using (auth.jwt() ->> 'role' = 'service_role');

create policy "Service role waitlist access"
  on public.waitlist for all
  using (auth.jwt() ->> 'role' = 'service_role');
