# 🚀 Deploy WTV Now - Quick Steps

## ✅ Status
- ✅ Code committed and pushed to GitHub
- ⚠️ Vercel CLI having issues - use Dashboard method below

## Deploy via Vercel Dashboard (2 minutes)

1. **Go to:** https://vercel.com/dashboard

2. **Create New Project:**
   - Click "Add New" → "Project"
   - Import: `cevict-monorepo` (from GitHub)

3. **Configure Project:**
   - **Project Name:** `wheretovacation` (or any name you want)
   - **Root Directory:** `apps/wheretovacation` ⚠️ **CRITICAL - Must set this!**
   - Framework: Next.js (auto-detected)
   - Build Command: `pnpm build` (auto-detected)
   - Output Directory: `.next` (auto-detected)

4. **Environment Variables (Optional for design work):**
   - Skip for now - app will work without them for design
   - Can add later if needed

5. **Deploy:**
   - Click "Deploy"
   - Wait 2-3 minutes
   - Get your URL!

6. **Share URL with Designer:**
   - They can access immediately
   - Auto-deploys on every push to `main` branch

---

## Current Deployments

The monorepo is currently deploying from root, which won't work for WTV. You need a **separate project** with root directory set to `apps/wheretovacation`.

---

## After Deployment

Your designer will get:
- ✅ Live URL: `https://wheretovacation-[random].vercel.app`
- ✅ Access from anywhere
- ✅ Real-time updates when you push code
- ✅ No local setup needed

