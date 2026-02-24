# 🚀 Pre-Deployment Checklist & Suggestions

## ✅ Critical Steps Before Deploying

### 1. **Run Database Migration** ⚠️ IMPORTANT
The new `scrape_jobs` table needs to be created in Supabase:

```sql
-- Run this in Supabase SQL Editor:
-- File: apps/wheretovacation/sql/CREATE_SCRAPE_JOBS_TABLE.sql
```

**Steps:**
1. Go to: https://app.supabase.com/project/rdbuwyefbgnbuhmjrizo
2. Click: SQL Editor
3. Paste the contents of `CREATE_SCRAPE_JOBS_TABLE.sql`
4. Click: Run
5. Verify table was created (check Table Editor)

### 2. **Environment Variables** (Vercel Dashboard)
**Required Minimum:**
- `NEXT_PUBLIC_SUPABASE_URL` ✅ (already have)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` ✅ (already have)
- `SUPABASE_SERVICE_ROLE_KEY` ⚠️ (needed for scraping)
- `NEXT_PUBLIC_SITE_URL=https://petreunion.org`
- `NODE_ENV=production`

**Optional but Recommended:**
- `FACEBOOK_APP_ID=1870710053552467` (for scraping)
- `FACEBOOK_APP_SECRET` (if you have it)
- `FACEBOOK_EMAIL` (for automated scraping)
- `FACEBOOK_PASSWORD` (for automated scraping)

### 3. **Test Build Locally**
```powershell
cd apps/wheretovacation
pnpm build
```

**Check for:**
- ✅ No TypeScript errors
- ✅ No missing dependencies
- ✅ Build completes successfully
- ⚠️ Warnings are okay, but fix errors

### 4. **Verify Key Features Work**
- [ ] Homepage loads
- [ ] Report Lost Pet form works
- [ ] Search functionality works
- [ ] Admin dashboard accessible
- [ ] Scraper configuration works (state dropdown, city input)
- [ ] Stats display correctly

---

## 🎯 Deployment Suggestions

### **Option 1: Vercel Dashboard (Recommended - Easiest)**

1. **Go to Vercel Dashboard:**
   - https://vercel.com/dashboard
   - Import/Select your project

2. **Set Root Directory:**
   - Settings → General → Root Directory
   - Set to: `apps/wheretovacation`

3. **Add Environment Variables:**
   - Settings → Environment Variables
   - Add all from `PRODUCTION_ENV_VARS.txt`
   - Make sure to set for "Production" environment

4. **Deploy:**
   - Go to Deployments tab
   - Click "Redeploy" or push to GitHub (auto-deploys)

### **Option 2: Vercel CLI**

```powershell
cd apps/wheretovacation
.\DEPLOY_VERCEL.ps1
```

---

## 🔒 Security Recommendations

### 1. **Rate Limiting** ✅ Already Implemented
- User scraping: 1-10 scrapes/day (tiered)
- IP-based: 5 scrapes/hour
- Geographic deduplication: 24-hour cache

### 2. **Input Validation** ✅ Already Implemented
- All inputs sanitized
- SQL injection prevented (parameterized queries)
- State validation (dropdown only)
- City validation (regex pattern)

### 3. **Database Security**
- ✅ RLS (Row Level Security) enabled on `scrape_jobs`
- ✅ Service role key only used server-side
- ✅ User data isolated by user_id

### 4. **Environment Variables**
- ⚠️ Never commit secrets to Git
- ✅ All secrets in Vercel dashboard
- ✅ Service role key not exposed to client

---

## 📊 Post-Deployment Monitoring

### **Things to Watch:**

1. **Build Logs:**
   - Check Vercel deployment logs for errors
   - Look for missing environment variables
   - Check for timeout issues

2. **Runtime Errors:**
   - Monitor Vercel Function logs
   - Check for API errors
   - Watch for database connection issues

3. **Performance:**
   - Monitor function execution time
   - Watch for cold starts
   - Check database query performance

4. **User Scraping:**
   - Monitor `scrape_jobs` table
   - Check for failed jobs
   - Watch rate limit violations

---

## 🐛 Common Issues & Fixes

### **Issue: "Table scrape_jobs does not exist"**
**Fix:** Run the SQL migration in Supabase SQL Editor

### **Issue: "Rate limit exceeded"**
**Fix:** This is working as intended - users hit their daily limit

### **Issue: "No unscanned shelters found"**
**Fix:** This is normal - means all shelters in that area are already scanned. Try:
- Different city/state
- Run "Discover Shelters" first
- Check if shelters exist in database

### **Issue: Build fails with "Module not found"**
**Fix:** 
```powershell
cd apps/wheretovacation
pnpm install
pnpm build
```

### **Issue: "Environment variable not found"**
**Fix:** Add missing variable in Vercel Dashboard → Settings → Environment Variables

---

## 🚀 Quick Deploy Command

**One-liner to deploy:**
```powershell
cd apps/wheretovacation && pnpm build && vercel --prod
```

**Or use the script:**
```powershell
.\DEPLOY_VERCEL.ps1
```

---

## ✅ Final Checklist

Before clicking "Deploy":

- [ ] Database migration run (`scrape_jobs` table exists)
- [ ] Environment variables set in Vercel
- [ ] Local build succeeds (`pnpm build`)
- [ ] No critical errors in build logs
- [ ] Tested admin scraper (state dropdown works)
- [ ] Tested city input (can type freely)
- [ ] Code committed to Git (if using auto-deploy)

---

## 💡 Pro Tips

1. **Deploy to Preview First:**
   - Test on preview URL before production
   - Vercel creates preview for every PR

2. **Monitor First Scrape:**
   - Watch the first user scrape request
   - Check logs for any issues
   - Verify rate limiting works

3. **Database Backup:**
   - Backup before major changes
   - Supabase has automatic backups (check settings)

4. **Gradual Rollout:**
   - Consider feature flags for new features
   - Monitor error rates after deployment
   - Have rollback plan ready

---

## 🎉 You're Ready!

Once checklist is complete, you're good to deploy. The system is:
- ✅ Secure (input validation, rate limiting, RLS)
- ✅ Scalable (queue-based, async processing)
- ✅ User-friendly (combo boxes, clear errors)
- ✅ Production-ready (error handling, logging)

**Good luck with the deployment! 🚀**

