-- Praxis subscriptions for pro database (Clerk user IDs = text, not uuid)
-- Use this if your main subscriptions table has user_id as uuid (Supabase Auth).
-- Praxis uses Clerk; Clerk IDs are like user_2abc123... (not UUIDs).

create table if not exists public.praxis_subscriptions (
  user_id text primary key,
  status text not null default 'active',
  plan text not null default 'free',
  current_period_end timestamptz,
  free_trial_ends_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

comment on table public.praxis_subscriptions is 'PRAXIS Stripe subscription state; user_id = Clerk user id';

alter table public.praxis_subscriptions enable row level security;
