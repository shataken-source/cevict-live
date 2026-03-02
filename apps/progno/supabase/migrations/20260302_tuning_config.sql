-- Tuning config for admin fine-tune page (TESTING-AND-FINE-TUNING.md).
create table if not exists tuning_config (
  id text primary key default 'default',
  config jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

comment on table tuning_config is 'Saved tuning variables from Progno admin fine-tune page; applied when loading pick engine.';
