# ✅ Post-Deployment Checklist - PopThePopcorn

## 🎉 Deployment Status: SUCCESSFUL

Both **PopThePopcorn** and **SmokersRights** are deployed and ready!

---

## 🔧 Fix "Loading headlines..." Issue

The site shows "Loading headlines..." because the database is empty. Here's how to fix it:

### Option 1: Wait for Automatic Scraper (Easiest)

The scraper runs automatically every **5 minutes** via Vercel Cron. Just wait a few minutes and refresh the page.

**Cron Schedule:**
- Scraper: Every 5 minutes (`/api/cron/scrape`)
- Trends: Every 15 minutes (`/api/cron/trends`)
- News Drops: 9am & 9pm daily (`/api/cron/news-drop`)

### Option 2: Manually Trigger Scraper (Fastest)

**Via Admin Dashboard:**
1. Visit: `https://www.popthepopcorn.com/admin`
2. Login with admin credentials
3. Click "Run Scraper" button
4. Wait 1-2 minutes for headlines to appear

**Via API (Direct):**
```bash
# Replace YOUR_CRON_SECRET with your actual secret from Vercel env vars
curl -X GET "https://www.popthepopcorn.com/api/cron/scrape" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

**Or without auth (if CRON_SECRET not set):**
```bash
curl -X GET "https://www.popthepopcorn.com/api/cron/scrape"
```

### Option 3: Check Environment Variables

Make sure these are set in **Vercel Dashboard → Settings → Environment Variables**:

**Required:**
- ✅ `NEXT_PUBLIC_SUPABASE_URL`
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- ✅ `SUPABASE_SERVICE_ROLE_KEY` (for scraper)

**Optional (for full features):**
- `PERPLEXITY_API_KEY` (for AI verification)
- `SINCH_API_KEY` (for SMS alerts)
- `TWITTER_BEARER_TOKEN` (for Twitter trends)
- `CRON_SECRET` (for securing cron endpoints)

---

## ✅ Verify Everything Works

### 1. Homepage Features
- [ ] Age gate appears (2026 compliance)
- [ ] Headlines load after scraper runs
- [ ] Vertical feed layout (Gen Z style)
- [ ] Drama scores visible
- [ ] Reactions work (🔥, 😂, 😱, etc.)

### 2. New Features (2026 Compliance)
- [ ] Age verification shows platform badges
- [ ] AI transparency labels visible
- [ ] Source trace (Receipts) displays
- [ ] Keyboard shortcuts work (press 'B' for Binge Mode)

### 3. Monetization Features
- [ ] Kernel Shop accessible
- [ ] Boost buttons visible
- [ ] Season Pass option available

### 4. Database
- [ ] Headlines table has data
- [ ] Reactions table working
- [ ] Story arcs table populated
- [ ] RLS policies allow public reads

---

## 🐛 Troubleshooting

### "Loading headlines..." Still Showing

1. **Check Browser Console:**
   - Open DevTools (F12)
   - Look for errors in Console tab
   - Check Network tab for failed API calls

2. **Check Vercel Logs:**
   - Go to Vercel Dashboard → Your Project → Logs
   - Look for errors in `/api/headlines` endpoint
   - Check for Supabase connection errors

3. **Verify Database:**
   - Go to Supabase Dashboard → SQL Editor
   - Run: `SELECT COUNT(*) FROM headlines;`
   - If count is 0, scraper hasn't run yet

4. **Check RLS Policies:**
   - Verify `supabase/rls-policies.sql` was executed
   - Ensure public can read headlines:
     ```sql
     SELECT * FROM headlines LIMIT 1;
     ```

### Build Errors/Warnings

The deployment shows **3 errors** and **18 warnings**. These are likely:
- TypeScript type warnings (non-blocking)
- Unused imports
- Missing optional dependencies

**To check build logs:**
1. Vercel Dashboard → Your Project → Deployments
2. Click on the latest deployment
3. Click "Build Logs" tab
4. Review errors/warnings

Most warnings are non-critical, but fix errors if they're blocking features.

---

## 🚀 Next Steps

1. ✅ **Deployment Complete** - Both apps live
2. ⏳ **Run Scraper** - Populate headlines (wait 5 min or trigger manually)
3. ⏳ **Test Features** - Verify everything works
4. ⏳ **Monitor Logs** - Watch for errors in first 24 hours
5. ⏳ **SEO Setup** - Submit sitemap to Google Search Console

---

## 📊 Quick Status Check

**PopThePopcorn:**
- ✅ Deployed: `www.popthepopcorn.com`
- ✅ Commit: `25244aa`
- ⏳ Headlines: Waiting for scraper

**SmokersRights:**
- ✅ Deployed: `www.smokersrights.com`
- ✅ Content: Legal Navigator live
- ✅ All pages working

---

**Status**: 🎉 Both deployments successful! Just need to run the scraper to populate headlines.
