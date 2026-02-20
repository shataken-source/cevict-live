-- Create predictions storage bucket for predictions/results JSON files
-- Replaces ephemeral filesystem writes in daily-predictions and daily-results crons

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'predictions',
  'predictions',
  false,
  5242880, -- 5MB max per file
  array['application/json']
)
on conflict (id) do nothing;

-- Service role can read/write (cron jobs use service role key)
create policy "service_role_predictions_all"
  on storage.objects
  for all
  to service_role
  using (bucket_id = 'predictions')
  with check (bucket_id = 'predictions');
