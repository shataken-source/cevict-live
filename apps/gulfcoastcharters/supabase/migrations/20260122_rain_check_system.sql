-- Rain Check System
-- Allows captains to issue rain checks for cancelled trips
-- Customers can redeem rain checks for future bookings

-- Ensure UUID generator available
create extension if not exists pgcrypto;

-- Rain check status enum
do $$
begin
  if not exists (
    select 1 from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'rain_check_status_enum'
  ) then
    create type public.rain_check_status_enum as enum (
      'active',
      'redeemed',
      'expired',
      'transferred',
      'voided'
    );
  end if;
end $$;

-- Rain checks table
create table if not exists public.rain_checks (
  rain_check_id uuid primary key default gen_random_uuid(),
  code text not null unique,
  original_booking_id uuid references public.bookings(booking_id) on delete set null,
  customer_id uuid references public.users(id) on delete cascade,
  captain_id uuid references public.captains(id) on delete cascade,
  value decimal(10,2) not null check (value > 0),
  issued_date timestamp with time zone not null default now(),
  expiration_date timestamp with time zone not null,
  status rain_check_status_enum not null default 'active',
  cancellation_reason text,
  captain_message text,
  redeemed_booking_id uuid references public.bookings(booking_id) on delete set null,
  remaining_balance decimal(10,2) default 0 check (remaining_balance >= 0),
  transferred_to_user_id uuid references public.users(id) on delete set null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

-- Indexes for performance
create index if not exists idx_rain_checks_customer_id on public.rain_checks(customer_id);
create index if not exists idx_rain_checks_captain_id on public.rain_checks(captain_id);
create index if not exists idx_rain_checks_code on public.rain_checks(code);
create index if not exists idx_rain_checks_status on public.rain_checks(status);
create index if not exists idx_rain_checks_expiration on public.rain_checks(expiration_date);

-- Function to generate unique rain check code
create or replace function generate_rain_check_code()
returns text as $$
declare
  new_code text;
  exists_check boolean;
begin
  loop
    new_code := 'RC-' || to_char(now(), 'YYYY') || '-' || upper(substring(md5(random()::text) from 1 for 6));
    select exists(select 1 from public.rain_checks where code = new_code) into exists_check;
    exit when not exists_check;
  end loop;
  return new_code;
end;
$$ language plpgsql;

-- Function to update updated_at timestamp
create or replace function update_rain_checks_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Trigger for updated_at
drop trigger if exists trigger_update_rain_checks_updated_at on public.rain_checks;
create trigger trigger_update_rain_checks_updated_at
  before update on public.rain_checks
  for each row
  execute function update_rain_checks_updated_at();

-- RLS Policies
alter table public.rain_checks enable row level security;

-- Customers can view their own rain checks
create policy "Users can view their own rain checks"
  on public.rain_checks for select
  using (auth.uid() = customer_id or auth.uid() = transferred_to_user_id);

-- Captains can view rain checks they issued
create policy "Captains can view their issued rain checks"
  on public.rain_checks for select
  using (
    exists (
      select 1 from public.captains
      where id = captain_id and user_id = auth.uid()
    )
  );

-- Captains can create rain checks
create policy "Captains can create rain checks"
  on public.rain_checks for insert
  with check (
    exists (
      select 1 from public.captains
      where id = captain_id and user_id = auth.uid()
    )
  );

-- Captains can update their rain checks (extend expiration, void, etc.)
create policy "Captains can update their rain checks"
  on public.rain_checks for update
  using (
    exists (
      select 1 from public.captains
      where id = captain_id and user_id = auth.uid()
    )
  );

-- Service role can do everything
create policy "Service role full access"
  on public.rain_checks for all
  using (auth.jwt() ->> 'role' = 'service_role');
