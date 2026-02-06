-- Community Engagement: Fishing Journal, GCC University, Buddy Matching, Forums, Rewards

-- Ensure UUID generator available
create extension if not exists pgcrypto;

-- ============================================
-- FISHING JOURNAL & ANALYTICS
-- ============================================

create table if not exists public.fishing_journal_entries (
  entry_id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  trip_date date not null,
  trip_start_time timestamp with time zone,
  trip_end_time timestamp with time zone,
  location_name text,
  location_gps jsonb, -- {lat, lng}
  weather_data jsonb, -- {wind, temp, pressure, clouds}
  tide_stage text, -- incoming, outgoing, high, low
  tide_time timestamp with time zone,
  moon_phase text,
  moon_percentage decimal(5,2),
  water_conditions jsonb, -- {clarity, temp, color}
  bait_used text[],
  notes text,
  companions jsonb, -- Array of user IDs
  charter_captain_id uuid references public.captains(id) on delete set null,
  total_fish_caught integer default 0,
  total_hours decimal(5,2),
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create table if not exists public.journal_catches (
  catch_id uuid primary key default gen_random_uuid(),
  entry_id uuid references public.fishing_journal_entries(entry_id) on delete cascade,
  species text not null,
  size decimal(10,2), -- inches
  weight decimal(10,2), -- pounds
  photo_url text,
  bait_used text,
  released boolean default false,
  personal_record boolean default false,
  caught_at timestamp with time zone,
  created_at timestamp with time zone not null default now()
);

-- ============================================
-- GCC UNIVERSITY (LEARNING HUB)
-- ============================================

do $$
begin
  if not exists (
    select 1 from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'course_level_enum'
  ) then
    create type public.course_level_enum as enum (
      'beginner',
      'intermediate',
      'advanced'
    );
  end if;
end $$;

create table if not exists public.learning_courses (
  course_id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  category text not null,
  course_level course_level_enum not null,
  instructor_id uuid references public.captains(id) on delete set null,
  price decimal(10,2) default 0,
  free_for_pro boolean default false,
  video_urls text[],
  downloadable_resources jsonb,
  quiz_data jsonb,
  certificate_badge_id text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create table if not exists public.course_progress (
  progress_id uuid primary key default gen_random_uuid(),
  course_id uuid references public.learning_courses(course_id) on delete cascade,
  user_id uuid references public.users(id) on delete cascade,
  completed boolean default false,
  completion_percentage decimal(5,2) default 0,
  quiz_scores jsonb,
  completed_at timestamp with time zone,
  started_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  unique(course_id, user_id)
);

-- ============================================
-- FISHING BUDDY MATCHING
-- ============================================

create table if not exists public.buddy_profiles (
  profile_id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade unique,
  experience_level text not null check (experience_level in ('beginner', 'intermediate', 'advanced', 'expert')),
  target_species text[],
  fishing_style text[] check (array_length(fishing_style, 1) > 0), -- shore, wade, kayak, boat
  home_waters jsonb,
  availability_calendar jsonb, -- Days/times available
  boat_ownership text check (boat_ownership in ('have_boat', 'need_ride', 'either')),
  bio text,
  verified boolean default false,
  rating_average decimal(3,2) default 0,
  total_ratings integer default 0,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create table if not exists public.buddy_matches (
  match_id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  matched_user_id uuid references public.users(id) on delete cascade,
  match_score decimal(5,2), -- AI-calculated compatibility score
  match_reasons text[], -- Why they matched
  status text default 'pending' check (status in ('pending', 'accepted', 'rejected', 'blocked')),
  created_at timestamp with time zone not null default now(),
  unique(user_id, matched_user_id)
);

create table if not exists public.buddy_ratings (
  rating_id uuid primary key default gen_random_uuid(),
  rater_id uuid references public.users(id) on delete cascade,
  rated_user_id uuid references public.users(id) on delete cascade,
  trip_id uuid, -- Reference to fishing trip
  rating integer not null check (rating >= 1 and rating <= 5),
  comment text,
  created_at timestamp with time zone not null default now(),
  unique(rater_id, rated_user_id, trip_id)
);

-- ============================================
-- COMMUNITY FORUMS
-- ============================================

create table if not exists public.forum_categories (
  category_id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  category_type text not null check (category_type in ('regional', 'species', 'topic')),
  parent_category_id uuid references public.forum_categories(category_id) on delete set null,
  display_order integer default 0,
  created_at timestamp with time zone not null default now()
);

create table if not exists public.forum_threads (
  thread_id uuid primary key default gen_random_uuid(),
  category_id uuid references public.forum_categories(category_id) on delete cascade,
  user_id uuid references public.users(id) on delete cascade,
  title text not null,
  content text not null,
  pinned boolean default false,
  locked boolean default false,
  views_count integer default 0,
  replies_count integer default 0,
  last_reply_at timestamp with time zone,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create table if not exists public.forum_posts (
  post_id uuid primary key default gen_random_uuid(),
  thread_id uuid references public.forum_threads(thread_id) on delete cascade,
  user_id uuid references public.users(id) on delete cascade,
  content text not null,
  is_best_answer boolean default false,
  helpful_votes integer default 0,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create table if not exists public.forum_post_votes (
  vote_id uuid primary key default gen_random_uuid(),
  post_id uuid references public.forum_posts(post_id) on delete cascade,
  user_id uuid references public.users(id) on delete cascade,
  voted_at timestamp with time zone not null default now(),
  unique(post_id, user_id)
);

-- ============================================
-- REWARDS STORE
-- ============================================

do $$
begin
  if not exists (
    select 1 from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'reward_type_enum'
  ) then
    create type public.reward_type_enum as enum (
      'charter_credit',
      'gear_merchandise',
      'platform_feature',
      'experience',
      'charitable_donation'
    );
  end if;
end $$;

create table if not exists public.rewards_catalog (
  reward_id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  reward_type reward_type_enum not null,
  points_cost integer not null,
  value decimal(10,2), -- Dollar value if applicable
  image_url text,
  available_quantity integer, -- null = unlimited
  redemption_limit_per_user integer default 1,
  active boolean default true,
  created_at timestamp with time zone not null default now()
);

create table if not exists public.rewards_redemptions (
  redemption_id uuid primary key default gen_random_uuid(),
  reward_id uuid references public.rewards_catalog(reward_id) on delete cascade,
  user_id uuid references public.users(id) on delete cascade,
  points_spent integer not null,
  redemption_code text, -- For gift cards, etc.
  status text default 'pending' check (status in ('pending', 'fulfilled', 'cancelled')),
  fulfilled_at timestamp with time zone,
  created_at timestamp with time zone not null default now()
);

-- Indexes
create index if not exists idx_journal_entries_user_date on public.fishing_journal_entries(user_id, trip_date desc);
create index if not exists idx_journal_catches_entry on public.journal_catches(entry_id);
create index if not exists idx_course_progress_user on public.course_progress(user_id, completed);
create index if not exists idx_buddy_matches_user on public.buddy_matches(user_id, status);
create index if not exists idx_forum_threads_category on public.forum_threads(category_id, last_reply_at desc);
create index if not exists idx_forum_posts_thread on public.forum_posts(thread_id, created_at);
create index if not exists idx_rewards_redemptions_user on public.rewards_redemptions(user_id, created_at desc);

-- RLS Policies
alter table public.fishing_journal_entries enable row level security;
alter table public.journal_catches enable row level security;
alter table public.learning_courses enable row level security;
alter table public.course_progress enable row level security;
alter table public.buddy_profiles enable row level security;
alter table public.buddy_matches enable row level security;
alter table public.buddy_ratings enable row level security;
alter table public.forum_categories enable row level security;
alter table public.forum_threads enable row level security;
alter table public.forum_posts enable row level security;
alter table public.forum_post_votes enable row level security;
alter table public.rewards_catalog enable row level security;
alter table public.rewards_redemptions enable row level security;

-- Users manage their own journal
create policy "Users manage own journal"
  on public.fishing_journal_entries for all
  using (auth.uid() = user_id);

-- Public can view courses
create policy "Public view courses"
  on public.learning_courses for select
  using (true);

-- Users manage their progress
create policy "Users manage own progress"
  on public.course_progress for all
  using (auth.uid() = user_id);

-- Users manage their buddy profile
create policy "Users manage own buddy profile"
  on public.buddy_profiles for all
  using (auth.uid() = user_id);

-- Users view their matches
create policy "Users view own matches"
  on public.buddy_matches for select
  using (auth.uid() = user_id or auth.uid() = matched_user_id);

-- Public can view forums
create policy "Public view forums"
  on public.forum_categories for select
  using (true);

create policy "Public view threads"
  on public.forum_threads for select
  using (true);

create policy "Public view posts"
  on public.forum_posts for select
  using (true);

-- Users can create threads and posts
create policy "Users create threads"
  on public.forum_threads for insert
  with check (auth.uid() = user_id);

create policy "Users create posts"
  on public.forum_posts for insert
  with check (auth.uid() = user_id);

-- Public can view rewards
create policy "Public view rewards"
  on public.rewards_catalog for select
  using (active = true);

-- Users view their redemptions
create policy "Users view own redemptions"
  on public.rewards_redemptions for select
  using (auth.uid() = user_id);

-- Users can redeem rewards
create policy "Users redeem rewards"
  on public.rewards_redemptions for insert
  with check (auth.uid() = user_id);

-- Service role full access
create policy "Service role journal"
  on public.fishing_journal_entries for all
  using (auth.jwt() ->> 'role' = 'service_role');

create policy "Service role forums"
  on public.forum_threads for all
  using (auth.jwt() ->> 'role' = 'service_role');

create policy "Service role rewards"
  on public.rewards_catalog for all
  using (auth.jwt() ->> 'role' = 'service_role');
