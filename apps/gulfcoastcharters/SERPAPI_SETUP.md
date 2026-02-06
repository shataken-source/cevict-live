# SerpApi Setup Guide

## What Changed

The scraper has been updated to use **SerpApi** instead of Serper.dev because Serper.dev was returning 403 Unauthorized errors.

## Quick Setup

### Step 1: Get Your SerpApi API Key

1. Go to: https://serpapi.com/users/sign_up
2. Sign up for a free account (100 searches/month free)
3. Go to: https://serpapi.com/dashboard
4. Copy your **API Key**

### Step 2: Add API Key to Supabase Edge Function Secrets

1. Go to: https://supabase.com/dashboard/project/rdbuwyefbgnbuhmjrizo/settings/functions
2. Click on "Secrets" tab
3. **Remove** `SERPER_API_KEY` if it exists (we don't need it anymore)
4. Click "Add new secret"
5. Name: `SERPAPI_API_KEY`
6. Value: (paste your SerpApi API key)
7. Click "Save"

### Step 3: Deploy Updated Edge Function

1. Go to: https://supabase.com/dashboard/project/rdbuwyefbgnbuhmjrizo/functions/enhanced-smart-scraper
2. Click "Code" tab
3. Copy ALL code from: `apps/gulfcoastcharters/supabase/functions/enhanced-smart-scraper/index.ts`
4. Paste into the function editor
5. Click "Deploy"

### Step 4: Test the Scraper

1. Go to: http://localhost:3001/admin/scraper
2. Make sure "Web Search" is checked
3. Click "Run now"
4. Check Edge Function logs for:
   - `[Web Search] Searching SerpApi: ...`
   - `[Web Search] SerpApi returned X results for "..."`
   - `[Web Search] Added URL: ...`

## Differences from Serper.dev

- **API Endpoint:** `https://serpapi.com/search.json` (GET request)
- **Authentication:** API key in query parameter `api_key` (not header)
- **Response Field:** `organic_results` (not `organic`)
- **Environment Variable:** `SERPAPI_API_KEY` (not `SERPER_API_KEY`)

## Pricing

- **Free Tier:** 100 searches/month
- **Paid Plans:** Start at $50/month for 5,000 searches
- See: https://serpapi.com/pricing

## Test Your API Key

You can test your SerpApi key directly:

```powershell
$API_KEY = "your-serpapi-key-here"
$query = "charter boat Destin FL"

$url = "https://serpapi.com/search.json?engine=google&q=$query&api_key=$API_KEY&gl=us&hl=en"

$response = Invoke-RestMethod -Uri $url
Write-Host "Results found: $($response.organic_results.Count)"
$response.organic_results | Select-Object -First 3 title, link
```

Or use the playground: https://serpapi.com/playground

## Troubleshooting

### "SERPAPI_API_KEY not configured"
- Make sure you added the secret in Supabase Edge Function secrets
- Make sure it's named exactly `SERPAPI_API_KEY` (not `SERPER_API_KEY`)

### "No organic_results from SerpApi"
- Check your API key is valid
- Check your quota at https://serpapi.com/dashboard
- Check Edge Function logs for error messages

### Still getting 0 results
- Check the logs for `[Web Search] SerpApi returned X results`
- Check if URLs are being filtered out (look for "Filtered out URL" messages)
- Try running the PowerShell test above to verify your API key works
