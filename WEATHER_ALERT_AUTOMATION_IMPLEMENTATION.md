# Weather Alert Automation - Implementation Guide

**Status:** ✅ **READY FOR AUTOMATION**  
**Priority:** 🟠 **HIGH PAIN** (#2 in automation priority)

---

## What I've Built

I've created the **weather-alert-monitor** edge function that:

1. ✅ Monitors weather alerts from NOAA/NWS
2. ✅ Identifies affected customers with active bookings
3. ✅ Sends SMS alerts to customers and captains
4. ✅ Tracks sent alerts to prevent duplicates
5. ✅ Ready for Zapier/zenflow integration

---

## Files Created

### 1. Edge Function
- `apps/gulfcoastcharters/supabase/functions/weather-alert-monitor/index.ts`
  - Complete implementation ready to deploy
  - Can be triggered manually or via cron

### 2. Database Migration
- `apps/gulfcoastcharters/supabase/migrations/20260118_weather_alert_logs.sql`
  - Tracks all sent alerts
  - Prevents duplicate notifications

---

## How It Works

### Current Implementation (Edge Function)
```
1. Function checks NOAA alerts for Gulf Coast locations
2. Filters for severe/extreme alerts
3. Finds active bookings in affected areas
4. Sends SMS to customers and captains
5. Logs all alerts sent
```

### Automation Integration (Zapier/zenflow)
```
Trigger: Scheduled (every 15 minutes) OR Manual
  ↓
Action: Call weather-alert-monitor edge function
  ↓
Result: SMS alerts sent automatically
```

---

## Next Steps

### Option 1: Use Existing Edge Function (Recommended)
**What to do:**
1. Deploy the `weather-alert-monitor` edge function to Supabase
2. Set up Zapier/zenflow to call it on a schedule (every 15 minutes)
3. Done! ✅

**Command for Zapier/zenflow:**
```
Set up a scheduled trigger (every 15 minutes) that calls:
POST https://[your-supabase-url]/functions/v1/weather-alert-monitor
Headers: Authorization: Bearer [service-role-key]
Body: { "action": "monitor" }
```

### Option 2: Build Full Zapier Automation
**What to do:**
1. Use Zapier's NOAA/NWS integration as trigger
2. Filter for severe alerts
3. Query Supabase for affected bookings
4. Send SMS via Twilio/Sinch
5. Log in Supabase

---

## Recommendation

**Use Option 1** - The edge function is already built and ready. Just:
1. Deploy it: `supabase functions deploy weather-alert-monitor`
2. Set up Zapier/zenflow to call it every 15 minutes
3. Done!

This is faster and uses your existing infrastructure.

---

## Testing

After deployment, test with:
```bash
curl -X POST https://[supabase-url]/functions/v1/weather-alert-monitor \
  -H "Authorization: Bearer [service-role-key]" \
  -H "Content-Type: application/json" \
  -d '{"action": "monitor"}'
```

---

**Status:** ✅ Edge function ready. You can either:
- Deploy it and connect via Zapier/zenflow (recommended)
- Or build full Zapier automation from scratch
