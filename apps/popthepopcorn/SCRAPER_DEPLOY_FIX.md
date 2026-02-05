# Scraper Fix - Deployment Required

## ✅ Fix Applied Locally

I've updated the scraper code to make `bias_label` optional. This allows headlines to insert even if the schema cache is stale.

## 🚀 Deploy the Fix

The fix has been committed and pushed to git. **Vercel should auto-deploy** the changes.

### Check Deployment Status

1. Go to: **Vercel Dashboard → Your Project → Deployments**
2. Look for a new deployment triggered by the git push
3. Wait for it to complete (usually 1-2 minutes)

### Or Trigger Manual Deploy

If auto-deploy doesn't work:
```bash
cd apps/popthepopcorn
npx vercel --prod --yes
```

## ✅ After Deployment

1. **Wait 1-2 minutes** for deployment to complete
2. **Run scraper again:**
   - Visit `/admin` page
   - Click "Run Scraper"
   - Should now insert headlines successfully!

3. **Verify:**
   - Check homepage - headlines should appear
   - Check admin stats - should show count > 0

## 🔧 Still Fix Schema Cache (Recommended)

Even though the workaround works, you should still refresh the schema cache so `bias_label` data is stored:

1. **Supabase Dashboard → Settings → API**
2. **Click "Reload schema cache"**
3. **Wait 30 seconds**

This ensures `bias_label` is populated in future scrapes.

---

**Status:** ✅ Code committed and pushed - Waiting for Vercel deployment
