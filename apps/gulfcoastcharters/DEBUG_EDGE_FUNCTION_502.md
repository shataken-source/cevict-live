# Debug Edge Function 502 Error

## Current Status
- ✅ RBAC working (admin access granted)
- ✅ API route working (can call Edge Function)
- ❌ Edge Function returning 502 (non-2xx status)

## Step 1: Check Recent Logs

**Go to:** https://supabase.com/dashboard/project/rdbuwyefbgnbuhmjrizo/functions/enhanced-smart-scraper/logs

**Look for logs AFTER you clicked "Run now":**
- Scroll to the most recent entries
- Look for error messages, stack traces, or warnings
- Check timestamps match when you clicked "Run now"

**If you see no logs after clicking "Run now":**
- Function might not be deployed
- Function might not be receiving requests

## Step 2: Verify Function is Deployed

**Go to:** https://supabase.com/dashboard/project/rdbuwyefbgnbuhmjrizo/functions

**Check:**
1. Does `enhanced-smart-scraper` appear in the list?
2. Does it show as "Active" or "Deployed"?
3. Click on it - does it show the code?

**If not deployed:**
1. Click "Create Function" or edit existing
2. Name: `enhanced-smart-scraper`
3. Copy ALL code from: `apps/gulfcoastcharters/supabase/functions/enhanced-smart-scraper/index.ts`
4. Turn OFF "Verify JWT"
5. Click "Deploy"

## Step 3: Check Environment Variables

**Go to:** https://supabase.com/dashboard/project/rdbuwyefbgnbuhmjrizo/settings/functions

**Or:** Settings → Edge Functions → Secrets

**Required:**
- `SUPABASE_URL` (usually auto-set)
- `SUPABASE_SERVICE_ROLE_KEY` (must set manually)

**To set SUPABASE_SERVICE_ROLE_KEY:**
1. Go to: Settings → API
2. Copy the `service_role` key (keep it secret!)
3. Go to: Settings → Edge Functions → Secrets
4. Add new secret:
   - Name: `SUPABASE_SERVICE_ROLE_KEY`
   - Value: (paste your service role key)
5. Save

## Step 4: Test Function Directly

**Get your service role key:**
- Go to: https://supabase.com/dashboard/project/rdbuwyefbgnbuhmjrizo/settings/api
- Copy the `service_role` key

**Test in PowerShell:**
```powershell
$SERVICE_KEY = "your-service-role-key-here"
$SUPABASE_URL = "https://rdbuwyefbgnbuhmjrizo.supabase.co"

$response = curl -X POST "$SUPABASE_URL/functions/v1/enhanced-smart-scraper" `
  -H "Authorization: Bearer $SERVICE_KEY" `
  -H "apikey: $SERVICE_KEY" `
  -H "Content-Type: application/json" `
  -d '{
    "mode": "manual",
    "sources": ["thehulltruth"],
    "maxBoats": 5
  }' `
  -v

Write-Host "Status Code:" $response.StatusCode
Write-Host "Response:" $response.Content
```

**Or use Postman/Insomnia:**
- URL: `https://rdbuwyefbgnbuhmjrizo.supabase.co/functions/v1/enhanced-smart-scraper`
- Method: `POST`
- Headers:
  - `Authorization: Bearer YOUR_SERVICE_ROLE_KEY`
  - `apikey: YOUR_SERVICE_ROLE_KEY`
  - `Content-Type: application/json`
- Body:
```json
{
  "mode": "manual",
  "sources": ["thehulltruth"],
  "maxBoats": 5
}
```

## Step 5: Check Terminal for Detailed Error

The improved error logging should show more details. Look in your terminal where `npm run dev` is running for:

```
[Scraper] Edge Function error: {
  message: ...,
  context: ...,
  status: ...,
  name: ...
}
```

**Share that error message** and we can fix it!

## Most Likely Issues

1. **Function not deployed** → Deploy it (Step 2)
2. **Missing SUPABASE_SERVICE_ROLE_KEY** → Set it (Step 3)
3. **Function syntax error** → Check logs for stack trace
4. **Function timeout** → Check logs for timeout errors

## Quick Fix Checklist

- [ ] Function exists in Supabase Dashboard
- [ ] Function is deployed (not just created)
- [ ] "Verify JWT" is turned OFF
- [ ] `SUPABASE_SERVICE_ROLE_KEY` is set in Edge Function secrets
- [ ] Check logs for actual error message
- [ ] Test function directly with curl/Postman

Once you check the logs and share the error, we can fix it quickly!
