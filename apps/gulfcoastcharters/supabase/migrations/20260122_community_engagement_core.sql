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
