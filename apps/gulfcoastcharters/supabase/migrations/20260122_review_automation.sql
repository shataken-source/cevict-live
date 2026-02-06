-- Post-Trip Review Automation System
-- Automated review requests, incentives, and moderation

-- Ensure UUID generator available
create extension if not exists pgcrypto;

-- Review request status enum
do $$
begin
  if not exists (
    select 1 from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'review_request_status_enum'
  ) then
    create type public.review_request_status_enum as enum (
      'pending',
      'sent',
      'reminded',
      'completed',
      'expired',
      'declined'
    );
  end if;
end $$;

-- Review requests table
create table if not exists public.review_requests (
  request_id uuid primary key default gen_random_uuid(),
  booking_id uuid references public.bookings(booking_id) on delete cascade,
  customer_id uuid references public.users(id) on delete cascade,
  captain_id uuid references public.captains(id) on delete cascade,
  trip_end_time timestamp with time zone not null,
  first_request_sent_at timestamp with time zone,
  first_reminder_sent_at timestamp with time zone,
  second_reminder_sent_at timestamp with time zone,
  final_reminder_sent_at timestamp with time zone,
  status review_request_status_enum not null default 'pending',
  review_id uuid references public.reviews(review_id) on delete set null,
  points_awarded integer default 0,
  expires_at timestamp with time zone not null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

-- Review moderation flags
create table if not exists public.review_moderation (
  moderation_id uuid primary key default gen_random_uuid(),
  review_id uuid references public.reviews(review_id) on delete cascade,
  flagged_reason text not null,
  flagged_by uuid references public.users(id) on delete set null,
  flagged_at timestamp with time zone not null default now(),
  reviewed_by uuid references public.users(id) on delete set null,
  reviewed_at timestamp with time zone,
  action_taken text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'edited')),
  notes text,
  created_at timestamp with time zone not null default now()
);

-- Review helpful votes
create table if not exists public.review_helpful_votes (
  vote_id uuid primary key default gen_random_uuid(),
  review_id uuid references public.reviews(review_id) on delete cascade,
  user_id uuid references public.users(id) on delete cascade,
  voted_at timestamp with time zone not null default now(),
  unique(review_id, user_id)
);

-- Indexes
create index if not exists idx_review_requests_booking on public.review_requests(booking_id);
create index if not exists idx_review_requests_customer on public.review_requests(customer_id);
create index if not exists idx_review_requests_status on public.review_requests(status);
create index if not exists idx_review_requests_expires on public.review_requests(expires_at);
create index if not exists idx_review_moderation_review on public.review_moderation(review_id);
create index if not exists idx_review_moderation_status on public.review_moderation(status);
create index if not exists idx_review_helpful_votes_review on public.review_helpful_votes(review_id);

-- Function to update updated_at
create or replace function update_review_requests_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Trigger for updated_at
drop trigger if exists trigger_update_review_requests_updated_at on public.review_requests;
create trigger trigger_update_review_requests_updated_at
  before update on public.review_requests
  for each row
  execute function update_review_requests_updated_at();

-- RLS Policies
alter table public.review_requests enable row level security;
alter table public.review_moderation enable row level security;
alter table public.review_helpful_votes enable row level security;

-- Users can view their review requests
create policy "Users can view their review requests"
  on public.review_requests for select
  using (auth.uid() = customer_id);

-- Captains can view review requests for their bookings
create policy "Captains can view review requests"
  on public.review_requests for select
  using (
    exists (
      select 1 from public.captains
      where id = captain_id and user_id = auth.uid()
    )
  );

-- Users can vote on review helpfulness
create policy "Users can vote on reviews"
  on public.review_helpful_votes for all
  using (auth.uid() = user_id);

-- Admins can view moderation
create policy "Admins can view moderation"
  on public.review_moderation for select
  using (
    exists (
      select 1 from public.users
      where id = auth.uid() and role = 'admin'
    )
  );

-- Service role full access
create policy "Service role review requests access"
  on public.review_requests for all
  using (auth.jwt() ->> 'role' = 'service_role');

create policy "Service role moderation access"
  on public.review_moderation for all
  using (auth.jwt() ->> 'role' = 'service_role');

create policy "Service role helpful votes access"
  on public.review_helpful_votes for all
  using (auth.jwt() ->> 'role' = 'service_role');
