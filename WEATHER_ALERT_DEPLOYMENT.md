# Weather Alert Automation - Deployment Guide

**Status:** ✅ **READY TO DEPLOY**  
**Priority:** 🟠 **HIGH PAIN** (#2 in automation priority)

---

## What's Been Implemented

✅ **Complete Weather Alert Monitor System**
- Edge function that checks NOAA/NWS alerts every 15 minutes
- Identifies affected customers with active bookings
- Sends SMS alerts to customers (opt-in only) and captains
- Prevents duplicate alerts (24-hour window)
- Tracks all sent alerts in database
- Uses proper distance calculation (Haversine formula)
- Respects SMS opt-in preferences

---

## Deployment Steps

### 1. Run Database Migration

```sql
-- Run this in Supabase SQL Editor:
-- apps/gulfcoastcharters/supabase/migrations/20260118_weather_alert_logs.sql
```

This creates the `weather_alert_logs` table to track all sent alerts.

### 2. Deploy Edge Function

```bash
cd apps/gulfcoastcharters
supabase functions deploy weather-alert-monitor
```

### 3. Set Up Automatic Scheduling

**Option A: Supabase Cron (Recommended)**

Run this SQL in Supabase SQL Editor:

```sql
-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule weather alert monitor (every 15 minutes)
SELECT cron.schedule(
  'weather-alert-monitor',
  '*/15 * * * *',
  $$
  SELECT
    net.http_post(
      url := 'https://[YOUR-PROJECT-REF].supabase.co/functions/v1/weather-alert-monitor',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer [YOUR-SERVICE-ROLE-KEY]'
      ),
      body := jsonb_build_object('action', 'monitor')
    ) AS request_id;
  $$
);
```

**Replace:**
- `[YOUR-PROJECT-REF]` with your Supabase project reference
- `[YOUR-SERVICE-ROLE-KEY]` with your Supabase service role key

**Option B: External Cron (Alternative)**

If Supabase cron isn't available, use an external service:

- **Vercel Cron**: Add to `vercel.json`
- **GitHub Actions**: Schedule workflow
- **Cloud Scheduler**: Google Cloud / AWS EventBridge
- **Zapier/zenflow**: Scheduled trigger (every 15 minutes)

---

## Testing

### Manual Test

```bash
curl -X POST https://[YOUR-PROJECT-REF].supabase.co/functions/v1/weather-alert-monitor \
  -H "Authorization: Bearer [YOUR-SERVICE-ROLE-KEY]" \
  -H "Content-Type: application/json" \
  -d '{"action": "monitor"}'
```

Expected response:
```json
{
  "success": true,
  "stats": {
    "alerts_found": 0,
    "customers_notified": 0,
    "captains_notified": 0,
    "errors": []
  },
  "message": "Processed 0 alerts, notified 0 customers and 0 captains"
}
```

---

## How It Works

1. **Every 15 minutes**, the function runs automatically
2. **Checks 4 Gulf Coast locations** for NOAA/NWS alerts:
   - Gulf Shores, AL
   - Orange Beach, AL
   - Pensacola, FL
   - Dauphin Island, AL

3. **Filters for severe/extreme alerts** only:
   - Severe weather warnings
   - Extreme weather warnings
   - Any alert with "warning" in the event name

4. **Finds affected bookings**:
   - Confirmed bookings within 50 miles of alert location
   - Bookings that overlap with alert timeframe

5. **Sends SMS alerts**:
   - **Customers**: Only if SMS opt-in is enabled and phone is verified
   - **Captains**: All captains with active bookings
   - **Prevents duplicates**: Won't send same alert twice in 24 hours

6. **Logs everything**:
   - All sent alerts stored in `weather_alert_logs` table
   - Tracks success/failure status
   - Links to users, captains, and bookings

---

## Monitoring

### Check Alert Logs

```sql
SELECT 
  alert_id,
  phone_number,
  status,
  sent_at,
  user_id,
  captain_id,
  booking_id
FROM weather_alert_logs
ORDER BY sent_at DESC
LIMIT 50;
```

### View Recent Activity

```sql
SELECT 
  DATE_TRUNC('hour', sent_at) AS hour,
  COUNT(*) AS alerts_sent,
  COUNT(DISTINCT user_id) AS customers_notified,
  COUNT(DISTINCT captain_id) AS captains_notified
FROM weather_alert_logs
WHERE sent_at > NOW() - INTERVAL '24 hours'
GROUP BY hour
ORDER BY hour DESC;
```

---

## Configuration

### Monitoring Locations

Edit `apps/gulfcoastcharters/supabase/functions/weather-alert-monitor/index.ts`:

```typescript
const monitoringLocations = [
  { name: 'Gulf Shores', lat: 30.2460, lon: -87.7008 },
  { name: 'Orange Beach', lat: 30.2944, lon: -87.5736 },
  // Add more locations as needed
];
```

### Alert Severity Filter

Currently filters for:
- `severity` contains "severe" or "extreme"
- `event` contains "warning"

Modify the filter in the function if needed.

### Distance Radius

Currently set to **50 miles**. Change in `getActiveBookings()` function:

```typescript
return distance <= 50; // Change this value
```

---

## Environment Variables Required

The function uses these (already set in Supabase):
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key for admin access

The `twilio-sms-service` function needs:
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_PHONE_NUMBER`

---

## Troubleshooting

### No Alerts Being Sent

1. **Check for active alerts**: Visit https://api.weather.gov/alerts/active
2. **Check bookings**: Ensure you have confirmed bookings in the date range
3. **Check phone numbers**: Users must have verified phone numbers
4. **Check SMS opt-in**: Customers must have `sms_opt_in = true`
5. **Check logs**: Review `weather_alert_logs` table for errors

### Duplicate Alerts

The system prevents duplicates within 24 hours. If you see duplicates:
- Check the `alert_id` - should be unique per NOAA alert
- Check `sent_at` timestamp - should be > 24 hours apart

### Function Not Running

1. **Check cron job**: Verify it's scheduled in Supabase
2. **Check function logs**: View in Supabase Dashboard → Edge Functions → Logs
3. **Test manually**: Use the curl command above

---

## Next Steps

After deployment:
1. ✅ Monitor for 24 hours to ensure it's working
2. ✅ Check alert logs for any issues
3. ✅ Adjust monitoring locations if needed
4. ✅ Consider adding email alerts as backup
5. ✅ Add admin dashboard to view alert history

---

**Status:** ✅ **READY TO DEPLOY** - All code is production-ready!
