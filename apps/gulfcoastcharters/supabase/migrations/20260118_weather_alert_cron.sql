-- Weather Alert Monitor Cron Job
-- Sets up automatic scheduling for weather alert monitoring
-- Runs every 15 minutes to check for severe weather alerts

-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule weather alert monitor to run every 15 minutes
-- This calls the Supabase Edge Function via HTTP
SELECT cron.schedule(
  'weather-alert-monitor',
  '*/15 * * * *', -- Every 15 minutes
  $$
  SELECT
    net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/weather-alert-monitor',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.supabase_service_role_key')
      ),
      body := jsonb_build_object('action', 'monitor')
    ) AS request_id;
  $$
);

-- Note: You'll need to set these settings in Supabase:
-- app.settings.supabase_url = your Supabase project URL
-- app.settings.supabase_service_role_key = your service role key
--
-- Or modify the cron job to use environment variables directly:
-- url := 'https://[your-project-ref].supabase.co/functions/v1/weather-alert-monitor'
-- 'Authorization', 'Bearer [your-service-role-key]'

COMMENT ON EXTENSION pg_cron IS 'Enables scheduled jobs for weather alert monitoring';
