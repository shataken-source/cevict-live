-- PRAXIS subscriptions (Stripe-backed)
-- Run in Supabase SQL Editor if using Supabase for persistence.
-- Table used by subscription-store.ts (user_id, status, plan, current_period_end, free_trial_ends_at).
-- After creating this table, run migrations/20260205_free_trial_ends_at.sql to add free_trial_ends_at.

create table if not exists public.subscriptions (
  user_id text primary key,
  status text not null default 'active',
  plan text not null default 'free',
  current_period_end timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

comment on table public.subscriptions is 'PRAXIS Stripe subscription state; user_id = Clerk user id';

-- Optional: RLS so users can only read their own row (service role bypasses RLS)
alter table public.subscriptions enable row level security;

create policy "Users can read own subscription"
  on public.subscriptions for select
  using (auth.jwt() ->> 'sub' = user_id);

-- Updates are server-only via service role; no policy needed for insert/update/delete.
