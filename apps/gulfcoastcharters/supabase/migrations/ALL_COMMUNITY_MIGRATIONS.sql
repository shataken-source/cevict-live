-- ============================================
-- ALL COMMUNITY ENGAGEMENT MIGRATIONS
-- ============================================
-- Run this entire file in Supabase SQL Editor
-- Copy everything below this line and paste into Supabase
-- ============================================

-- ============================================
-- PART 1: CORE ENGAGEMENT (Daily Habits, Social, Messaging)
-- ============================================

-- Community Engagement & Retention System
-- Core tables for daily habits, social features, and engagement

-- Ensure UUID generator available
create extension if not exists pgcrypto;

-- ============================================
-- I. DAILY HABIT FORMATION
-- ============================================

-- Enhanced daily check-ins with streak tracking
create table if not exists public.daily_check_ins (
  check_in_id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  check_in_date date not null,
  points_earned integer not null default 3,
  streak_count integer not null default 1,
  streak_frozen boolean default false,
  created_at timestamp with time zone not null default now(),
  unique(user_id, check_in_date)
);

-- Daily challenges
do $$
begin
  if not exists (
    select 1 from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'challenge_type_enum'
  ) then
    create type public.challenge_type_enum as enum (
      'daily',
      'weekly',
      'monthly'
    );
  end if;
end $$;

create table if not exists public.daily_challenges (
  challenge_id uuid primary key default gen_random_uuid(),
  challenge_type challenge_type_enum not null default 'daily',
  title text not null,
  description text,
  points_reward integer not null,
  action_required text not null, -- e.g., 'share_forecast', 'post_catch', 'comment_3'
  target_count integer default 1,
  reset_frequency text not null, -- 'daily', 'weekly', 'monthly'
  active boolean default true,
  starts_at timestamp with time zone,
  ends_at timestamp with time zone,
  created_at timestamp with time zone not null default now()
);

-- Challenge completions
create table if not exists public.challenge_completions (
  completion_id uuid primary key default gen_random_uuid(),
  challenge_id uuid references public.daily_challenges(challenge_id) on delete cascade,
  user_id uuid references public.users(id) on delete cascade,
  completed_at timestamp with time zone not null default now(),
  points_earned integer not null,
  progress_data jsonb, -- Store completion details
  unique(challenge_id, user_id, date_trunc('day', completed_at))
);

-- Daily fishing forecasts (user preferences)
create table if not exists public.user_forecast_preferences (
  preference_id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade unique,
  home_waters jsonb, -- Array of location IDs or coordinates
  target_species text[], -- Array of species names
  delivery_time time default '06:00:00',
  delivery_methods text[] default array['push'], -- push, email, sms
  timezone text default 'America/Chicago',
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

-- ============================================
-- II. SOCIAL FEATURES & CONNECTIONS
-- ============================================

-- User connections (friends and following)
do $$
begin
  if not exists (
    select 1 from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'connection_type_enum'
  ) then
    create type public.connection_type_enum as enum (
      'friend',
      'following'
    );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'connection_status_enum'
  ) then
    create type public.connection_status_enum as enum (
      'pending',
      'accepted',
      'blocked'
    );
  end if;
end $$;

create table if not exists public.user_connections (
  connection_id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  connected_user_id uuid references public.users(id) on delete cascade,
  connection_type connection_type_enum not null,
  status connection_status_enum default 'accepted', -- Only for 'friend' type
  created_at timestamp with time zone not null default now(),
  unique(user_id, connected_user_id, connection_type),
  check (user_id != connected_user_id)
);

-- Activity feed posts
do $$
begin
  if not exists (
    select 1 from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'feed_content_type_enum'
  ) then
    create type public.feed_content_type_enum as enum (
      'catch_post',
      'trip_report',
      'question',
      'pro_tip',
      'badge_unlock',
      'milestone',
      'charter_review',
      'gear_recommendation'
    );
  end if;
end $$;

