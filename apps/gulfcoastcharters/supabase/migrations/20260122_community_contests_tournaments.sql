-- Community Engagement: Contests, Tournaments, Stories, Videos

-- Ensure UUID generator available
create extension if not exists pgcrypto;

-- ============================================
-- PHOTO CONTESTS
-- ============================================

do $$
begin
  if not exists (
    select 1 from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'contest_category_enum'
  ) then
    create type public.contest_category_enum as enum (
      'catch_of_week',
      'monster_monday',
      'scenery_saturday',
      'funny_friday',
      'sunrise_sunset'
    );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'contest_status_enum'
  ) then
    create type public.contest_status_enum as enum (
      'announced',
      'open',
      'voting',
      'closed',
      'winners_announced'
    );
  end if;
end $$;

create table if not exists public.photo_contests (
  contest_id uuid primary key default gen_random_uuid(),
  title text not null,
  category contest_category_enum not null,
  description text,
  status contest_status_enum not null default 'announced',
  submission_start timestamp with time zone not null,
  submission_end timestamp with time zone not null,
  voting_start timestamp with time zone not null,
  voting_end timestamp with time zone not null,
  winners_announced_at timestamp with time zone,
  created_at timestamp with time zone not null default now()
);

create table if not exists public.contest_entries (
  entry_id uuid primary key default gen_random_uuid(),
  contest_id uuid references public.photo_contests(contest_id) on delete cascade,
  user_id uuid references public.users(id) on delete cascade,
  feed_id uuid references public.activity_feed(feed_id) on delete cascade,
  votes_count integer default 0,
  final_rank integer,
  prize_awarded jsonb,
  submitted_at timestamp with time zone not null default now(),
  unique(contest_id, user_id)
);

create table if not exists public.contest_votes (
  vote_id uuid primary key default gen_random_uuid(),
  contest_id uuid references public.photo_contests(contest_id) on delete cascade,
  entry_id uuid references public.contest_entries(entry_id) on delete cascade,
  user_id uuid references public.users(id) on delete cascade,
  voted_at timestamp with time zone not null default now(),
  unique(contest_id, entry_id, user_id)
);

-- ============================================
-- TOURNAMENTS
-- ============================================

do $$
begin
  if not exists (
    select 1 from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'tournament_type_enum'
  ) then
    create type public.tournament_type_enum as enum (
      'species_specific',
      'challenge',
      'numbers_game',
      'explorer',
      'conservation'
    );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'tournament_status_enum'
  ) then
    create type public.tournament_status_enum as enum (
      'announced',
      'registration_open',
      'active',
      'completed',
      'winners_announced'
    );
  end if;
end $$;

create table if not exists public.tournaments (
  tournament_id uuid primary key default gen_random_uuid(),
  title text not null,
  tournament_type tournament_type_enum not null,
  description text,
  target_species text[],
  status tournament_status_enum not null default 'announced',
  registration_start timestamp with time zone not null,
  registration_end timestamp with time zone not null,
  tournament_start timestamp with time zone not null,
  tournament_end timestamp with time zone not null,
  entry_fee decimal(10,2) default 0,
  prize_structure jsonb, -- Prize breakdown
  rules jsonb,
  created_at timestamp with time zone not null default now()
);

create table if not exists public.tournament_entries (
  entry_id uuid primary key default gen_random_uuid(),
  tournament_id uuid references public.tournaments(tournament_id) on delete cascade,
  user_id uuid references public.users(id) on delete cascade,
  entry_fee_paid decimal(10,2) default 0,
  payment_status text default 'pending',
  total_score decimal(10,2) default 0,
  final_rank integer,
  prize_awarded jsonb,
  registered_at timestamp with time zone not null default now(),
  unique(tournament_id, user_id)
);

create table if not exists public.tournament_submissions (
  submission_id uuid primary key default gen_random_uuid(),
  tournament_id uuid references public.tournaments(tournament_id) on delete cascade,
  entry_id uuid references public.tournament_entries(entry_id) on delete cascade,
  user_id uuid references public.users(id) on delete cascade,
  species text,
  size decimal(10,2),
  weight decimal(10,2),
  photo_url text,
  location_data jsonb,
  gps_verified boolean default false,
  timestamp_verified boolean default false,
  measurement_verified boolean default false,
  score decimal(10,2),
  submitted_at timestamp with time zone not null default now()
);

