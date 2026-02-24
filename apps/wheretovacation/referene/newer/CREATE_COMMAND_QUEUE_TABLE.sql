-- Command queue table for remote control agent
create extension if not exists pgcrypto;
create table if not exists command_queue (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  action text not null,
  params jsonb null,
  status text not null default 'queued',
  requested_by text null,
  requested_at timestamptz not null default now(),
  requires_confirmation boolean not null default false,
  confirmed boolean not null default true,
  claimed_by text null,
  claimed_at timestamptz null,
  completed_at timestamptz null,
  result jsonb null,
  error text null
);
create index if not exists command_queue_status_created_at_idx on command_queue (status, created_at desc);
create index if not exists command_queue_claimed_by_idx on command_queue (claimed_by);