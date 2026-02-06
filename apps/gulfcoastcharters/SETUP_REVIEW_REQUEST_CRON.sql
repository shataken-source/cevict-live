-- Setup Review Request Scheduler Cron Job
-- This schedules the review-request-scheduler Edge Function to run every hour

-- Step 1: Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS http;

-- Step 2: Grant usage to postgres role (required for cron)
GRANT USAGE ON SCHEMA cron TO postgres;

-- Step 3: Remove existing cron job if it exists (to avoid duplicates)
DO $$
BEGIN
  -- Check if job exists before trying to unschedule
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'review-request-scheduler') THEN
    PERFORM cron.unschedule('review-request-scheduler');
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- Job doesn't exist yet, that's fine - continue
  NULL;
END $$;

-- Step 4: Get your service role key from Supabase Dashboard
-- Go to: Project Settings → API → service_role key
-- Replace 'YOUR_SERVICE_ROLE_KEY' below with your actual key

-- Step 5: Schedule the function to run every hour
-- Cron format: minute hour day month weekday
-- '0 * * * *' = Every hour at minute 0 (12:00, 1:00, 2:00, etc.)
SELECT cron.schedule(
  'review-request-scheduler',           -- Job name
  '0 * * * *',                          -- Cron schedule: Every hour at minute 0
  $$
  SELECT http_post(
    'https://rdbuwyefbgnbuhmjrizo.supabase.co/functions/v1/review-request-scheduler',
    '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb,
    '{}'::jsonb
  );
  $$
);

-- IMPORTANT: Replace 'YOUR_SERVICE_ROLE_KEY' above with your actual service role key!
-- You can find it in: Supabase Dashboard → Project Settings → API → service_role key

-- Step 6: Verify the cron job was created
SELECT 
  jobid,
  schedule,
  command,
  nodename,
  nodeport,
  database,
  username,
  active
FROM cron.job
WHERE jobname = 'review-request-scheduler';

-- Step 7: View all scheduled cron jobs
SELECT * FROM cron.job ORDER BY jobid;

-- To manually test the function (without waiting for cron):
-- Go to Supabase Dashboard → Functions → review-request-scheduler → Invoke

-- To unschedule the cron job later:
-- SELECT cron.unschedule('review-request-scheduler');
