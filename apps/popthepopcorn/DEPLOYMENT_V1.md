# 🚀 PopThePopcorn v1.0 - Final Deployment Guide

## Quick Deploy Checklist

### 1. Database Setup (Supabase)
```sql
-- Run these in order in Supabase SQL Editor:
1. supabase/schema.sql
2. supabase/rls-policies.sql  
3. supabase/story-arcs-schema.sql
4. supabase/default-settings.sql

-- CRITICAL: Refresh schema cache
-- Go to: Supabase Dashboard > Settings > API > "Reload schema cache"
```

### 2. Environment Variables (Vercel)

**Required:**
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
ADMIN_PASSWORD=your_secure_password
```

**Optional (but recommended):**
```
PERPLEXITY_API_KEY=pplx-...
TWITTER_BEARER_TOKEN=...
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
SINCH_SERVICE_PLAN_ID=...
SINCH_API_TOKEN=...
SINCH_FROM_NUMBER=+1234567890
SINCH_REGION=us
```

### 3. Deploy to Vercel

**Option A: Via Git (Recommended)**
```bash
# Push to main branch
git push origin main

# Vercel will auto-deploy if connected to repo
```

**Option B: Via Vercel CLI**
```bash
cd apps/popthepopcorn
vercel --prod
```

**Option C: Via Vercel Dashboard**
1. Go to vercel.com
2. Import project from Git
3. Set root directory to `apps/popthepopcorn`
4. Add environment variables
5. Deploy

### 4. Post-Deployment

1. **Test the site:**
   - Visit your Vercel URL
   - Age gate should appear
   - Verify age to enter
   - Check all features work

2. **Run initial scraper:**
   - Go to `/admin` (password protected)
   - Click "Run Scraper"
   - Wait for headlines to populate

3. **Verify features:**
   - [ ] Headlines displaying
   - [ ] Drama vote slider works
   - [ ] Probability calculator shows
   - [ ] Reactions work
   - [ ] Story Arcs appear (if high drama stories)
   - [ ] Binge Mode works
   - [ ] ChatBot opens
   - [ ] Virtual currency (Salt) displays
   - [ ] Streak tracking works

### 5. Custom Domain (Optional)

1. In Vercel Dashboard > Settings > Domains
2. Add `popthepopcorn.com`
3. Update DNS records as instructed
4. Wait for SSL certificate

### 6. Cron Jobs (Vercel)

Cron jobs are configured in `vercel.json`:
- Scraper: Every 5 minutes
- Trends: Every 15 minutes  
- News Drops: 9 AM & 9 PM daily

**First deployment:** Cron jobs activate automatically.

### 7. Monitoring

- **Vercel Analytics:** Enable in dashboard
- **Error Tracking:** Check Vercel logs
- **Performance:** Use Vercel Speed Insights

## Troubleshooting

### "No headlines yet"
- Run scraper manually from admin
- Check Supabase RLS policies
- Verify environment variables

### "Schema cache" errors
- Go to Supabase Dashboard > Settings > API
- Click "Reload schema cache"
- Wait 30 seconds

### Cron jobs not running
- Check Vercel dashboard > Functions > Cron
- Verify `vercel.json` is in root
- Check function logs

## Success! 🎉

Your Gen Z news platform is live! Share it and watch the drama unfold. 🍿
