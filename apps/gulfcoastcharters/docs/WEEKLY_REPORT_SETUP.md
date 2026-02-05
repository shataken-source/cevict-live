# Weekly Admin Report System Setup

## Overview
The weekly admin report system automatically sends comprehensive analytics emails to administrators every Monday at 9:00 AM, including:
- Platform analytics and metrics
- Booking summaries and revenue data
- Top destinations and captain performance
- User activity statistics
- Beautiful HTML email with charts and tables

## Components

### 1. Edge Function: `weekly-admin-report`
Located in Supabase Edge Functions, this function:
- Queries database for bookings, users, and revenue data
- Calculates weekly metrics and analytics
- Generates HTML email with formatted data
- Sends email via Brevo API to administrators

### 2. Email Content Includes:
- **Key Metrics Cards:**
  - New bookings this week
  - Revenue this week
  - New users registered
  - Active users count

- **Top Destinations Table:**
  - Most popular charter destinations
  - Booking counts per destination

- **Captain Performance Table:**
  - Top performing captains by revenue
  - Total bookings per captain
  - Revenue generated per captain

- **Revenue Summary:**
  - Total platform revenue
  - Weekly revenue
  - Average booking value

## Setup Instructions

### Step 1: Verify Edge Function
The `weekly-admin-report` edge function has been deployed. You can test it manually:

```bash
curl -X POST https://api.databasepad.com/functions/v1/weekly-admin-report \
  -H "Authorization: Bearer YOUR_SUPABASE_ANON_KEY"
```

### Step 2: Set Up Supabase Cron Job
Supabase uses pg_cron for scheduled tasks. Run this SQL in your Supabase SQL Editor:

```sql
-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule weekly report every Monday at 9:00 AM UTC
SELECT cron.schedule(
  'weekly-admin-report',           -- Job name
  '0 9 * * 1',                      -- Cron expression (9 AM every Monday)
  $$
  SELECT
    net.http_post(
      url:='https://api.databasepad.com/functions/v1/weekly-admin-report',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SUPABASE_SERVICE_ROLE_KEY"}'::jsonb,
      body:='{}'::jsonb
    ) as request_id;
  $$
);
```

**Important:** Replace `YOUR_SUPABASE_SERVICE_ROLE_KEY` with your actual service role key.

### Step 3: Verify Cron Job
Check if the cron job is scheduled:

```sql
SELECT * FROM cron.job;
```

### Step 4: Test the Cron Job
You can manually trigger the job to test:

```sql
SELECT cron.schedule(
  'test-weekly-report',
  '* * * * *',  -- Run every minute for testing
  $$
  SELECT
    net.http_post(
      url:='https://api.databasepad.com/functions/v1/weekly-admin-report',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SUPABASE_SERVICE_ROLE_KEY"}'::jsonb,
      body:='{}'::jsonb
    ) as request_id;
  $$
);
```

After testing, remove the test job:
```sql
SELECT cron.unschedule('test-weekly-report');
```

## Cron Expression Format
```
* * * * *
│ │ │ │ │
│ │ │ │ └─── Day of week (0-7, Sunday = 0 or 7)
│ │ │ └───── Month (1-12)
│ │ └─────── Day of month (1-31)
│ └───────── Hour (0-23)
└─────────── Minute (0-59)
```

### Common Schedules:
- `0 9 * * 1` - Every Monday at 9:00 AM
- `0 9 * * *` - Every day at 9:00 AM
- `0 9 1 * *` - First day of every month at 9:00 AM
- `0 9 * * 5` - Every Friday at 9:00 AM

## Customization

### Change Email Recipients
Edit the edge function to add more administrators:

```typescript
to: [
  { email: 'jason@gulfcoastcharters.com', name: 'Jason - Admin' },
  { email: 'admin2@example.com', name: 'Admin 2' },
  { email: 'admin3@example.com', name: 'Admin 3' }
]
```

### Change Schedule
Modify the cron expression in the SQL command above.

### Add More Metrics
Edit the `weekly-admin-report` edge function to query additional data and add it to the HTML template.

## Monitoring

### Check Cron Job Logs
```sql
SELECT * FROM cron.job_run_details 
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'weekly-admin-report')
ORDER BY start_time DESC 
LIMIT 10;
```

### View Edge Function Logs
Go to Supabase Dashboard → Edge Functions → weekly-admin-report → Logs

## Troubleshooting

### Email Not Received
1. Check Brevo API key is configured: `BREVO_API_KEY`
2. Verify email address is correct in edge function
3. Check Brevo dashboard for delivery status
4. Review edge function logs for errors

### Cron Job Not Running
1. Verify pg_cron extension is enabled
2. Check cron job is scheduled: `SELECT * FROM cron.job;`
3. Verify service role key is correct
4. Check cron job logs for errors

### Missing Data
1. Ensure database tables exist: `bookings`, `users`, `charters`
2. Verify data exists in tables
3. Check edge function has correct table names
4. Review edge function logs for query errors

## Security Notes
- Service role key should never be exposed in client code
- Cron jobs run server-side with elevated permissions
- Email content should not include sensitive user data
- Consider rate limiting for email sending

## Manual Trigger
Administrators can also trigger the report manually from the Admin Panel or by calling:

```javascript
const { data, error } = await supabase.functions.invoke('weekly-admin-report');
```

## Future Enhancements
- Add chart images (using Chart.js or similar)
- Include comparison to previous week
- Add booking status breakdown
- Include customer satisfaction metrics
- Add revenue forecasting
- Export data as PDF attachment