-- ============================================
-- STORIES & VIDEO REELS
-- ============================================

create table if not exists public.stories (
  story_id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  media_type text not null check (media_type in ('photo', 'video')),
  media_url text not null,
  caption text,
  location_data jsonb,
  weather_data jsonb,
  expires_at timestamp with time zone not null,
  views_count integer default 0,
  created_at timestamp with time zone not null default now()
);

create table if not exists public.story_views (
  view_id uuid primary key default gen_random_uuid(),
  story_id uuid references public.stories(story_id) on delete cascade,
  user_id uuid references public.users(id) on delete cascade,
  viewed_at timestamp with time zone not null default now(),
  unique(story_id, user_id)
);

create table if not exists public.video_reels (
  reel_id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  video_url text not null,
  thumbnail_url text,
  title text,
  description text,
  category text, -- catches, techniques, fails, tips
  duration_seconds integer,
  music_track text,
  views_count integer default 0,
  likes_count integer default 0,
  shares_count integer default 0,
  created_at timestamp with time zone not null default now()
);

create table if not exists public.reel_engagement (
  engagement_id uuid primary key default gen_random_uuid(),
  reel_id uuid references public.video_reels(reel_id) on delete cascade,
  user_id uuid references public.users(id) on delete cascade,
  engagement_type text not null check (engagement_type in ('view', 'like', 'share')),
  created_at timestamp with time zone not null default now(),
  unique(reel_id, user_id, engagement_type)
);

-- Indexes
create index if not exists idx_contest_entries_contest on public.contest_entries(contest_id, votes_count desc);
create index if not exists idx_tournament_entries_tournament on public.tournament_entries(tournament_id, total_score desc);
create index if not exists idx_tournament_submissions_entry on public.tournament_submissions(entry_id, submitted_at);
create index if not exists idx_stories_user_expires on public.stories(user_id, expires_at desc);
create index if not exists idx_video_reels_user on public.video_reels(user_id, created_at desc);
create index if not exists idx_video_reels_category on public.video_reels(category, created_at desc);

-- RLS Policies
alter table public.photo_contests enable row level security;
alter table public.contest_entries enable row level security;
alter table public.contest_votes enable row level security;
alter table public.tournaments enable row level security;
alter table public.tournament_entries enable row level security;
alter table public.tournament_submissions enable row level security;
alter table public.stories enable row level security;
alter table public.story_views enable row level security;
alter table public.video_reels enable row level security;
alter table public.reel_engagement enable row level security;

-- Public can view active contests
create policy "Public view active contests"
  on public.photo_contests for select
  using (status != 'closed');

-- Users can view and create entries
create policy "Users manage contest entries"
  on public.contest_entries for all
  using (true);

-- Users can vote
create policy "Users vote on contests"
  on public.contest_votes for all
  using (auth.uid() = user_id);

-- Public can view tournaments
create policy "Public view tournaments"
  on public.tournaments for select
  using (true);

-- Users can manage their tournament entries
create policy "Users manage tournament entries"
  on public.tournament_entries for all
  using (auth.uid() = user_id);

-- Users can view and create stories
create policy "Users manage stories"
  on public.stories for all
  using (auth.uid() = user_id or expires_at > now());

-- Public can view active stories
create policy "Public view active stories"
  on public.stories for select
  using (expires_at > now());

-- Public can view reels
create policy "Public view reels"
  on public.video_reels for select
  using (true);

-- Users can create reels
create policy "Users create reels"
  on public.video_reels for insert
  with check (auth.uid() = user_id);

-- Public can engage with reels
create policy "Public engage with reels"
  on public.reel_engagement for all
  using (true);

-- Service role full access
create policy "Service role contests"
  on public.photo_contests for all
  using (auth.jwt() ->> 'role' = 'service_role');

create policy "Service role tournaments"
  on public.tournaments for all
  using (auth.jwt() ->> 'role' = 'service_role');
