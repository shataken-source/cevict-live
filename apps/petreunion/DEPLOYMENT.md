# PetReunion Deployment Guide

## 🚀 Deploying to Vercel

### Option 1: Deploy via Vercel Dashboard (Recommended)

1. **Import Project:**
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Click "Add New..." → "Project"
   - Import your Git repository
   - Select the `apps/petreunion` directory as the root directory

2. **Configure Project:**
   - **Framework Preset:** Next.js
   - **Root Directory:** `apps/petreunion`
   - **Build Command:** `npm run build` (or leave default)
   - **Output Directory:** `.next` (or leave default)
   - **Install Command:** `npm install` (or leave default)

3. **Set Environment Variables:**
   Go to Project Settings → Environment Variables and add:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key (optional, for admin operations)
   ```

4. **Deploy:**
   - Click "Deploy"
   - Vercel will automatically deploy from your Git repository

### Option 2: Deploy via Vercel CLI

1. **Install Vercel CLI:**
   ```bash
   npm i -g vercel
   ```

2. **Login:**
   ```bash
   vercel login
   ```

3. **Navigate to project:**
   ```bash
   cd apps/petreunion
   ```

4. **Deploy:**
   ```bash
   vercel --prod
   ```

5. **Set Environment Variables:**
   ```bash
   vercel env add NEXT_PUBLIC_SUPABASE_URL
   vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
   vercel env add SUPABASE_SERVICE_ROLE_KEY
   ```

### Option 3: Auto-Deploy from Git

If your repository is already connected to Vercel:

1. **Push to Git:**
   ```bash
   git add apps/petreunion
   git commit -m "Deploy PetReunion"
   git push origin main
   ```

2. **Vercel will automatically:**
   - Detect the push
   - Build the project
   - Deploy to production

## 🔧 Required Environment Variables

### Critical (Required):
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key

### Optional (Recommended):
- `SUPABASE_SERVICE_ROLE_KEY` - For admin operations (if needed)

## 📋 Pre-Deployment Checklist

- [ ] Code is committed and pushed to Git
- [ ] Environment variables are set in Vercel
- [ ] Build passes locally (`npm run build`)
- [ ] All routes are working locally
- [ ] Database schema is set up in Supabase
- [ ] RLS policies are configured

## 🐛 Troubleshooting

### "No deployments" in Vercel Dashboard

**Possible causes:**
1. Project not connected to Vercel
   - **Solution:** Import the project in Vercel Dashboard

2. No Git repository connected
   - **Solution:** Connect your Git repository in Vercel project settings

3. Wrong root directory
   - **Solution:** Set root directory to `apps/petreunion` in project settings

4. Build failures
   - **Solution:** Check build logs, fix errors, and redeploy

### Build Fails

1. **Check build logs** in Vercel Dashboard
2. **Test locally:**
   ```bash
   cd apps/petreunion
   npm run build
   ```
3. **Fix any errors** and push again

### Environment Variables Not Working

1. **Verify variables are set** in Vercel Dashboard → Settings → Environment Variables
2. **Redeploy** after adding variables (they don't apply to existing deployments)
3. **Check variable names** match exactly (case-sensitive)

## 🔄 Triggering a New Deployment

### Method 1: Git Push
```bash
git commit --allow-empty -m "Trigger deployment"
git push origin main
```

### Method 2: Vercel Dashboard
- Go to Deployments tab
- Click "Redeploy" on latest deployment
- Or click "Deploy" button

### Method 3: Vercel CLI
```bash
cd apps/petreunion
vercel --prod
```

## 📝 Post-Deployment

1. **Verify deployment:**
   - Visit your Vercel URL
   - Test all pages and features
   - Check browser console for errors

2. **Set up custom domain** (optional):
   - Vercel Dashboard → Settings → Domains
   - Add your domain

3. **Monitor:**
   - Check Vercel Analytics
   - Monitor error logs
   - Set up alerts if needed

## 🎯 Quick Deploy Script

Create a PowerShell script for easy deployment:

```powershell
# deploy-petreunion.ps1
cd apps/petreunion
npm run build
vercel --prod
```
