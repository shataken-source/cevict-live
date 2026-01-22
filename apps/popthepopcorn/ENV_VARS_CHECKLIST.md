# Environment Variables Checklist - PopThePopcorn

## ✅ Required Variables (Must Set in Vercel)

Set these in **Vercel Dashboard → Your Project → Settings → Environment Variables**

### Supabase (Required)
- [ ] `NEXT_PUBLIC_SUPABASE_URL`
  - Get from: Supabase Dashboard → Settings → API → Project URL
  - Example: `https://xxxxx.supabase.co`

- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - Get from: Supabase Dashboard → Settings → API → Project API keys → `anon` `public`
  - Used for: Client-side database access

- [ ] `SUPABASE_SERVICE_ROLE_KEY`
  - Get from: Supabase Dashboard → Settings → API → Project API keys → `service_role` `secret`
  - Used for: Server-side scraper and admin operations
  - ⚠️ **Keep this secret!** Never expose in client-side code

---

## 🔧 Optional Variables (For Full Features)

### AI Verification
- [ ] `PERPLEXITY_API_KEY`
  - Get from: https://www.perplexity.ai/settings/api
  - Used for: AI-powered headline verification
  - Without it: Verification will use basic heuristics

### SMS Alerts
- [ ] `SINCH_API_KEY`
  - Get from: https://dashboard.sinch.com/
  - Used for: SMS news alerts
  - Without it: SMS alerts feature disabled

### Twitter Trends
- [ ] `TWITTER_BEARER_TOKEN`
  - Get from: Twitter Developer Portal
  - Used for: Real-time Twitter trend monitoring
  - Without it: Trends will use database-only sources

### Cron Security
- [ ] `CRON_SECRET`
  - Create your own: Random secure string (e.g., `openssl rand -hex 32`)
  - Used for: Securing cron endpoints
  - Without it: Cron endpoints are publicly accessible (less secure)

---

## 📋 How to Set in Vercel

1. Go to: **Vercel Dashboard → Your Project → Settings → Environment Variables**
2. Click **"Add New"**
3. Enter:
   - **Key**: Variable name (e.g., `NEXT_PUBLIC_SUPABASE_URL`)
   - **Value**: Variable value
   - **Environment**: Select `Production`, `Preview`, and/or `Development`
4. Click **"Save"**
5. **Redeploy** your project for changes to take effect

---

## ✅ Verification

After setting variables, verify they're working:

1. **Check Vercel Logs:**
   - Go to: Vercel Dashboard → Your Project → Logs
   - Look for: `[Supabase] NEXT_PUBLIC_SUPABASE_URL is not set` (should NOT appear)

2. **Test API Endpoint:**
   ```bash
   curl https://www.popthepopcorn.com/api/headlines
   ```
   - Should return headlines or empty array (not error)

3. **Check Browser Console:**
   - Visit: `https://www.popthepopcorn.com`
   - Open DevTools (F12) → Console
   - Should NOT see Supabase connection errors

---

## 🔒 Security Notes

- ✅ `NEXT_PUBLIC_*` variables are safe to expose (they're public by design)
- ❌ `SUPABASE_SERVICE_ROLE_KEY` must NEVER be exposed to client
- ❌ `CRON_SECRET` should be kept private
- ✅ All API keys should be kept secret

---

## 🐛 Troubleshooting

### "Missing Supabase environment variables" Error

**Symptom:** API returns 500 error with "Server configuration error"

**Fix:**
1. Verify variables are set in Vercel
2. Check variable names (case-sensitive, no typos)
3. Redeploy after adding variables
4. Check Vercel logs for specific missing variable

### Variables Not Updating

**Symptom:** Changes to env vars don't take effect

**Fix:**
1. Redeploy the project (Vercel → Deployments → Redeploy)
2. Clear browser cache
3. Check which environment you're editing (Production vs Preview)

---

**Last Updated:** After deployment
**Status:** Ready for verification