create table if not exists public.activity_feed (
  feed_id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  content_type feed_content_type_enum not null,
  title text,
  content text,
  media_urls text[], -- Array of photo/video URLs
  location_data jsonb, -- GPS, location name
  metadata jsonb, -- Species, size, bait, etc.
  likes_count integer default 0,
  hot_reactions_count integer default 0,
  helpful_votes_count integer default 0,
  comments_count integer default 0,
  shares_count integer default 0,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

-- Feed engagement (likes, reactions, votes)
create table if not exists public.feed_engagement (
  engagement_id uuid primary key default gen_random_uuid(),
  feed_id uuid references public.activity_feed(feed_id) on delete cascade,
  user_id uuid references public.users(id) on delete cascade,
  engagement_type text not null check (engagement_type in ('like', 'hot', 'helpful', 'save')),
  created_at timestamp with time zone not null default now(),
  unique(feed_id, user_id, engagement_type)
);

-- Feed comments
create table if not exists public.feed_comments (
  comment_id uuid primary key default gen_random_uuid(),
  feed_id uuid references public.activity_feed(feed_id) on delete cascade,
  user_id uuid references public.users(id) on delete cascade,
  content text not null,
  helpful_votes integer default 0,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

-- ============================================
-- III. MESSAGING SYSTEM
-- ============================================

-- Conversations (direct and group)
do $$
begin
  if not exists (
    select 1 from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'conversation_type_enum'
  ) then
    create type public.conversation_type_enum as enum (
      'direct',
      'group'
    );
  end if;
end $$;

create table if not exists public.conversations (
  conversation_id uuid primary key default gen_random_uuid(),
  conversation_type conversation_type_enum not null,
  name text, -- For group chats
  created_by uuid references public.users(id) on delete set null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

-- Conversation participants
do $$
begin
  if not exists (
    select 1 from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'participant_role_enum'
  ) then
    create type public.participant_role_enum as enum (
      'admin',
      'member'
    );
  end if;
end $$;

create table if not exists public.conversation_participants (
  participant_id uuid primary key default gen_random_uuid(),
  conversation_id uuid references public.conversations(conversation_id) on delete cascade,
  user_id uuid references public.users(id) on delete cascade,
  role participant_role_enum default 'member',
  last_read_at timestamp with time zone,
  joined_at timestamp with time zone not null default now(),
  unique(conversation_id, user_id)
);

-- Messages
do $$
begin
  if not exists (
    select 1 from pg_type t
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typname = 'message_type_enum'
  ) then
    create type public.message_type_enum as enum (
      'text',
      'photo',
      'location',
      'voice'
    );
  end if;
end $$;

create table if not exists public.messages (
  message_id uuid primary key default gen_random_uuid(),
  conversation_id uuid references public.conversations(conversation_id) on delete cascade,
  sender_id uuid references public.users(id) on delete cascade,
  message_type message_type_enum not null default 'text',
  content text,
  media_url text,
  location_data jsonb,
  read_by jsonb default '[]', -- Array of user IDs who read it
  created_at timestamp with time zone not null default now()
);

-- Indexes for performance
create index if not exists idx_daily_check_ins_user_date on public.daily_check_ins(user_id, check_in_date desc);
create index if not exists idx_challenge_completions_user on public.challenge_completions(user_id, completed_at desc);
create index if not exists idx_user_connections_user on public.user_connections(user_id);
create index if not exists idx_user_connections_connected on public.user_connections(connected_user_id);
create index if not exists idx_activity_feed_user on public.activity_feed(user_id, created_at desc);
create index if not exists idx_activity_feed_type on public.activity_feed(content_type, created_at desc);
create index if not exists idx_feed_engagement_feed on public.feed_engagement(feed_id);
create index if not exists idx_feed_comments_feed on public.feed_comments(feed_id, created_at);
create index if not exists idx_conversation_participants_user on public.conversation_participants(user_id);
create index if not exists idx_messages_conversation on public.messages(conversation_id, created_at desc);

-- RLS Policies
alter table public.daily_check_ins enable row level security;
alter table public.daily_challenges enable row level security;
alter table public.challenge_completions enable row level security;
alter table public.user_forecast_preferences enable row level security;
alter table public.user_connections enable row level security;
alter table public.activity_feed enable row level security;
alter table public.feed_engagement enable row level security;
alter table public.feed_comments enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_participants enable row level security;
alter table public.messages enable row level security;

-- Users can view their own check-ins
create policy "Users view own check-ins"
  on public.daily_check_ins for select
  using (auth.uid() = user_id);

-- Users can create check-ins
create policy "Users create check-ins"
  on public.daily_check_ins for insert
  with check (auth.uid() = user_id);

-- Public can view active challenges
create policy "Public view active challenges"
  on public.daily_challenges for select
  using (active = true);

-- Users can view their completions
create policy "Users view own completions"
  on public.challenge_completions for select
  using (auth.uid() = user_id);

-- Users can create completions
create policy "Users create completions"
  on public.challenge_completions for insert
  with check (auth.uid() = user_id);

-- Users manage their forecast preferences
create policy "Users manage forecast preferences"
  on public.user_forecast_preferences for all
  using (auth.uid() = user_id);

-- Users can view their connections
create policy "Users view own connections"
  on public.user_connections for select
  using (auth.uid() = user_id or auth.uid() = connected_user_id);

-- Users can create connections
create policy "Users create connections"
  on public.user_connections for insert
  with check (auth.uid() = user_id);

-- Public can view feed posts
create policy "Public view feed"
  on public.activity_feed for select
  using (true);

-- Users can create feed posts
create policy "Users create feed posts"
  on public.activity_feed for insert
  with check (auth.uid() = user_id);

-- Users can update their own posts
create policy "Users update own posts"
  on public.activity_feed for update
  using (auth.uid() = user_id);

-- Public can engage with feed
create policy "Public engage with feed"
  on public.feed_engagement for all
  using (true);

-- Public can view and create comments
create policy "Public manage comments"
  on public.feed_comments for all
  using (true);

-- Users can view conversations they're in
create policy "Users view own conversations"
  on public.conversations for select
  using (
    exists (
      select 1 from public.conversation_participants
      where conversation_id = conversations.conversation_id
      and user_id = auth.uid()
    )
  );

-- Users can create conversations
create policy "Users create conversations"
  on public.conversations for insert
  with check (auth.uid() = created_by);

-- Users can view messages in their conversations
create policy "Users view own messages"
  on public.messages for select
  using (
    exists (
      select 1 from public.conversation_participants
      where conversation_id = messages.conversation_id
      and user_id = auth.uid()
    )
  );

-- Users can send messages in their conversations
create policy "Users send messages"
  on public.messages for insert
  with check (
    auth.uid() = sender_id and
    exists (
      select 1 from public.conversation_participants
      where conversation_id = messages.conversation_id
      and user_id = auth.uid()
    )
  );

-- Service role full access
create policy "Service role full access"
  on public.daily_check_ins for all
  using (auth.jwt() ->> 'role' = 'service_role');

create policy "Service role challenges"
  on public.daily_challenges for all
  using (auth.jwt() ->> 'role' = 'service_role');

create policy "Service role feed"
  on public.activity_feed for all
  using (auth.jwt() ->> 'role' = 'service_role');

-- ============================================
-- PART 2: CONTESTS, TOURNAMENTS, STORIES, VIDEOS
-- ============================================

-- Community Engagement: Contests, Tournaments, Stories, Videos

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

-- ============================================
-- PART 3: JOURNAL, EDUCATION, BUDDY MATCHING, FORUMS, REWARDS
-- ============================================

-- Community Engagement: Fishing Journal, GCC University, Buddy Matching, Forums, Rewards

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

-- ============================================
-- VERIFICATION QUERY (Run after migration)
-- ============================================
-- Uncomment below to verify all tables were created:

-- SELECT table_name 
-- FROM information_schema.tables 
-- WHERE table_schema = 'public' 
-- AND table_name IN (
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

-- Expected: 34 tables
