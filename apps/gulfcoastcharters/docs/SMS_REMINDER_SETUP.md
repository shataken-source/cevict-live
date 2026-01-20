# SMS Reminder System Setup Guide

## Overview
The SMS reminder system sends text message notifications to customers 24 hours before their bookings using Sinch SMS API.

## Features
- ✅ Phone number verification with 6-digit codes
- ✅ SMS opt-in/opt-out functionality
- ✅ Automated 24-hour booking reminders
- ✅ Delivery tracking and statistics
- ✅ Admin panel monitoring

## Components

### 1. SMS Verification (`sms-verification` edge function)
Handles phone number verification:
- Sends 6-digit verification codes via SMS
- Validates verification codes
- Uses Sinch SMS API

### 2. SMS Booking Reminders (`sms-booking-reminders` edge function)
Sends booking reminder SMS:
- 24-hour reminder messages
- Delivery status tracking
- Batch ID tracking for monitoring

### 3. Booking Reminder Scheduler (`booking-reminder-scheduler` edge function)
Automated scheduler that:
- Checks upcoming bookings every 6 hours
- Sends email reminders (1 week, 24h, follow-up)
- Sends SMS reminders (24h only) to opted-in users
- Tracks all sent reminders to prevent duplicates

## User Flow

### Phone Verification
1. User goes to Profile Settings
2. Enters phone number
3. Clicks "Verify Phone Number"
4. Receives 6-digit code via SMS
5. Enters code to verify
6. Can now opt-in to SMS reminders

### SMS Opt-In/Opt-Out
- Toggle switch in Profile Settings
- Requires verified phone number
- Can be changed anytime
- Preference stored in user profile

## Database Schema

### Required Tables
## Database Schema

### Using Existing Tables
The SMS system uses the existing `booking_reminders` table to track sent SMS messages alongside email reminders. No additional tables are required.

### Optional: Add SMS Fields to Bookings
If you want to store SMS preferences at the booking level:

```sql
-- Add SMS fields to bookings table (optional)
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS customer_phone TEXT,
ADD COLUMN IF NOT EXISTS sms_opt_in BOOLEAN DEFAULT false;
```

**Note:** SMS preferences are primarily managed in user profiles. The booking-level fields are optional for per-booking overrides.

- `SINCH_PHONE_NUMBER` - Sender phone number

## Automated Scheduling

### Option 1: Cron Job (Recommended)
Set up a cron job to run every 6 hours:

```bash
0 */6 * * * curl -X POST https://api.databasepad.com/functions/v1/booking-reminder-scheduler
```

### Option 2: GitHub Actions
Add to `.github/workflows/scheduled-reminders.yml`:

```yaml
name: Booking Reminders
on:
  schedule:
    - cron: '0 */6 * * *'  # Every 6 hours
  workflow_dispatch:

jobs:
  send-reminders:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Reminder Scheduler
        run: |
          curl -X POST https://api.databasepad.com/functions/v1/booking-reminder-scheduler
```

### Option 3: External Service
Use services like:
- EasyCron (https://www.easycron.com/)
- Cron-job.org (https://cron-job.org/)
- UptimeRobot (https://uptimerobot.com/)

Set URL: `https://api.databasepad.com/functions/v1/booking-reminder-scheduler`
Interval: Every 6 hours

## Admin Panel Features

### Reminder Scheduler Panel
Access via Admin Panel → Reminders section

**Overview Tab:**
- Manual trigger button
- Last run statistics
- Email and SMS counts
- Error tracking

**Email Stats Tab:**
- Week before reminders sent
- 24h before reminders sent
- Follow-up emails sent

**SMS Stats Tab:**
- 24h SMS reminders sent
- Total opted-in users
- Delivery rate tracking

## SMS Message Format

**24-Hour Reminder:**
```
Hi [Customer Name]! Reminder: Your [Charter Name] booking is tomorrow at [Time]. See you soon! - Charter Connect
```

**Verification Code:**
```
Your Gulf Coast Charters verification code is: [6-digit code]. Valid for 10 minutes.
```

## Testing

### Test Phone Verification
1. Go to Profile Settings
2. Enter test phone number
3. Click "Verify Phone Number"
4. Check phone for SMS code
5. Enter code to verify

### Test SMS Reminders
1. Create a test booking for tomorrow
2. Ensure customer has verified phone and SMS opt-in enabled
3. Run scheduler manually from Admin Panel
4. Check phone for reminder SMS

### Manual Trigger
```bash
curl -X POST https://api.databasepad.com/functions/v1/booking-reminder-scheduler
```

## Cost Considerations

### Sinch SMS Pricing
- Pay-as-you-go pricing
- ~$0.01-0.02 per SMS (US)
- Monitor usage in Sinch dashboard

### Best Practices
- Only send SMS for 24h reminders (most critical)
- Respect opt-out preferences
- Use email for other notifications
- Monitor delivery rates

## Troubleshooting

### SMS Not Received
1. Check phone number format (E.164: +1XXXXXXXXXX)
2. Verify Sinch credentials are correct
3. Check Sinch dashboard for delivery status
4. Ensure phone number is verified

### Verification Code Issues
1. Code expires after 10 minutes
2. Use "Resend" button for new code
3. Check spam/blocked messages on phone

### Scheduler Not Running
1. Verify cron job is set up correctly
2. Check edge function logs for errors
3. Ensure all environment variables are set
4. Test manual trigger first

## Monitoring

### Track Metrics
- SMS delivery rate
- Opt-in/opt-out rates
- Cost per SMS
- Customer engagement

### Admin Dashboard
- Real-time statistics
- Delivery tracking
- Error logs
- User opt-in status

## Privacy & Compliance

### TCPA Compliance (US)
- ✅ Explicit opt-in required
- ✅ Easy opt-out mechanism
- ✅ Clear identification of sender
- ✅ Respect for user preferences

### Data Protection
- Phone numbers encrypted at rest
- Verification codes expire after 10 minutes
- Opt-out preferences respected immediately
- No sharing of phone numbers with third parties

## Support
For issues or questions:
1. Check edge function logs in Supabase
2. Review Sinch dashboard for delivery status
3. Test with manual triggers first
4. Verify all environment variables are set
