# Debug: Serper.dev Returning 403 Forbidden

## Current Issue
Serper.dev API is returning `HTTP 403 Forbidden` for all search requests, resulting in 0 URLs found.

## Quick Diagnostic Steps

### Step 1: Verify API Key is Set in Supabase

1. Go to: https://supabase.com/dashboard/project/rdbuwyefbgnbuhmjrizo/settings/functions
2. Click on "Secrets" tab
3. Look for `SERPER_API_KEY`
4. **If missing:**
   - Click "Add new secret"
   - Name: `SERPER_API_KEY`
   - Value: (your Serper.dev API key from https://serper.dev/dashboard)
   - Click "Save"
   - **Important:** Redeploy the Edge Function after adding the secret

### Step 2: Verify API Key is Valid

**Test your API key directly:**

```powershell
$API_KEY = "your-serper-api-key-here"
$body = @{
    q = "charter boat Destin FL"
    num = 10
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "https://google.serper.dev/search" `
    -Method POST `
    -Headers @{
        "X-API-KEY" = $API_KEY
        "Content-Type" = "application/json"
    } `
    -Body $body

Write-Host "Results: $($response.organic.Count)"
```

**Expected results:**
- If API key is valid: You'll see a JSON response with `organic` array containing search results
- If API key is invalid: You'll get a 401 or 403 error with an error message
- If quota is exhausted: You'll get a 403 with a message about quota

### Step 3: Check Serper.dev Dashboard

1. Go to: https://serper.dev/dashboard
2. Log in with your account
3. Check:
   - **API Key:** Is it the same one you set in Supabase?
   - **Quota:** Do you have remaining searches?
   - **Status:** Is your account active?

### Step 4: Verify Edge Function is Deployed

1. Go to: https://supabase.com/dashboard/project/rdbuwyefbgnbuhmjrizo/functions/enhanced-smart-scraper
2. Click on "Code" tab
3. Check if the code includes the new error logging:
   - Look for: `[Web Search] API Key present:`
   - Look for: `[Web Search] Request body:`
   - Look for: `[Web Search] API returned 403:`

**If these logs don't appear in the code:**
- The function hasn't been redeployed with the latest changes
- Copy the code from `apps/gulfcoastcharters/supabase/functions/enhanced-smart-scraper/index.ts`
- Paste it into the Supabase function editor
- Click "Deploy"

### Step 5: Check Recent Logs After Redeploy

After redeploying, run the scraper again and look for these new log messages:

1. `[Web Search] API Key present: Yes (abc12345...)` or `No (missing)`
2. `[Web Search] Request body: {"q":"charter boat Destin FL","num":10}`
3. `[Web Search] API returned 403: [actual error message]`

The actual error message from Serper.dev will tell us:
- **"Invalid API key"** → API key is wrong or not set
- **"Quota exceeded"** → You've used up your free tier searches
- **"Forbidden"** → Account issue or API key format problem

## Most Common Issues

### Issue 1: API Key Not Set
**Symptom:** Logs show `[Web Search] API Key present: No (missing)`

**Fix:**
1. Add `SERPER_API_KEY` to Edge Function secrets (Step 1)
2. Redeploy the function

### Issue 2: Invalid API Key
**Symptom:** Logs show `[Web Search] API returned 403: Invalid API key` or similar

**Fix:**
1. Get your API key from https://serper.dev/dashboard
2. Verify it's correct (no extra spaces, complete key)
3. Update it in Supabase Edge Function secrets
4. Redeploy the function

### Issue 3: Quota Exhausted
**Symptom:** Logs show `[Web Search] API returned 403: Quota exceeded` or similar

**Fix:**
1. Check your quota at https://serper.dev/dashboard
2. Wait for quota to reset (usually monthly)
3. Or upgrade your Serper.dev plan

### Issue 4: Function Not Redeployed
**Symptom:** New error logs don't appear, only old generic errors

**Fix:**
1. Copy latest code from `index.ts`
2. Deploy to Supabase
3. Run scraper again
4. Check for new detailed error logs

## Next Steps

1. **Run the PowerShell test** (Step 2) to verify your API key works
2. **Check Supabase secrets** (Step 1) to ensure API key is set
3. **Redeploy the function** with the latest code (Step 4)
4. **Run the scraper** and check for detailed error messages (Step 5)
5. **Share the detailed error message** so we can fix the specific issue

## Alternative: Use Different Search API

If Serper.dev continues to have issues, we can switch to:
- **SerpApi** (similar to Serper.dev)
- **Google Custom Search API** (requires Google Cloud setup)
- **Bing Search API** (Microsoft alternative)

Let me know what the detailed error logs show after redeploying!
