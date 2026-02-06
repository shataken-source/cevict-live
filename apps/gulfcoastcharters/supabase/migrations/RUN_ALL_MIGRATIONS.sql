-- ============================================
-- ALL MIGRATIONS - COMPLETE BOOKING EXPERIENCE
-- ============================================
-- Copy this entire file and paste into Supabase SQL Editor
-- Run in order: Part 1, Part 2, Part 3, Part 4, Part 5, Part 6
-- ============================================

-- ============================================
-- PART 1: RAIN CHECK SYSTEM
-- ============================================

-- Rain Check System
-- Allows captains to issue rain checks for cancelled trips
-- Customers can redeem rain checks for future bookings

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

create index if not exists idx_rain_checks_customer_id on public.rain_checks(customer_id);
create index if not exists idx_rain_checks_captain_id on public.rain_checks(captain_id);
create index if not exists idx_rain_checks_code on public.rain_checks(code);
create index if not exists idx_rain_checks_status on public.rain_checks(status);
create index if not exists idx_rain_checks_expiration on public.rain_checks(expiration_date);

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

create or replace function update_rain_checks_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trigger_update_rain_checks_updated_at on public.rain_checks;
create trigger trigger_update_rain_checks_updated_at
  before update on public.rain_checks
  for each row
  execute function update_rain_checks_updated_at();

alter table public.rain_checks enable row level security;

create policy "Users can view their own rain checks"
  on public.rain_checks for select
  using (auth.uid() = customer_id or auth.uid() = transferred_to_user_id);

create policy "Captains can view their issued rain checks"
  on public.rain_checks for select
  using (
    exists (
      select 1 from public.captains
      where id = captain_id and user_id = auth.uid()
    )
  );

create policy "Captains can create rain checks"
  on public.rain_checks for insert
  with check (
    exists (
      select 1 from public.captains
      where id = captain_id and user_id = auth.uid()
    )
  );

create policy "Captains can update their rain checks"
  on public.rain_checks for update
  using (
    exists (
      select 1 from public.captains
      where id = captain_id and user_id = auth.uid()
    )
  );

create policy "Service role full access"
  on public.rain_checks for all
  using (auth.jwt() ->> 'role' = 'service_role');

-- ============================================
-- PART 2: CALENDAR AVAILABILITY SYSTEM
-- ============================================

-- Live Booking Calendar System
-- Real-time availability, booking holds, and waitlist

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

create index if not exists idx_calendar_availability_captain_date on public.calendar_availability(captain_id, date);
create index if not exists idx_calendar_availability_status on public.calendar_availability(status);
create index if not exists idx_booking_holds_user on public.booking_holds(user_id);
create index if not exists idx_booking_holds_expires on public.booking_holds(expires_at);
create index if not exists idx_waitlist_captain_date on public.waitlist(captain_id, desired_date);
create index if not exists idx_waitlist_user on public.waitlist(user_id);
create index if not exists idx_waitlist_status on public.waitlist(status);

create or replace function update_calendar_availability_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trigger_update_calendar_availability_updated_at on public.calendar_availability;
create trigger trigger_update_calendar_availability_updated_at
  before update on public.calendar_availability
  for each row
  execute function update_calendar_availability_updated_at();

create or replace function expire_booking_holds()
returns void as $$
begin
  delete from public.booking_holds
  where expires_at < now();
end;
$$ language plpgsql;

alter table public.calendar_availability enable row level security;
alter table public.booking_holds enable row level security;
alter table public.waitlist enable row level security;

create policy "Public can view available calendar"
  on public.calendar_availability for select
  using (status in ('available', 'hold'));

create policy "Captains can manage their calendar"
  on public.calendar_availability for all
  using (
    exists (
      select 1 from public.captains
      where id = captain_id and user_id = auth.uid()
    )
  );

create policy "Users can view their holds"
  on public.booking_holds for select
  using (auth.uid() = user_id);

create policy "Users can create holds"
  on public.booking_holds for insert
  with check (auth.uid() = user_id);

create policy "Users can view their waitlist"
  on public.waitlist for select
  using (auth.uid() = user_id);

create policy "Users can join waitlist"
  on public.waitlist for insert
  with check (auth.uid() = user_id);

