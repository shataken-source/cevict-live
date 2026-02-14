# ⚡ Quick Deploy Guide

## 🎯 3-Step Deployment

### Step 1: Run Database Migration (2 minutes)
```sql
-- Copy/paste this into Supabase SQL Editor:
-- File: apps/wheretovacation/sql/CREATE_SCRAPE_JOBS_TABLE.sql
```

### Step 2: Set Environment Variables (3 minutes)
**In Vercel Dashboard:**
1. Go to: Settings → Environment Variables
2. Add these (if not already set):
   - `SUPABASE_SERVICE_ROLE_KEY` (from Supabase Dashboard)
   - `NEXT_PUBLIC_SITE_URL=https://petreunion.org`
   - `NODE_ENV=production`

### Step 3: Deploy (1 minute)
```powershell
cd apps/wheretovacation
.\DEPLOY_VERCEL.ps1
```

**OR** push to GitHub (auto-deploys if connected)

---

## ✅ That's It!

Your deployment includes:
- ✅ User-initiated scraping (queue-based, secure)
- ✅ Admin scraper with combo boxes
- ✅ Case-insensitive city/state matching
- ✅ Rate limiting & abuse prevention
- ✅ Detailed stats for Facebook scraping
- ✅ All security measures in place

**Total time: ~6 minutes** 🚀

