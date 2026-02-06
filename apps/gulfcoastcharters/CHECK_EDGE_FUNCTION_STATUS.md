# Check Edge Function Status - 502 Error Fix

## The Problem
You're getting `502` errors when trying to run the scraper. This means the Edge Function is returning a non-2xx status code.

## Quick Checks

### 1. Is the Edge Function Deployed?

**Go to:** https://supabase.com/dashboard/project/rdbuwyefbgnbuhmjrizo/functions

**Check:**
- ✅ Does `enhanced-smart-scraper` exist?
- ✅ Is it deployed (not just created)?

**If not deployed:**
1. Click "Create Function" or edit existing
2. Name: `enhanced-smart-scraper`
3. Copy code from: `apps/gulfcoastcharters/supabase/functions/enhanced-smart-scraper/index.ts`
4. Turn OFF "Verify JWT" (we handle auth ourselves)
5. Click "Deploy"

### 2. Are Environment Variables Set?

**Go to:** https://supabase.com/dashboard/project/rdbuwyefbgnbuhmjrizo/settings/functions

**Required variables:**
- `SUPABASE_URL` - Should be auto-set
- `SUPABASE_SERVICE_ROLE_KEY` - Must be set manually

**To set:**
1. Go to Settings → Edge Functions → Secrets
2. Add `SUPABASE_SERVICE_ROLE_KEY` with your service role key
3. Get service role key from: Settings → API → service_role key

### 3. Check Edge Function Logs

**Go to:** https://supabase.com/dashboard/project/rdbuwyefbgnbuhmjrizo/functions/enhanced-smart-scraper/logs

**Look for:**
- Error messages
- Stack traces
- Authentication errors
- Missing environment variables

### 4. Test Edge Function Directly

**PowerShell:**
```powershell
$SERVICE_KEY = "your-service-role-key"
$SUPABASE_URL = "https://rdbuwyefbgnbuhmjrizo.supabase.co"

curl -X POST "$SUPABASE_URL/functions/v1/enhanced-smart-scraper" `
  -H "Authorization: Bearer $SERVICE_KEY" `
  -H "apikey: $SERVICE_KEY" `
  -H "Content-Type: application/json" `
  -d '{
    "mode": "manual",
    "sources": ["thehulltruth", "craigslist"],
    "maxBoats": 10
  }'
```

**Check the response:**
- If 401: Authentication issue (check service role key)
- If 500: Function error (check logs)
- If 200: Function works, issue is in API route

## Common Issues

### Issue: "Function not found"
**Fix:** Deploy the Edge Function (Step 1)

### Issue: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
**Fix:** Set environment variables (Step 2)

### Issue: "Unauthorized. Service role key required."
**Fix:** Make sure you're passing the service role key in headers when calling the function

### Issue: Function deployed but returns 500
**Fix:** Check Edge Function logs (Step 3) for the actual error

## Next Steps

1. **Check if function exists** → Deploy if missing
2. **Check environment variables** → Set if missing
3. **Check logs** → See actual error
4. **Test directly** → Isolate the issue

Once you check the logs, share the error message and we can fix it!
