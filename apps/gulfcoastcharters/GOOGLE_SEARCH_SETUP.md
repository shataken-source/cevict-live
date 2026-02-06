# Known Charter Sites Scraper Setup

## Overview
The scraper now includes direct scraping of known Gulf Coast charter websites. This is more reliable than trying to use Google Custom Search (which only searches specific sites you configure). The scraper directly visits popular charter boat websites and extracts boat information.

## Setup Steps

**No setup required!** The scraper automatically scrapes known charter websites. Just enable it in the config.

### Step 1: Enable Known Sites in Scraper Config

1. Go to: http://localhost:3001/admin/scraper
2. Check the **"Known Sites"** checkbox (or "Google" - they're the same now)
3. Click **"Save config"**

### Step 2: Test

1. Click **"Run now"** on the scraper page
2. Check results - should find boats from known charter websites!

## Free Tier Limits

- **Google Custom Search API:** 100 free searches/day
- After that, it's $5 per 1,000 searches

## What It Searches

The scraper searches for:
- "charter fishing [city] [state]"
- "fishing charter [city] [state]"
- "charter boat [city] [state]"
- "deep sea fishing charter [city] [state]"
- "offshore fishing charter [city] [state]"
- "gulf coast charter [city] [state]"

**Cities searched:**
- Orange Beach, Gulf Shores, Destin, Pensacola, Panama City
- Biloxi, Gulfport, Port Aransas, Galveston, New Orleans
- Venice, Naples, Fort Myers, Clearwater, St. Petersburg

**States:** AL, FL, MS, LA, TX (or filtered by your config)

## Troubleshooting

### No results found
- Some websites may block scrapers (403 errors)
- Websites may have changed their structure
- Check Edge Function logs for specific errors

### 403 Forbidden errors
- Some sites block automated access
- The scraper will skip blocked sites and continue with others
- This is normal - not all sites allow scraping

### Timeout errors
- Some sites may be slow to respond
- The scraper has a 15-second timeout per site
- Slow sites will be skipped automatically

## Next Steps

After setting up Google search:
1. Enable it in the scraper config UI
2. Run the scraper
3. Check `scraped_boats` table for results
4. Convert to `vessels` using `CONVERT_SCRAPED_TO_VESSELS.sql`
