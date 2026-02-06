# Serper.dev API Setup for Web Search Scraper

## Overview
The scraper now uses **Serper.dev** API to search Google for charter boats. This is a professional, reliable approach that:
- Searches the entire web (not just specific sites)
- Finds new boats each time it runs
- Provides structured JSON results
- Handles rate limiting properly
- Is cost-effective for production use

## Setup Steps

### Step 1: Get Serper.dev API Key

1. Go to: https://serper.dev/
2. Click **"Sign Up"** or **"Get Started"**
3. Create an account (free tier available)
4. Copy your **API Key** from the dashboard
   - Looks like: `abc123def456ghi789...`

### Step 2: Add to Edge Function Secrets

1. Go to: https://supabase.com/dashboard/project/rdbuwyefbgnbuhmjrizo/settings/functions
2. Or: Settings → Edge Functions → Secrets
3. Add secret:
   - **Name:** `SERPER_API_KEY`
   - **Value:** (paste your API key from Step 1)
4. Click **"Save"**

### Step 3: Enable Web Search in Scraper Config

1. Go to: http://localhost:3001/admin/scraper
2. Check the **"Web Search"** checkbox (or "Google" - they're the same)
3. Click **"Save config"**

### Step 4: Test

1. Click **"Run now"** on the scraper page
2. Check results - should find boats from web search!

## Pricing

**Free Tier:**
- 2,500 searches/month
- Perfect for testing and small-scale use

**Paid Plans:**
- $5 per 1,000 searches
- $50/month for 10,000 searches
- Very affordable for production use

## How It Works

### Two-Step Process:

1. **Search Phase:**
   - Uses Serper.dev API to search Google
   - Queries like: "charter fishing Orange Beach AL"
   - Returns structured JSON with URLs

2. **Scrape Phase:**
   - Visits each URL found
   - Extracts boat details (name, captain, phone, email, etc.)
   - Validates and deduplicates

3. **Save Phase:**
   - Checks database for existing boats (by URL, phone, email)
   - Only saves new boats
   - Updates existing boats if found

## What It Searches

**Search Queries:**
- "charter fishing [city] [state]"
- "fishing charter [city] [state]"
- "charter boat [city] [state]"
- "deep sea fishing charter [city] [state]"
- "offshore fishing charter [city] [state]"

**Cities searched:**
- Orange Beach, Gulf Shores, Destin, Pensacola, Panama City
- Biloxi, Gulfport, Port Aransas, Galveston, New Orleans
- Venice, Naples, Fort Myers, Clearwater, St. Petersburg

**States:** AL, FL, MS, LA, TX (or filtered by your config)

## Troubleshooting

### "SERPER_API_KEY not configured"
- Make sure `SERPER_API_KEY` is set in Edge Function secrets
- Redeploy the Edge Function after adding secrets

### "API key not valid"
- Check that the API key is correct
- Verify your Serper.dev account is active
- Check your API usage limits in Serper.dev dashboard

### No results found
- Check Edge Function logs for errors
- Verify API key has remaining quota
- Try different search terms
- Some sites may block scrapers (403 errors) - this is normal

### Rate limiting errors
- Serper.dev has generous rate limits
- The scraper waits 1 second between searches
- If you hit limits, wait a few minutes and try again

## Weekly Automation

To run this weekly automatically:

### Option 1: Supabase Edge Function + pg_cron
```sql
-- Schedule weekly scraper run (every Monday at 2 AM)
SELECT cron.schedule(
  'weekly-boat-scraper',
  '0 2 * * 1', -- Every Monday at 2 AM
  $$
  SELECT net.http_post(
    url := 'https://rdbuwyefbgnbuhmjrizo.supabase.co/functions/v1/enhanced-smart-scraper',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY'
    ),
    body := jsonb_build_object(
      'sources', ARRAY['web_search', 'craigslist'],
      'maxBoats', 50
    )
  );
  $$
);
```

### Option 2: Vercel Cron Job
Add to `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/admin/scraper/run",
    "schedule": "0 2 * * 1"
  }]
}
```

## Legal Considerations

✅ **Safe to use:**
- Serper.dev is a legitimate API service
- They handle Google's ToS compliance
- You're using structured data, not scraping directly

⚠️ **Best practices:**
- Respect robots.txt on individual boat pages
- Don't scrape copyrighted content (photos, long descriptions)
- Store factual data (name, phone, location) not creative content
- Rate limit your requests (already built in)

## Next Steps

After setting up Serper.dev:
1. Enable web search in the scraper config UI
2. Run the scraper manually to test
3. Set up weekly automation (pg_cron or Vercel Cron)
4. Monitor results in `scraped_boats` table
5. Convert to `vessels` using `CONVERT_SCRAPED_TO_VESSELS.sql`

## Alternative APIs

If Serper.dev doesn't work for you, consider:
- **SerpApi**: More expensive but very reliable
- **Bright Data SERP API**: For high-volume operations
- **ScraperAPI**: Includes proxy rotation

But Serper.dev is recommended for cost-effectiveness and ease of use.