create policy "Captains can view waitlist"
  on public.waitlist for select
  using (
    exists (
      select 1 from public.captains
      where id = captain_id and user_id = auth.uid()
    )
  );

create policy "Service role calendar access"
  on public.calendar_availability for all
  using (auth.jwt() ->> 'role' = 'service_role');

create policy "Service role holds access"
  on public.booking_holds for all
  using (auth.jwt() ->> 'role' = 'service_role');

create policy "Service role waitlist access"
  on public.waitlist for all
  using (auth.jwt() ->> 'role' = 'service_role');

-- ============================================
-- PART 3: TIPPING SYSTEM
-- ============================================

-- Post-Trip Tipping System
-- Allows customers to tip captains and crew after trips

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

create index if not exists idx_tips_booking on public.tips(booking_id);
create index if not exists idx_tips_customer on public.tips(customer_id);
create index if not exists idx_tips_status on public.tips(status);
create index if not exists idx_tip_distributions_tip on public.tip_distributions(tip_id);
create index if not exists idx_tip_distributions_recipient on public.tip_distributions(recipient_id);

create or replace function update_tips_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trigger_update_tips_updated_at on public.tips;
create trigger trigger_update_tips_updated_at
  before update on public.tips
  for each row
  execute function update_tips_updated_at();

alter table public.tips enable row level security;
alter table public.tip_distributions enable row level security;

create policy "Customers can view their tips"
  on public.tips for select
  using (auth.uid() = customer_id);

create policy "Customers can create tips"
  on public.tips for insert
  with check (auth.uid() = customer_id);

create policy "Recipients can view their distributions"
  on public.tip_distributions for select
  using (auth.uid() = recipient_id);

create policy "Captains can view tips for their bookings"
  on public.tips for select
  using (
    exists (
      select 1 from public.bookings b
      join public.captains c on c.id = b.captain_id
      where b.booking_id = tips.booking_id and c.user_id = auth.uid()
    )
  );

create policy "Service role tips access"
  on public.tips for all
  using (auth.jwt() ->> 'role' = 'service_role');

create policy "Service role distributions access"
  on public.tip_distributions for all
  using (auth.jwt() ->> 'role' = 'service_role');

-- ============================================
-- PART 4: REVIEW AUTOMATION
-- ============================================

-- Post-Trip Review Automation System
-- Automated review requests, incentives, and moderation

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

create table if not exists public.review_helpful_votes (
  vote_id uuid primary key default gen_random_uuid(),
  review_id uuid references public.reviews(review_id) on delete cascade,
  user_id uuid references public.users(id) on delete cascade,
  voted_at timestamp with time zone not null default now(),
  unique(review_id, user_id)
);

create index if not exists idx_review_requests_booking on public.review_requests(booking_id);
create index if not exists idx_review_requests_customer on public.review_requests(customer_id);
create index if not exists idx_review_requests_status on public.review_requests(status);
create index if not exists idx_review_requests_expires on public.review_requests(expires_at);
create index if not exists idx_review_moderation_review on public.review_moderation(review_id);
create index if not exists idx_review_moderation_status on public.review_moderation(status);
create index if not exists idx_review_helpful_votes_review on public.review_helpful_votes(review_id);

create or replace function update_review_requests_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trigger_update_review_requests_updated_at on public.review_requests;
create trigger trigger_update_review_requests_updated_at
  before update on public.review_requests
  for each row
  execute function update_review_requests_updated_at();

alter table public.review_requests enable row level security;
alter table public.review_moderation enable row level security;
alter table public.review_helpful_votes enable row level security;

create policy "Users can view their review requests"
  on public.review_requests for select
  using (auth.uid() = customer_id);

create policy "Captains can view review requests"
  on public.review_requests for select
  using (
    exists (
      select 1 from public.captains
      where id = captain_id and user_id = auth.uid()
    )
  );

create policy "Users can vote on reviews"
  on public.review_helpful_votes for all
  using (auth.uid() = user_id);

create policy "Admins can view moderation"
  on public.review_moderation for select
  using (
    exists (
      select 1 from public.users
      where id = auth.uid() and role = 'admin'
    )
  );

create policy "Service role review requests access"
  on public.review_requests for all
  using (auth.jwt() ->> 'role' = 'service_role');

create policy "Service role moderation access"
  on public.review_moderation for all
  using (auth.jwt() ->> 'role' = 'service_role');

