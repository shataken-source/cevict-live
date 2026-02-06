# Review Request Automation - Setup Guide

## ✅ What Was Implemented

### 1. Review Request Scheduler Edge Function (`review-request-scheduler/index.ts`)
- Finds completed bookings that need review requests
- Creates `review_request` records automatically
- Sends review requests at scheduled intervals:
  - **4 hours** after trip ends (first request)
  - **24 hours** after trip ends (first reminder)
  - **3 days** after trip ends (second reminder)
  - **7 days** after trip ends (final reminder)
- Updates review request records with sent timestamps
- Handles trip end time calculation (uses `end_time` or `trip_date + duration`)

## 🔧 Setup Instructions

### Step 1: Deploy the Edge Function

1. **Go to:** https://supabase.com/dashboard/project/rdbuwyefbgnbuhmjrizo/functions
2. **Click "New Function"** or create `review-request-scheduler`
3. **Copy code from:** `apps/gulfcoastcharters/supabase/functions/review-request-scheduler/index.ts`
4. **Paste into editor**
5. **Turn OFF "Verify JWT"** (if visible)
6. **Click "Deploy"**

### Step 2: Set Up Cron Job

Supabase Edge Functions can be scheduled using **pg_cron** (PostgreSQL extension) or **Supabase Cron Jobs**.

#### Option A: Using Supabase Cron (Recommended)

1. **Go to:** Supabase Dashboard → Database → Extensions
2. **Enable `pg_cron` extension** (if not already enabled)
3. **Run this SQL** to schedule the function:

```sql
-- Schedule to run every hour
SELECT cron.schedule(
  'review-request-scheduler',
  '0 * * * *', -- Every hour at minute 0
  $$
  SELECT
    net.http_post(
      url := 'https://rdbuwyefbgnbuhmjrizo.supabase.co/functions/v1/review-request-scheduler',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
      ),
      body := '{}'::jsonb
    ) AS request_id;
  $$
);
```

#### Option B: Manual Testing (For Development)

You can manually trigger the function for testing:

1. **Go to:** Supabase Dashboard → Functions → `review-request-scheduler`
2. **Click "Invoke"** or use the test button
3. **Check logs** to see processed bookings

### Step 3: Verify Foreign Key (If Needed)

If you get foreign key errors, run:

```sql
-- Check current foreign key
SELECT 
  tc.constraint_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name = 'review_requests' 
  AND tc.constraint_type = 'FOREIGN KEY'
  AND kcu.column_name = 'booking_id';
```

If it points to `bookings(booking_id)` instead of `bookings(id)`, run `FIX_REVIEW_REQUESTS_FOREIGN_KEY.sql`.

## 🔄 How It Works

1. **Cron job runs hourly** (or on your schedule)
2. **Function finds completed bookings:**
   - Status is `completed` or `confirmed`
   - Has `end_time` or `trip_date`
   - Trip end time has passed
3. **Creates review_request record** if it doesn't exist
4. **Checks timing** to determine which email to send:
   - 4h after trip → First request
   - 24h after trip → First reminder
   - 3d after trip → Second reminder
   - 7d after trip → Final reminder
5. **Updates review_request** with sent timestamp
6. **TODO:** Sends email notification (currently just logs)

## 📋 Current Status

- ✅ Scheduler function created
- ✅ Automatic review_request record creation
- ✅ Timing logic (4h, 24h, 3d, 7d)
- ✅ Database updates with sent timestamps
- ❌ Email sending (TODO - needs email service integration)
- ⏳ Cron job setup (needs to be configured)

## 🧪 Testing

### Manual Test

1. **Create a test booking** with:
   - `status: 'completed'`
   - `end_time: < 4 hours ago` (or `trip_date + duration < 4 hours ago`)
2. **Invoke the function manually** from Supabase Dashboard
3. **Check `review_requests` table:**
   ```sql
   SELECT * FROM review_requests 
   ORDER BY created_at DESC 
   LIMIT 1;
   ```
4. **Verify:**
   - `first_request_sent_at` is populated
   - `status` is `'sent'`
   - `trip_end_time` is correct

### Test Different Time Intervals

To test different intervals, manually set `trip_end_time` in the database:

```sql
-- Test 4-hour interval
UPDATE bookings 
SET end_time = NOW() - INTERVAL '5 hours'
WHERE id = 'your-booking-id';

-- Then run scheduler - should send first request

-- Test 24-hour interval  
UPDATE bookings 
SET end_time = NOW() - INTERVAL '25 hours'
WHERE id = 'your-booking-id';

-- Then run scheduler - should send first reminder
```

## 📧 Email Integration (Next Step)

Currently, the function logs email sending but doesn't actually send emails. To add email:

1. **Add email service** (Resend, SendGrid, etc.)
2. **Create email templates** for each type:
   - First request
   - First reminder
   - Second reminder
   - Final reminder
3. **Update scheduler** to call email service
4. **Include review link** in email with unique token

## 🚨 Important Notes

1. **Booking Status:** Function looks for `status IN ('completed', 'confirmed')`
2. **Trip End Time:** Uses `end_time` if available, otherwise calculates from `trip_date + duration`
3. **No Duplicate Sends:** Checks sent timestamps to avoid sending same email twice
4. **Expiration:** Review requests expire 30 days after trip end
5. **Status Updates:** 
   - `pending` → `sent` (after first request)
   - `sent` → `reminded` (after reminders)

---

**Status:** ✅ Core automation complete - Ready for cron setup and email integration
