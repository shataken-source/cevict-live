-- Add free trial end for Praxis. Free tier = full access until free_trial_ends_at, then limited (CSV only) unless they upgrade.
-- Run in Supabase SQL Editor or via migration.

-- Ensure table has required columns (in case table existed from older schema)
alter table public.subscriptions add column if not exists plan text not null default 'free';
alter table public.subscriptions add column if not exists created_at timestamptz default now();

alter table public.subscriptions
  add column if not exists free_trial_ends_at timestamptz;

comment on column public.subscriptions.free_trial_ends_at is 'When free trial ends; after this, free users get limited (CSV-only) access and are eligible for post-trial upgrade discount.';

-- Backfill: existing free rows get trial end = created_at + 30 days (or now + 30 days if no created_at)
update public.subscriptions
set free_trial_ends_at = coalesce(created_at, now()) + interval '30 days'
where plan = 'free' and free_trial_ends_at is null;
