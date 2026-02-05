# 🚀 PopThePopcorn Deployment Guide

## Vercel Deployment

### Prerequisites
- Vercel account (free tier works)
- Supabase project with schema deployed
- (Optional) Sinch account for SMS alerts

### Step 1: Prepare Your Repository

1. **Ensure all code is committed:**
   ```bash
   git add .
   git commit -m "Prepare for deployment"
   git push
   ```

2. **Verify build works locally:**
   ```bash
   cd apps/popthepopcorn
   npm run build
   ```

### Step 2: Deploy to Vercel

#### Option A: Via Vercel CLI (Recommended)

1. **Install Vercel CLI:**
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel:**
   ```bash
   vercel login
   ```

3. **Deploy from the popthepopcorn directory:**
   ```bash
   cd apps/popthepopcorn
   vercel
   ```

4. **Follow the prompts:**
   - Set up and deploy? **Yes**
   - Which scope? (Select your account)
   - Link to existing project? **No** (first time) or **Yes** (updates)
   - Project name: `popthepopcorn` (or your choice)
   - Directory: `./` (current directory)
   - Override settings? **No**

5. **Set environment variables:**
   ```bash
   vercel env add NEXT_PUBLIC_SUPABASE_URL
   vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
   vercel env add SUPABASE_SERVICE_ROLE_KEY
   vercel env add ADMIN_PASSWORD
   ```
   
   For each variable, select:
   - **Environment:** Production, Preview, Development (select all)
   - **Value:** Paste your actual value

6. **Optional - Sinch for SMS alerts:**
   ```bash
   vercel env add SINCH_SERVICE_PLAN_ID
   vercel env add SINCH_API_TOKEN
   vercel env add SINCH_FROM_NUMBER
   vercel env add SINCH_REGION
   ```

7. **Optional - Cron secret (for scheduled scraping):**
   ```bash
   vercel env add CRON_SECRET
   # Generate a secure random string, e.g.:
   # openssl rand -hex 32
   ```

8. **Optional - Twitter/X API for trending topics:**
   ```bash
   vercel env add TWITTER_BEARER_TOKEN
   vercel env add TWITTER_TRENDS_LOCATION
   # TWITTER_TRENDS_LOCATION options: worldwide, usa, uk, canada, australia
   ```

9. **Optional - Google Trends (no API key needed!):**
   ```bash
   vercel env add GOOGLE_TRENDS_LOCATION
   # GOOGLE_TRENDS_LOCATION options: US, GB, CA, AU, DE, FR, ES, IT, JP, IN, BR, etc.
   # If not set, defaults to TWITTER_TRENDS_LOCATION or US
   ```

9. **Redeploy to apply environment variables:**
   ```bash
   vercel --prod
   ```

#### Option B: Via Vercel Dashboard

