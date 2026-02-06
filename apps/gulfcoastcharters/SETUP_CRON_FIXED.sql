-- Fixed Cron Setup for Review Request Scheduler
-- Run this in Supabase SQL Editor
-- This version handles the case where the job doesn't exist yet

-- Step 1: Enable extensions
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS http;

-- Step 2: Remove old job if it exists (safely)
DO $$
BEGIN
  -- Only try to unschedule if the job actually exists
  IF EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'review-request-scheduler'
  ) THEN
    PERFORM cron.unschedule('review-request-scheduler');
    RAISE NOTICE 'Removed existing cron job';
  ELSE
    RAISE NOTICE 'No existing cron job found - will create new one';
  END IF;
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

-- Step 4: Verify it was created
SELECT 
  jobid, 
  schedule, 
  active,
  jobname
FROM cron.job 
WHERE jobname = 'review-request-scheduler';
