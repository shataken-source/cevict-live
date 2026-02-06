# Zapier Weather Alert Automation Setup

**Function:** `weather-alert-monitor`  
**Frequency:** Every 15 minutes  
**Status:** ✅ Ready to connect

---

## Zapier Command

Use this command with Zapier AI or when setting up the automation manually:

---

## For Zapier AI

```
I need to set up a scheduled automation that calls a Supabase Edge Function every 15 minutes.

**Trigger:**
- Schedule: Every 15 minutes
- Time: Any time (24/7 monitoring)

**Action:**
- App: Webhooks by Zapier
- Event: POST
- URL: https://[YOUR-PROJECT-REF].supabase.co/functions/v1/weather-alert-monitor
- Method: POST
- Headers:
  - Content-Type: application/json
  - Authorization: Bearer [YOUR-SERVICE-ROLE-KEY]
- Data:
  {
    "action": "monitor"
  }

**Purpose:**
This automation monitors NOAA weather alerts for severe/extreme weather conditions affecting Gulf Coast charter bookings. It automatically sends SMS alerts to customers and captains when severe weather is detected.

**Expected Response:**
{
  "success": true,
  "stats": {
    "alerts_found": 0,
    "customers_notified": 0,
    "captains_notified": 0,
    "errors": []
  },
  "message": "Processed X alerts, notified Y customers and Z captains"
}
```

---

## Manual Zapier Setup Steps

### Step 1: Create New Zap

1. Go to Zapier → Create Zap
2. Name it: "Weather Alert Monitor - Gulf Coast Charters"

### Step 2: Set Trigger

1. **Trigger App:** Schedule by Zapier
2. **Trigger Event:** Every 15 minutes
3. **Settings:**
   - Interval: 15 minutes
   - Time: Any time (runs 24/7)

### Step 3: Set Action

1. **Action App:** Webhooks by Zapier
2. **Action Event:** POST
3. **URL:** 
   ```
   https://[YOUR-PROJECT-REF].supabase.co/functions/v1/weather-alert-monitor
   ```
   Replace `[YOUR-PROJECT-REF]` with your Supabase project reference

4. **Method:** POST

5. **Headers:**
   ```
   Content-Type: application/json
   Authorization: Bearer [YOUR-SERVICE-ROLE-KEY]
   ```
   Replace `[YOUR-SERVICE-ROLE-KEY]` with your Supabase service role key

6. **Data (JSON):**
   ```json
   {
     "action": "monitor"
   }
   ```

### Step 4: Test

1. Click "Test" to send a test request
2. Expected response:
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

### Step 5: Turn On

1. If test is successful, turn on the Zap
2. It will now run every 15 minutes automatically

---

## What You Need

### Supabase Project Reference
- Found in your Supabase Dashboard URL
- Format: `https://[project-ref].supabase.co`
- Example: `abcdefghijklmnop`

### Supabase Service Role Key
- Found in: Supabase Dashboard → Settings → API → Service Role Key
- **⚠️ Keep this secret!** Never share publicly
- Format: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

---

## How It Works

1. **Every 15 minutes**, Zapier triggers the webhook
2. **Webhook calls** the Supabase Edge Function
3. **Function checks** NOAA alerts for 4 Gulf Coast locations:
   - Gulf Shores, AL
   - Orange Beach, AL
   - Pensacola, FL
   - Dauphin Island, AL
4. **If severe alerts found**, function:
   - Finds affected bookings (50-mile radius)
   - Sends SMS to customers (opt-in only)
   - Sends SMS to captains (always)
   - Logs everything to database
5. **Response sent back** to Zapier with stats

---

## Monitoring

### Check Zapier Logs
- Go to Zapier → Your Zap → History
- View each run's status and response

### Check Function Logs
- Supabase Dashboard → Edge Functions → weather-alert-monitor → Logs
- View detailed execution logs

### Check Database
```sql
SELECT 
  COUNT(*) as total_alerts,
  COUNT(DISTINCT user_id) as customers_notified,
  COUNT(DISTINCT captain_id) as captains_notified
FROM weather_alert_logs
WHERE sent_at > NOW() - INTERVAL '24 hours';
```

---

## Troubleshooting

### Zapier Shows Error

**Error: 401 Unauthorized**
- Check your service role key is correct
- Verify Authorization header format: `Bearer [key]`

**Error: 404 Not Found**
- Verify your project reference is correct
- Check the function is deployed: `supabase functions deploy weather-alert-monitor`

**Error: 500 Internal Server Error**
- Check Supabase function logs
- Verify database migration is run
- Check Twilio credentials are set

### No Alerts Being Sent

- This is normal if there are no severe weather alerts
- Check NOAA alerts manually: https://api.weather.gov/alerts/active
- Verify you have confirmed bookings in the date range
- Check users have verified phone numbers and SMS opt-in enabled

---

## Alternative: Use Supabase Cron Instead

If you prefer not to use Zapier, you can use Supabase's built-in cron:

1. Run the SQL migration: `20260118_weather_alert_cron.sql`
2. Update with your project URL and service role key
3. Cron job will run automatically every 15 minutes

See `WEATHER_ALERT_DEPLOYMENT.md` for details.

---

## Cost Considerations

- **Zapier:** Free plan allows 100 tasks/month
  - 15-minute schedule = 96 tasks/day = ~2,880/month
  - You'll need a paid Zapier plan (~$20/month)
- **Supabase Cron:** Free (if available on your plan)
- **SMS Costs:** Twilio charges per SMS sent
  - Only sent when severe weather alerts are detected
  - Typically very few alerts per month

---

**Status:** ✅ Ready for Zapier integration!
