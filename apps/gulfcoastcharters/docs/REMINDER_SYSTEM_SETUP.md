# Automated Booking Reminder System Setup

## Overview
This system automatically sends email reminders to customers at key points in their booking journey:
- **1 week before**: Preparation reminder
- **24 hours before**: Final reminder with checklist
- **After trip**: Follow-up for reviews

## Database Setup

### 1. Create Booking Reminders Table
```sql
CREATE TABLE booking_reminders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL,
  reminder_type TEXT NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  customer_email TEXT NOT NULL
);

CREATE INDEX idx_booking_reminders_booking ON booking_reminders(booking_id);
CREATE INDEX idx_booking_reminders_type ON booking_reminders(reminder_type);
```

### 2. Add Reminder Tracking to Bookings (Optional)
```sql
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS reminder_week_sent BOOLEAN DEFAULT FALSE;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS reminder_24h_sent BOOLEAN DEFAULT FALSE;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS followup_sent BOOLEAN DEFAULT FALSE;
```

## Edge Function Setup

The `booking-reminder-scheduler` edge function is already deployed and handles:
- Checking for upcoming bookings
- Sending appropriate reminders based on booking date
- Tracking sent reminders to prevent duplicates
- Sending follow-up emails after completed trips

## Scheduling Options

### Option 1: Supabase Cron (Recommended)
Set up a cron trigger in Supabase Dashboard:
1. Go to Database → Cron Jobs
2. Create new job:
   - **Name**: booking-reminders
   - **Schedule**: `0 */6 * * *` (every 6 hours)
   - **Command**: 
   ```sql
   SELECT net.http_post(
     url := 'https://api.databasepad.com/functions/v1/booking-reminder-scheduler',
     headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb,
     body := '{}'::jsonb
   );
   ```

### Option 2: External Cron Service
Use services like:
- **Cron-job.org**: Free, reliable
- **EasyCron**: More features
- **GitHub Actions**: If using GitHub

Example cURL command to trigger:
```bash
curl -X POST https://api.databasepad.com/functions/v1/booking-reminder-scheduler \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

### Option 3: Vercel Cron (if deployed on Vercel)
Add to `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/trigger-reminders",
    "schedule": "0 */6 * * *"
  }]
}
```

## Testing

### Manual Trigger
Test the scheduler manually:
```javascript
const { data, error } = await supabase.functions.invoke('booking-reminder-scheduler');
console.log('Reminders sent:', data);
```

### Test with Sample Data
Create a test booking with a date 1 week from now, then trigger the function.

## Monitoring

Check the function logs in Supabase Dashboard:
- Functions → booking-reminder-scheduler → Logs

The function returns:
```json
{
  "sent": 5,
  "errors": 0,
  "details": [
    { "booking_id": "uuid", "type": "week_before" },
    { "booking_id": "uuid", "type": "24h_before" }
  ]
}
```

## Email Templates

The system includes three email templates:
1. **Week Before**: Preparation reminder with booking details
2. **24 Hours Before**: Final reminder with checklist
3. **Follow-up**: Request for review after completed trip

## Customization

Edit the email templates in the edge function:
- `generateWeekBeforeEmail()`
- `generate24HourEmail()`
- `generateFollowUpEmail()`

## Environment Variables Required
- `MAILJET_API_KEY`
- `MAILJET_SECRET_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

All are automatically available in edge functions.
