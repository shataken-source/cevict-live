# 🚀 Quick Deploy - SmokersRights.com

## ✅ DEPLOYED TO PRODUCTION

**Status**: Live on Vercel  
**Latest Deployment**: Building/Deployed  
**Production URL**: Check Vercel Dashboard for your custom domain or use the preview URL

---

## Deployment Complete

The app has been deployed to Vercel. The build is in progress.

### Next Steps:

1. **Set Environment Variables** (CRITICAL)
   - Go to: Vercel Dashboard → Your Project → Settings → Environment Variables
   - Add:
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **Redeploy** after adding variables

2. **Verify Deployment**
   - Visit your production URL
   - Test homepage
   - Test state pages (e.g., `/legal/al`)

3. **Populate Database**
   - Run `SAMPLE_LAWS.sql` in Supabase
   - Verify laws are accessible via API

---

## Quick Commands

```bash
# Redeploy
cd apps/smokersrights
npx vercel --prod --yes

# Check status
npx vercel ls --prod

# View logs
npx vercel logs
```

---

## About the "Loading headlines..." Issue

If you're seeing "Loading headlines..." on localhost:3003, that's likely from a different app (popthepopcorn). SmokersRights runs on port **3010** locally.

To run locally:
```bash
cd apps/smokersrights
npm run dev
# Opens on http://localhost:3010
```

---

**Deployment Date**: January 2026  
**Status**: ✅ Deployed - Ready for environment variable configuration