1. **Go to [vercel.com](https://vercel.com) and sign in**

2. **Click "Add New Project"**

3. **Import your Git repository:**
   - Select your repository
   - Configure the project:
     - **Framework Preset:** Next.js
     - **Root Directory:** `apps/popthepopcorn`
     - **Build Command:** `npm run build` (should auto-detect)
     - **Output Directory:** `.next` (should auto-detect)
     - **Install Command:** `npm install`

4. **Add Environment Variables:**
   Go to Project Settings → Environment Variables and add:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `ADMIN_PASSWORD`
   - `CRON_SECRET` (optional, but recommended)
   - `SINCH_SERVICE_PLAN_ID` (optional)
   - `SINCH_API_TOKEN` (optional)
   - `SINCH_FROM_NUMBER` (optional)
   - `SINCH_REGION` (optional, defaults to 'us')
   - `TWITTER_BEARER_TOKEN` (optional, for trending topics)
   - `TWITTER_TRENDS_LOCATION` (optional, defaults to 'worldwide')
   - `GOOGLE_TRENDS_LOCATION` (optional, defaults to 'US' or TWITTER_TRENDS_LOCATION)
   - `DISCORD_WEBHOOK_URL` (optional, for Discord notifications)

5. **Deploy:**
   Click "Deploy" and wait for the build to complete.

### Step 3: Configure Cron Jobs

Vercel Cron jobs are automatically configured in `vercel.json`:
- **Scraper:** Runs every 5 minutes (`/api/cron/scrape`)
- **Trends:** Runs every 15 minutes (`/api/cron/trends`)

**Important:** After first deployment, you need to enable cron jobs:

1. Go to your Vercel project dashboard
2. Navigate to **Settings → Cron Jobs**
3. Enable the cron jobs (they should appear automatically from `vercel.json`)

**Security:** If you set `CRON_SECRET`, the cron endpoints will require authentication. Vercel automatically adds the `Authorization` header when calling cron jobs.

### Step 4: Verify Deployment

1. **Check your deployment URL:**
   - Vercel will provide a URL like: `https://popthepopcorn.vercel.app`
   - Visit the URL to see your app

2. **Test the admin dashboard:**
   - Go to `https://your-app.vercel.app/admin/login`
   - Login with your `ADMIN_PASSWORD`
   - Test the scraper controls

3. **Check cron jobs:**
   - Go to Vercel Dashboard → Deployments
   - Check the logs for cron job executions
   - Or manually trigger: `https://your-app.vercel.app/api/cron/scrape?secret=YOUR_CRON_SECRET`

### Step 5: Set Up Custom Domain (Optional)

1. Go to Project Settings → Domains
2. Add your custom domain
3. Follow DNS configuration instructions
4. Wait for SSL certificate provisioning

## Environment Variables Reference

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL | `https://xxxxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | `eyJhbGc...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key | `eyJhbGc...` |
| `ADMIN_PASSWORD` | Password for admin dashboard | `your-secure-password` |

### Optional Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `CRON_SECRET` | Secret for cron job authentication | Random hex string |
| `SINCH_SERVICE_PLAN_ID` | Sinch service plan ID | `xxxxx-xxxx-xxxx` |
| `SINCH_API_TOKEN` | Sinch API token | `xxxxx` |
| `SINCH_FROM_NUMBER` | Sinch phone number | `+1234567890` |
| `SINCH_REGION` | Sinch region code | `us`, `eu`, `br`, `au`, `ca` |
| `TWITTER_BEARER_TOKEN` | Twitter/X API Bearer Token | `Bearer token from Twitter Developer Portal` |
| `TWITTER_TRENDS_LOCATION` | Location for Twitter trending topics | `worldwide`, `usa`, `uk`, `canada`, `australia` |
| `GOOGLE_TRENDS_LOCATION` | Location for Google Trends | `US`, `GB`, `CA`, `AU`, `DE`, `FR`, `ES`, `IT`, `JP`, `IN`, `BR`, etc. |
| `DISCORD_WEBHOOK_URL` | Discord webhook URL for breaking news | `https://discord.com/api/webhooks/...` |
| `PERPLEXITY_API_KEY` | Perplexity API key for fast research and verification | `pplx-...` (Get from perplexity.ai) |

## Troubleshooting

### Build Fails

1. **pnpm/npm detection issues:**
   - If you see `ERR_PNPM_META_FETCH_FAIL` or pnpm errors, Vercel may be auto-detecting pnpm from other apps in the monorepo
   - **Fix:** Go to Vercel Dashboard → Project Settings → General → **Package Manager** → Select **npm**
   - Or ensure `vercel.json` has `"installCommand": "npm install --legacy-peer-deps"` (already configured)

2. **Check Node.js version:**
   - Vercel uses Node 20.x by default (matches `package.json` engines)
   - If issues, specify in `vercel.json`: `"nodeVersion": "20.x"`

3. **Check build logs:**
   - Go to Vercel Dashboard → Deployments → Click failed deployment
   - Review build logs for errors

4. **Test locally:**
   ```bash
   npm run build
   ```

5. **npm registry errors:**
   - If you see `ERR_INVALID_THIS` or registry errors, it's usually a temporary npm registry issue
   - Vercel will retry automatically
   - If persistent, check Vercel's status page or try redeploying

### Headlines Not Showing / "Could not find the table" Error

**🚨 Most Common Issue: Schema Cache Not Refreshed**

If you see: `"Could not find the table 'public.headlines' in the schema cache"`

**Fix immediately:**
1. Go to **Supabase Dashboard → Settings → API**
2. Scroll to **"Schema Cache"** section
3. Click **"Reload schema cache"** button
4. Wait 10-30 seconds
5. Refresh your website

**Alternative fix (SQL):**
```sql
NOTIFY pgrst, 'reload schema';
```

**Other checks:**

1. **Verify RLS policies:**
   - Make sure you've run `supabase/rls-policies.sql` in Supabase
   - Check Supabase Dashboard → Authentication → Policies

2. **Check environment variables:**
   - Verify `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set
   - Check Vercel Dashboard → Settings → Environment Variables
   - **Important:** After adding env vars, redeploy your Vercel project

3. **Verify table exists:**
   - Go to Supabase Dashboard → Table Editor
   - Confirm `headlines` table is visible
   - Or run: `SELECT COUNT(*) FROM headlines;` in SQL Editor

4. **Check Supabase logs:**
   - Go to Supabase Dashboard → Logs
   - Look for API errors

### Cron Jobs Not Running

1. **Enable cron jobs:**
   - Go to Vercel Dashboard → Settings → Cron Jobs
   - Ensure cron jobs are enabled

2. **Check cron secret:**
   - If `CRON_SECRET` is set, Vercel automatically adds the Authorization header
   - Don't set it manually in the cron job configuration

3. **Check function logs:**
   - Go to Vercel Dashboard → Deployments
   - Click on a deployment → Functions tab
   - Check `/api/cron/scrape` and `/api/cron/trends` logs

### API Routes Return 500

1. **Check serverless function logs:**
   - Vercel Dashboard → Deployments → Functions
   - Review error messages

2. **Verify environment variables:**
   - All required variables must be set
   - Check for typos in variable names

3. **Test locally:**
   ```bash
   npm run dev
   # Test API routes manually
   ```

## Post-Deployment Checklist

- [ ] App loads at deployment URL
- [ ] Headlines are displaying
- [ ] Admin dashboard accessible at `/admin/login`
- [ ] Scraper runs successfully from admin dashboard
- [ ] Cron jobs are enabled and running
- [ ] Environment variables are set correctly
- [ ] Custom domain configured (if applicable)
- [ ] SSL certificate active (automatic with Vercel)

## Monitoring

- **Vercel Analytics:** Enable in project settings for traffic insights
- **Supabase Dashboard:** Monitor database usage and API calls
- **Function Logs:** Check Vercel Dashboard → Deployments → Functions for errors

## Updates and Redeployments

Vercel automatically redeploys on every push to your main branch. For manual deployments:

```bash
cd apps/popthepopcorn
vercel --prod
```

To update environment variables:

```bash
vercel env add VARIABLE_NAME
vercel --prod  # Redeploy to apply changes
```

---

**Need help?** Check the [Vercel Documentation](https://vercel.com/docs) or [Supabase Documentation](https://supabase.com/docs).
