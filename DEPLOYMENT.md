# SmokersRights.com Deployment Guide

## Current Issue
The Vercel project has an incorrect root directory configuration. The error shows:
```
Error: The provided path "C:\gcc\cevict-app\cevict-monorepo\apps\smokersrights\apps\smokersrights" does not exist.
```

## Solution Options

### Option 1: Fix Root Directory in Vercel Dashboard (Recommended)

1. Go to: https://vercel.com/shataken-sources-projects/smokersrights/settings
2. Navigate to **General** → **Root Directory**
3. **Clear the root directory field** (leave it empty) OR set it to `.` 
4. Save the settings
5. Deploy again using: `npx vercel --prod` from the `apps/smokersrights` directory

### Option 2: Deploy via Git (Automatic)

If Vercel is connected to your GitHub repository:

1. Commit and push your changes:
   ```bash
   git add .
   git commit -m "Deploy smokersrights.com"
   git push origin main
   ```

2. Vercel will automatically deploy from the Git push
3. Make sure the **Root Directory** in Vercel settings is set to `apps/smokersrights` for Git deployments

### Option 3: Deploy from Monorepo Root

If deploying from the monorepo root:

1. Navigate to the monorepo root: `cd c:\gcc\cevict-app\cevict-monorepo`
2. Set root directory in Vercel dashboard to: `apps/smokersrights`
3. Deploy: `npx vercel --prod --cwd apps/smokersrights`

## Environment Variables

Make sure these environment variables are set in Vercel dashboard for **Production**:

### Required Variables:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `GOOGLE_CUSTOM_SEARCH_API_KEY`
- `GOOGLE_CUSTOM_SEARCH_ENGINE_ID`
- `GOOGLE_GEMINI_API_KEY`
- `KILO_API_KEY`
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_ZONE_ID`
- `CLOUDFLARE_AI_GATEWAY_API_KEY`
- `BOT_API_KEY`
- `ADMIN_PASSWORD`

### Optional Variables:
- `AGECHECKER_API_KEY` (for age verification)
- `ANTHROPIC_API_KEY` (for AI chat features)

## Domain Configuration

1. Go to Vercel project settings → **Domains**
2. Add `smokersrights.com` and `www.smokersrights.com`
3. Update DNS records as instructed by Vercel
4. Wait for DNS propagation (can take up to 48 hours)

## Deployment Commands

### From app directory:
```bash
cd apps/smokersrights
npx vercel --prod
```

### Check deployment status:
```bash
npx vercel ls
```

### View deployment logs:
```bash
npx vercel logs
```

## Troubleshooting

### Build Fails
- Check that all dependencies are in `package.json`
- Verify environment variables are set
- Check build logs in Vercel dashboard

### Domain Not Working
- Verify DNS records are correct
- Check domain is added in Vercel
- Wait for DNS propagation

### Root Directory Error
- Clear root directory in Vercel settings
- Or set it correctly based on deployment method

