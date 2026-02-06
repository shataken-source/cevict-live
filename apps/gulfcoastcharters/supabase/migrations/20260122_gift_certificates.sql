-- Gift Certificate System
-- Complete gift card purchase and redemption

-- Ensure UUID generator available
create extension if not exists pgcrypto;

-- Gift certificate status enum
do $$
begin
  if not exists (
    select 1 from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'gift_certificate_status_enum'
  ) then
    create type public.gift_certificate_status_enum as enum (
      'pending',
      'active',
      'redeemed',
      'expired',
      'voided'
    );
  end if;
end $$;

-- Gift certificates table
create table if not exists public.gift_certificates (
  certificate_id uuid primary key default gen_random_uuid(),
  code text not null unique,
  purchaser_id uuid references public.users(id) on delete set null,
  recipient_email text not null,
  recipient_name text,
  amount decimal(10,2) not null check (amount > 0),
  remaining_balance decimal(10,2) not null check (remaining_balance >= 0),
  captain_id uuid references public.captains(id) on delete set null,
  trip_type text,
  message text,
  status gift_certificate_status_enum not null default 'pending',
  purchased_at timestamp with time zone not null default now(),
  expires_at timestamp with time zone,
  redeemed_at timestamp with time zone,
  stripe_payment_intent_id text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

-- Gift certificate redemptions table
create table if not exists public.gift_certificate_redemptions (
  redemption_id uuid primary key default gen_random_uuid(),
  certificate_id uuid references public.gift_certificates(certificate_id) on delete cascade,
  booking_id uuid references public.bookings(booking_id) on delete set null,
  amount_used decimal(10,2) not null check (amount_used > 0),
  redeemed_at timestamp with time zone not null default now(),
  redeemed_by uuid references public.users(id) on delete set null,
  created_at timestamp with time zone not null default now()
);

-- Function to generate unique gift certificate code
create or replace function generate_gift_certificate_code()
returns text as $$
declare
  new_code text;
  exists_check boolean;
begin
  loop
    new_code := 'GCC-' || upper(substring(md5(random()::text) from 1 for 8));
    select exists(select 1 from public.gift_certificates where code = new_code) into exists_check;
    exit when not exists_check;
  end loop;
  return new_code;
end;
$$ language plpgsql;

-- Function to update updated_at
create or replace function update_gift_certificates_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Trigger for updated_at
drop trigger if exists trigger_update_gift_certificates_updated_at on public.gift_certificates;
create trigger trigger_update_gift_certificates_updated_at
  before update on public.gift_certificates
  for each row
  execute function update_gift_certificates_updated_at();

-- Indexes
create index if not exists idx_gift_certificates_code on public.gift_certificates(code);
create index if not exists idx_gift_certificates_purchaser on public.gift_certificates(purchaser_id);
create index if not exists idx_gift_certificates_recipient_email on public.gift_certificates(recipient_email);
create index if not exists idx_gift_certificates_status on public.gift_certificates(status);
create index if not exists idx_gift_certificate_redemptions_certificate on public.gift_certificate_redemptions(certificate_id);

-- RLS Policies
alter table public.gift_certificates enable row level security;
alter table public.gift_certificate_redemptions enable row level security;

-- Purchasers can view their purchased certificates
create policy "Purchasers can view their certificates"
  on public.gift_certificates for select
  using (auth.uid() = purchaser_id);

-- Users can view certificates sent to their email
create policy "Users can view certificates for their email"
  on public.gift_certificates for select
  using (
    exists (
      select 1 from public.users
      where id = auth.uid() and email = recipient_email
    )
  );

-- Users can purchase gift certificates
create policy "Users can purchase gift certificates"
  on public.gift_certificates for insert
  with check (auth.uid() = purchaser_id);

-- Users can view their redemptions
create policy "Users can view their redemptions"
  on public.gift_certificate_redemptions for select
  using (auth.uid() = redeemed_by);

-- Service role full access
create policy "Service role gift certificates access"
  on public.gift_certificates for all
  using (auth.jwt() ->> 'role' = 'service_role');

create policy "Service role redemptions access"
  on public.gift_certificate_redemptions for all
  using (auth.jwt() ->> 'role' = 'service_role');
