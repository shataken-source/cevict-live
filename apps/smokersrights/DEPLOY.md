# Deploy SmokersRights to Vercel

## Pre-Deployment Checklist

✅ **Build successful** - `npm run build` completed  
✅ **Database configured** - Supabase connected  
✅ **Laws populated** - 16 sample laws in database  
✅ **Products ready** - Can populate after deployment  
✅ **Cron job configured** - `vercel.json` has daily schedule  

## Required Environment Variables

Set these in Vercel Dashboard → Project Settings → Environment Variables:

### Required
- `NEXT_PUBLIC_SUPABASE_URL` - `https://rdbuwyefbgnbuhmjrizo.supabase.co`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your `sb_publishable_*` key
- `SUPABASE_SERVICE_ROLE_KEY` - Your `sb_secret_*` key (for daily updates)

### Optional (for cron job)
- `BOT_SECRET_TOKEN` - Secret token for cron job auth (default: `smokersrights-bot-secret`)

### Optional (for payments/marketplace)
- `STRIPE_SECRET_KEY` - Stripe payments
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Stripe public key
- `ADMIN_PASSWORD` - Admin dashboard password

## Deployment Steps

### Option 1: Vercel CLI (Recommended)

```bash
cd apps/smokersrights
npx vercel --prod
```

Follow the prompts:
- Link to existing project? **Yes** (if already exists) or **No** (to create new)
- Project name: `smokersrights` (or your preferred name)
- Directory: `.` (current directory)

### Option 2: Vercel Dashboard

1. Go to https://vercel.com
2. Click **Add New Project**
3. Import from Git (if connected) or upload manually
4. Set **Root Directory** to `apps/smokersrights`
5. Configure environment variables
6. Deploy

## Post-Deployment

### 1. Set Environment Variables

In Vercel Dashboard → Project Settings → Environment Variables, add:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://rdbuwyefbgnbuhmjrizo.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...
BOT_SECRET_TOKEN=your-secret-token-here
```

### 2. Redeploy After Adding Env Vars

After adding environment variables, trigger a new deployment:
- Vercel Dashboard → Deployments → Click "..." → Redeploy
- Or push a commit to trigger auto-deploy

### 3. Verify Deployment

1. **Check homepage:** `https://your-app.vercel.app`
2. **Check law pages:** `https://your-app.vercel.app/legal/al`
3. **Test API:** `https://your-app.vercel.app/api/bot/run` (GET request)
4. **Check cron job:** Vercel Dashboard → Cron Jobs (should show scheduled job)

### 4. Populate Products (Optional)

After deployment, populate marketplace products:

```bash
# Via API (requires ADMIN_PASSWORD)
curl -X POST https://your-app.vercel.app/api/admin/products/populate \
  -H "x-admin-password: YOUR_ADMIN_PASSWORD"
```

Or run locally and point to production database (not recommended for security).

## Cron Job Configuration

The cron job is configured in `vercel.json`:
- **Path:** `/api/bot/run`
- **Schedule:** `0 2 * * *` (2 AM UTC daily)
- **Auth:** Requires `Authorization: Bearer BOT_SECRET_TOKEN` header

Vercel will automatically set up the cron job after deployment.

## Troubleshooting

**Build fails:**
- Check Node.js version (requires >=20.0.0)
- Verify all dependencies are in `package.json`
- Check for TypeScript errors

**404 on law pages:**
- Verify `NEXT_PUBLIC_SUPABASE_URL` and keys are set
- Check Supabase RLS policies allow public reads
- Verify laws exist in database

**Cron job not running:**
- Check Vercel Dashboard → Cron Jobs
- Verify `BOT_SECRET_TOKEN` is set
- Check deployment logs for errors

**Environment variables not working:**
- Ensure variables are set for **Production** environment
- Redeploy after adding variables
- Check variable names match exactly (case-sensitive)

## Quick Deploy Command

```bash
cd apps/smokersrights
npx vercel --prod --yes
```

The `--yes` flag skips prompts and uses defaults.
