# Membership Renewal Cron Job Setup

## Overview
The `membership-renewal-cron` edge function automatically manages membership renewals, sends expiration notifications, and processes automatic payments.

## Features
- **Daily Execution**: Checks all memberships once per day
- **Expiration Notifications**: Sends push notifications at 7, 3, and 1 day before expiration
- **Automatic Renewals**: Processes Stripe subscriptions for users with auto-renew enabled
- **Status Management**: Marks expired memberships as inactive

## Setup Instructions

### 1. Configure Supabase Cron Job

In your Supabase dashboard, go to **Database** → **Extensions** and enable `pg_cron`:

```sql
-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the cron job to run daily at 9 AM UTC
SELECT cron.schedule(
  'membership-renewal-check',
  '0 9 * * *',
  $$
  SELECT
    net.http_post(
      url := 'https://api.databasepad.com/functions/v1/membership-renewal-cron',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer YOUR_SUPABASE_ANON_KEY'
      ),
      body := jsonb_build_object('scheduled', true)
    ) AS request_id;
  $$
);
```

### 2. Verify Cron Job

Check if the cron job is scheduled:

```sql
SELECT * FROM cron.job;
```

### 3. Manual Testing

Test the function manually before scheduling:

```bash
curl -X POST https://api.databasepad.com/functions/v1/membership-renewal-cron \
  -H "Authorization: Bearer YOUR_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json"
```

## How It Works

### Notification Timeline
- **7 days before**: First reminder notification
- **3 days before**: Second reminder notification  
- **1 day before**: Final reminder + auto-renewal attempt (if enabled)

### Auto-Renewal Process
1. Checks if membership has `auto_renew = true`
2. Verifies Stripe subscription status
3. Extends membership by 1 month (monthly) or 12 months (yearly)
4. Sends success or failure notification
5. Updates membership status in database

### Expiration Handling
- Memberships past expiry date are marked as `status = 'expired'`
- Users lose access to premium features
- Can manually renew through the membership page

## Monitoring

### Check Cron Execution Logs
```sql
SELECT * FROM cron.job_run_details 
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'membership-renewal-check')
ORDER BY start_time DESC 
LIMIT 10;
```

### View Recent Notifications
Check the `push_notification_tokens` table for sent notifications.

### Monitor Failed Renewals
Query memberships with recent failed renewal attempts:

```sql
SELECT * FROM memberships 
WHERE auto_renew = true 
AND expires_at < NOW() + INTERVAL '1 day'
AND status = 'active';
```

## Customization

### Change Cron Schedule
Modify the cron expression in the schedule:
- `0 9 * * *` = Daily at 9 AM UTC
- `0 */6 * * *` = Every 6 hours
- `0 0 * * 0` = Weekly on Sunday at midnight

### Adjust Notification Days
Edit the array in the function:
```typescript
if ([7, 3, 1].includes(daysUntilExpiry)) {
  // Change to [14, 7, 3, 1] for more notifications
}
```

## Troubleshooting

### Cron Not Running
- Verify `pg_cron` extension is enabled
- Check Supabase service role key is valid
- Ensure function URL is correct

### Notifications Not Sending
- Verify push notification tokens exist for users
- Check Firebase credentials in environment variables
- Review push-notification-service function logs

### Auto-Renewal Failing
- Confirm Stripe API key is valid
- Check subscription IDs are correct
- Verify payment method is valid in Stripe

## Environment Variables Required
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`
- `FIREBASE_SERVER_KEY` (for push notifications)

## Security Notes
- Uses service role key for database access
- Stripe operations are server-side only
- Push notifications require valid FCM tokens
- All sensitive operations are logged for audit

## Support
For issues or questions, check the Supabase logs:
```bash
supabase functions logs membership-renewal-cron
```
