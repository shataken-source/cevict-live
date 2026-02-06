-- Simple Cron Setup for Review Request Scheduler
-- Run this in Supabase SQL Editor

-- Step 1: Enable extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS http;

-- Step 2: Remove old job if exists (ignore error if it doesn't exist)
DO $$
BEGIN
  PERFORM cron.unschedule('review-request-scheduler');
EXCEPTION WHEN OTHERS THEN
  -- Job doesn't exist yet, that's fine
  NULL;
END $$;

-- Step 3: Schedule to run every hour
-- IMPORTANT: Replace YOUR_SERVICE_ROLE_KEY with your actual key from:
-- Supabase Dashboard → Project Settings → API → service_role key
SELECT cron.schedule(
  'review-request-scheduler',
  '0 * * * *',  -- Every hour at :00
  $cron$
  SELECT http_post(
    'https://rdbuwyefbgnbuhmjrizo.supabase.co/functions/v1/review-request-scheduler',
    jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY'
    ),
    '{}'::jsonb
  );
  $cron$
);

-- Verify it was created
SELECT jobid, schedule, active FROM cron.job WHERE jobname = 'review-request-scheduler';
