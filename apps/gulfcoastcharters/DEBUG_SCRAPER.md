# Debug Scraper - Get Test Data

## Step 1: Check Database Tables

Run this SQL in your test database (`nqkbqtiramecvmmpaxzk`):

```sql
-- Check if scraper tables exist
SELECT 
  'scraper_config' AS table_name,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'scraper_config')
    THEN (SELECT COUNT(*) FROM scraper_config)
    ELSE -1
  END AS row_count
UNION ALL
SELECT 'scraper_status',
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'scraper_status')
    THEN (SELECT COUNT(*) FROM scraper_status)
    ELSE -1
  END
UNION ALL
SELECT 'scraped_boats',
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'scraped_boats')
    THEN (SELECT COUNT(*) FROM scraped_boats)
    ELSE -1
  END
UNION ALL
SELECT 'scraper_logs',
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'scraper_logs')
    THEN (SELECT COUNT(*) FROM scraper_logs)
    ELSE -1
  END;
```

**If tables don't exist (row_count = -1):**
- Run migration: `supabase/migrations/20260119_scraper_core.sql` in your test database

## Step 2: Check if Edge Function is Deployed

1. **Go to:** https://supabase.com/dashboard/project/nqkbqtiramecvmmpaxzk/functions
2. **Check if `enhanced-smart-scraper` exists**
3. **If not, deploy it:**
   - Copy code from: `apps/gulfcoastcharters/supabase/functions/enhanced-smart-scraper/index.ts`
   - Paste into Dashboard → Create Function → `enhanced-smart-scraper`
   - Turn OFF "Verify JWT"
   - Deploy

## Step 3: Test Scraper API

### Option A: Via Admin UI
1. **Go to:** http://localhost:3000/admin/scraper
2. **Click "Run now"**
3. **Check results**

### Option B: Direct API Call

```powershell
# Make sure you're logged in as admin first
# Then call the API
curl -X POST http://localhost:3000/api/admin/scraper/run `
  -H "Content-Type: application/json" `
  -H "Cookie: your-session-cookie"
```

### Option C: Test Edge Function Directly

```powershell
# Get your service role key from test database
$SERVICE_KEY = "your_test_service_role_key"

curl -X POST https://nqkbqtiramecvmmpaxzk.supabase.co/functions/v1/enhanced-smart-scraper `
  -H "Authorization: Bearer $SERVICE_KEY" `
  -H "apikey: $SERVICE_KEY" `
  -H "Content-Type: application/json" `
  -d '{
    "mode": "manual",
    "sources": ["thehulltruth", "craigslist"],
    "maxBoats": 10
  }'
```

## Step 4: Check Results

After running, check the database:

```sql
-- Check scraped boats
SELECT 
  id,
  name,
  location,
  captain,
  phone,
  boat_type,
  length,
  data_complete,
  data_quality_score,
  created_at
FROM scraped_boats
ORDER BY created_at DESC
LIMIT 10;

-- Check scraper logs
SELECT 
  id,
  mode,
  boats_scraped,
  complete_boats,
  new_boats,
  started_at
FROM scraper_logs
ORDER BY started_at DESC
LIMIT 5;
```

## Step 5: Convert Scraped Boats to Vessels

The scraper saves to `scraped_boats` table. To show them on `/captains`, they need to be in `vessels` or `boats` table.

**Check if there's a migration or script to convert scraped_boats → vessels**

## Common Issues

### Issue: "Function not found"
**Fix:** Deploy the Edge Function (Step 2)

### Issue: "Table does not exist"
**Fix:** Run migration `20260119_scraper_core.sql`

### Issue: "401 Unauthorized"
**Fix:** Make sure Edge Function has "Verify JWT" turned OFF

### Issue: "No boats scraped"
**Possible causes:**
- Websites changed their HTML structure
- Rate limiting
- Network issues
- Sources are down

**Debug:** Check Edge Function logs in Supabase Dashboard