create policy "Service role helpful votes access"
  on public.review_helpful_votes for all
  using (auth.jwt() ->> 'role' = 'service_role');

-- ============================================
-- PART 5: GIFT CERTIFICATES
-- ============================================

-- Gift Certificate System
-- Complete gift card purchase and redemption

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

create table if not exists public.gift_certificate_redemptions (
  redemption_id uuid primary key default gen_random_uuid(),
  certificate_id uuid references public.gift_certificates(certificate_id) on delete cascade,
  booking_id uuid references public.bookings(booking_id) on delete set null,
  amount_used decimal(10,2) not null check (amount_used > 0),
  redeemed_at timestamp with time zone not null default now(),
  redeemed_by uuid references public.users(id) on delete set null,
  created_at timestamp with time zone not null default now()
);

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

create or replace function update_gift_certificates_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trigger_update_gift_certificates_updated_at on public.gift_certificates;
create trigger trigger_update_gift_certificates_updated_at
  before update on public.gift_certificates
  for each row
  execute function update_gift_certificates_updated_at();

create index if not exists idx_gift_certificates_code on public.gift_certificates(code);
create index if not exists idx_gift_certificates_purchaser on public.gift_certificates(purchaser_id);
create index if not exists idx_gift_certificates_recipient_email on public.gift_certificates(recipient_email);
create index if not exists idx_gift_certificates_status on public.gift_certificates(status);
create index if not exists idx_gift_certificate_redemptions_certificate on public.gift_certificate_redemptions(certificate_id);

alter table public.gift_certificates enable row level security;
alter table public.gift_certificate_redemptions enable row level security;

create policy "Purchasers can view their certificates"
  on public.gift_certificates for select
  using (auth.uid() = purchaser_id);

create policy "Users can view certificates for their email"
  on public.gift_certificates for select
  using (
    exists (
      select 1 from public.users
      where id = auth.uid() and email = recipient_email
    )
  );

create policy "Users can purchase gift certificates"
  on public.gift_certificates for insert
  with check (auth.uid() = purchaser_id);

create policy "Users can view their redemptions"
  on public.gift_certificate_redemptions for select
  using (auth.uid() = redeemed_by);

create policy "Service role gift certificates access"
  on public.gift_certificates for all
  using (auth.jwt() ->> 'role' = 'service_role');

create policy "Service role redemptions access"
  on public.gift_certificate_redemptions for all
  using (auth.jwt() ->> 'role' = 'service_role');

-- ============================================
-- PART 6: COMMUNITY ENGAGEMENT (ALL 3 PARTS)
-- ============================================
-- This section includes all community engagement tables
-- See ALL_COMMUNITY_MIGRATIONS.sql for the complete community system

-- Note: The community engagement migrations are in a separate file
-- Run ALL_COMMUNITY_MIGRATIONS.sql after this file completes

-- ============================================
-- VERIFICATION QUERY (Run after all migrations)
-- ============================================

-- SELECT table_name 
-- FROM information_schema.tables 
-- WHERE table_schema = 'public' 
-- AND table_name IN (
--   'rain_checks',
--   'calendar_availability',
--   'booking_holds',
--   'waitlist',
--   'tips',
--   'tip_distributions',
--   'review_requests',
--   'review_moderation',
--   'review_helpful_votes',
--   'gift_certificates',
--   'gift_certificate_redemptions',
--   'daily_check_ins',
--   'daily_challenges',
--   'challenge_completions',
--   'user_forecast_preferences',
--   'user_connections',
--   'activity_feed',
--   'feed_engagement',
--   'feed_comments',
--   'conversations',
--   'conversation_participants',
--   'messages',
--   'photo_contests',
--   'contest_entries',
--   'contest_votes',
--   'tournaments',
--   'tournament_entries',
--   'tournament_submissions',
--   'stories',
--   'story_views',
--   'video_reels',
--   'reel_engagement',
--   'fishing_journal_entries',
--   'journal_catches',
--   'learning_courses',
--   'course_progress',
--   'buddy_profiles',
--   'buddy_matches',
--   'buddy_ratings',
--   'forum_categories',
--   'forum_threads',
--   'forum_posts',
--   'forum_post_votes',
--   'rewards_catalog',
--   'rewards_redemptions'
-- )
-- ORDER BY table_name;
