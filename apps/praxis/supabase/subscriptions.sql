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

-- Optional: RLS (service role bypasses RLS; policy only matters for anon-key reads)
alter table public.subscriptions enable row level security;

-- Policy: allow read when JWT sub matches user_id. If using Clerk (not Supabase Auth), this may never match;
-- server uses service role and bypasses RLS. If this errors (e.g. auth.jwt() / uuid mismatch), run instead:
--   DROP POLICY IF EXISTS "Users can read own subscription" ON public.subscriptions;
create policy "Users can read own subscription"
  on public.subscriptions for select
  using ((auth.jwt() ->> 'sub')::text = user_id::text);

-- Updates are server-only via service role; no policy needed for insert/update/delete.
