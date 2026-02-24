-- Schedule weekly SMS every Monday at 9:00 AM UTC
-- Replace YOUR_SERVICE_ROLE_KEY with your actual Service Role Key from Supabase Dashboard -> Settings -> API

SELECT cron.schedule(
  'weekly-sms-update',
  '0 9 * * 1',  -- Every Monday at 9:00 AM UTC
  $$
  SELECT
    net.http_post(
      url := 'https://rdbuwyefbgnbuhmjrizo.supabase.co/functions/v1/weekly-sms-update',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY'
      ),
      body := jsonb_build_object('phoneNumber', '2562645669')
    ) AS request_id;
  $$
);

