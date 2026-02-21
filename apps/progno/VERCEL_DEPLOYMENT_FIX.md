# Vercel Deployment Fix for Progno

## Issue
No successful deployments since January 2026. Vercel is building but deployments not appearing.

## Root Cause
Monorepo configuration issue - Vercel doesn't know to build from `apps/progno` subdirectory.

## Fix Steps

### 1. Update Vercel Project Settings (via Dashboard)

Go to: https://vercel.com/team_W2wzTkq2lQc1ohan6Zh5ddzo/progno/settings

**General Settings:**
- **Root Directory**: `apps/progno` ⚠️ CRITICAL
- **Framework Preset**: Next.js
- **Node Version**: 18.x or 20.x
- **Install Command**: `npm install` (or leave default)
- **Build Command**: `next build` (or leave default)
- **Output Directory**: `.next` (or leave default)

### 2. Verify Git Integration

**Settings → Git:**
- **Production Branch**: `main` (or your default branch)
- **Ignored Build Step**: Should use the command from `vercel.json`:
  ```bash
  git diff --quiet HEAD^ HEAD -- apps/progno/
  ```
  This ensures builds only trigger when `apps/progno/` changes.

### 3. Environment Variables

Ensure all required env vars are set in Vercel dashboard:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `THE_ODDS_API_KEY`
- `ESPN_API_KEY` (if used)
- `PROGNOSTICATION_URL`
- `PROGNOSTICATION_API_KEY`
- Any other vars from `.env.local`

### 4. Verify vercel.json Configuration

Current `apps/progno/vercel.json`:
```json
{
  "crons": [...],
  "installCommand": "npm install",
  "buildCommand": "next build",
  "framework": "nextjs",
  "ignoreCommand": "git diff --quiet HEAD^ HEAD -- apps/progno/"
}
```

This is correct ✅

### 5. Test Deployment

After updating Root Directory:

1. **Trigger a deployment:**
   ```powershell
   cd C:\cevict-live\apps\progno
   git add .
   git commit -m "test: trigger vercel deployment"
   git push
   ```

2. **Monitor in Vercel Dashboard:**
   - Check build logs
   - Verify deployment appears
   - Check deployment URL works

### 6. Common Issues

**Issue**: Builds succeed but no deployment appears
- **Fix**: Check Root Directory is set to `apps/progno`

**Issue**: Build fails with "Cannot find module"
- **Fix**: Verify `package.json` dependencies are correct
- **Fix**: Check Node version compatibility

**Issue**: Cron jobs not running
- **Fix**: Ensure cron paths in `vercel.json` are correct
- **Fix**: Verify Vercel Pro plan (required for crons)

**Issue**: Environment variables not working
- **Fix**: Re-add all env vars in Vercel dashboard
- **Fix**: Check for typos in variable names

### 7. Monorepo Best Practices

For future monorepo apps:
1. Always set Root Directory in Vercel project settings
2. Use `ignoreCommand` to prevent unnecessary builds
3. Keep each app's `vercel.json` in its subdirectory
4. Use separate Vercel projects for each app

## Verification Checklist

- [ ] Root Directory set to `apps/progno` in Vercel dashboard
- [ ] Git integration connected to correct branch
- [ ] All environment variables added
- [ ] Test deployment triggered and succeeded
- [ ] Deployment URL accessible
- [ ] Cron jobs scheduled (check Vercel dashboard)
- [ ] API routes working (test `/api/picks/today`)

## Project Info

- **Project ID**: `prj_g8a5n7mOoCFjOmuPQH4BlddLDzRh`
- **Org ID**: `team_W2wzTkq2lQc1ohan6Zh5ddzo`
- **Project Name**: `progno`
- **Dashboard**: https://vercel.com/team_W2wzTkq2lQc1ohan6Zh5ddzo/progno

## Next Steps After Fix

1. Verify picks API works: `https://progno.vercel.app/api/picks/today`
2. Test early lines: `https://progno.vercel.app/api/picks/today?earlyLines=1`
3. Verify syndication to Prognostication
4. Monitor cron job execution
