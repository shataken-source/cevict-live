-- Post-Trip Tipping System
-- Allows customers to tip captains and crew after trips

-- Ensure UUID generator available
create extension if not exists pgcrypto;

-- Tips table
create table if not exists public.tips (
  tip_id uuid primary key default gen_random_uuid(),
  booking_id uuid references public.bookings(booking_id) on delete cascade,
  customer_id uuid references public.users(id) on delete cascade,
  amount decimal(10,2) not null check (amount > 0),
  percentage decimal(5,2),
  platform_fee decimal(10,2) not null default 0,
  net_amount decimal(10,2) not null,
  customer_message text,
  tipped_at timestamp with time zone not null default now(),
  payment_method text,
  stripe_transaction_id text,
  stripe_payment_intent_id text,
  status text not null default 'pending' check (status in ('pending', 'completed', 'failed', 'refunded')),
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

-- Tip recipient type enum
do $$
begin
  if not exists (
    select 1 from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'tip_recipient_type_enum'
  ) then
    create type public.tip_recipient_type_enum as enum (
      'captain',
      'crew'
    );
  end if;
end $$;

-- Tip distributions table (for crew splitting)
create table if not exists public.tip_distributions (
  distribution_id uuid primary key default gen_random_uuid(),
  tip_id uuid references public.tips(tip_id) on delete cascade,
  recipient_id uuid references public.users(id) on delete cascade,
  recipient_type tip_recipient_type_enum not null,
  amount decimal(10,2) not null check (amount > 0),
  percentage decimal(5,2) not null,
  paid_out boolean default false,
  paid_out_at timestamp with time zone,
  stripe_transfer_id text,
  created_at timestamp with time zone not null default now()
);

-- Indexes
create index if not exists idx_tips_booking on public.tips(booking_id);
create index if not exists idx_tips_customer on public.tips(customer_id);
create index if not exists idx_tips_status on public.tips(status);
create index if not exists idx_tip_distributions_tip on public.tip_distributions(tip_id);
create index if not exists idx_tip_distributions_recipient on public.tip_distributions(recipient_id);

-- Function to update updated_at
create or replace function update_tips_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Trigger for updated_at
drop trigger if exists trigger_update_tips_updated_at on public.tips;
create trigger trigger_update_tips_updated_at
  before update on public.tips
  for each row
  execute function update_tips_updated_at();

-- RLS Policies
alter table public.tips enable row level security;
alter table public.tip_distributions enable row level security;

-- Customers can view their tips
create policy "Customers can view their tips"
  on public.tips for select
  using (auth.uid() = customer_id);

-- Customers can create tips
create policy "Customers can create tips"
  on public.tips for insert
  with check (auth.uid() = customer_id);

-- Recipients can view their tip distributions
create policy "Recipients can view their distributions"
  on public.tip_distributions for select
  using (auth.uid() = recipient_id);

-- Captains can view tips for their bookings
create policy "Captains can view tips for their bookings"
  on public.tips for select
  using (
    exists (
      select 1 from public.bookings b
      join public.captains c on c.id = b.captain_id
      where b.booking_id = tips.booking_id and c.user_id = auth.uid()
    )
  );

-- Service role full access
create policy "Service role tips access"
  on public.tips for all
  using (auth.jwt() ->> 'role' = 'service_role');

create policy "Service role distributions access"
  on public.tip_distributions for all
  using (auth.jwt() ->> 'role' = 'service_role');
