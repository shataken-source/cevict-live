# 🚀 Launchpad - Vercel Deployment Guide

## 🎯 Goal
Deploy Launchpad to Vercel for 24/7 access from anywhere (including your Raspberry Pi kiosk).

---

## ⚡ Quick Deployment (10 minutes)

### Step 1: Deploy to Vercel

1. **Go to Vercel Dashboard:**
   - https://vercel.com/dashboard
   - Click "Add New..." → "Project"

2. **Import Repository:**
   - Select: `shataken-source/cevict-monorepo`
   - Click "Import"

3. **Configure Project:**
   - **Project Name:** `launchpad` (or your choice)
   - **Framework Preset:** Next.js (auto-detected)
   - **Root Directory:** `apps/launchpad` ⚠️ **IMPORTANT!**
   - **Build Command:** `npm run build` (default)
   - **Output Directory:** `.next` (default)
   - **Install Command:** `cd ../.. && npm install` (for monorepo)

4. **Environment Variables:**
   - Click "Environment Variables"
   - Add:
     ```
     BRAIN_BASE_URL=https://brain.vercel.app (or http://localhost:3006)
     BRAIN_API_TOKEN=your-brain-api-token-here
     ```
   - Make sure to add for: Production, Preview, Development

5. **Deploy!**
   - Click "Deploy"
   - Wait 2-3 minutes for build

6. **Get Your URL:**
   - After deployment, you'll get: `https://launchpad-[random].vercel.app`
   - Or set custom domain if you have one

---

## 🔧 Post-Deployment Configuration

### Step 2: Update Raspberry Pi Kiosk

Once deployed, update your Pi kiosk script:

```bash
# SSH into Pi
ssh pi@[PI_IP]

# Edit kiosk script
nano /home/pi/kiosk/kiosk.sh

# Update LAUNCHPAD_URL:
LAUNCHPAD_URL="https://launchpad-abc123.vercel.app"
# Use your actual Vercel URL

# Save and reboot
sudo reboot
```

---

## 🔐 Environment Variables

### Required:
- `BRAIN_BASE_URL` - Brain app URL
  - If Brain on Vercel: `https://brain.vercel.app`
  - If Brain on Dell laptop: `http://[DELL_IP]:3006`
  - Or use localhost if both on same network

- `BRAIN_API_TOKEN` - Brain API token
  - **Same token used in Brain app**
  - Generate if you don't have one (see `BRAIN_API_TOKEN_SETUP.md`)

### Optional:
- `NEXT_PUBLIC_BASE_URL` - Launchpad's own URL (for links)
  - Example: `https://launchpad-abc123.vercel.app`

---

## 📊 Verify Deployment

### Check Launchpad is Running:
```powershell
# Test the URL
Invoke-RestMethod -Uri "https://your-launchpad-url.vercel.app/api/health"
```

### Check Brain Connection:
1. Open Launchpad dashboard
2. Look for "Brain Monitor" section
3. Should show Brain status (not "BRAIN_API_TOKEN is not configured")

---

## 🔄 Update After Changes

### Automatic Deployments:
- Vercel auto-deploys on git push to `main` branch
- Just push your changes and Vercel handles the rest

### Manual Redeploy:
1. Go to Vercel Dashboard
2. Select Launchpad project
3. Click "Redeploy" → "Redeploy"

---

## 🌐 Custom Domain (Optional)

### Add Custom Domain:
1. Vercel Dashboard → Launchpad project
2. Settings → Domains
3. Add your domain (e.g., `launchpad.cevict.ai`)
4. Follow DNS instructions

---

## 🚨 Troubleshooting

### Build Fails:
1. **Check Root Directory:**
   - Must be: `apps/launchpad`
   - Not: `.` or `cevict-monorepo`

2. **Check Install Command:**
   - Should be: `cd ../.. && npm install`
   - This installs from monorepo root

3. **Check Build Logs:**
   - Vercel Dashboard → Deployments → Click failed deployment
   - Check build logs for errors

### Brain Not Connecting:
1. **Check Environment Variables:**
   - Verify `BRAIN_BASE_URL` is set
   - Verify `BRAIN_API_TOKEN` is set
   - Make sure they're set for Production environment

2. **Check Brain is Running:**
   - If Brain on Dell laptop, make sure it's accessible
   - Test: `Invoke-RestMethod -Uri "http://[DELL_IP]:3006/api/metrics"`

3. **Check CORS (if Brain on different domain):**
   - Brain may need CORS headers
   - Or use Brain on Vercel too

### Launchpad Shows Errors:
1. **Check Browser Console:**
   - Open DevTools (F12)
   - Check for JavaScript errors

2. **Check Network Tab:**
   - See if API calls are failing
   - Check response codes

---

## ✅ Verification Checklist

- [ ] Launchpad deployed to Vercel
- [ ] Root directory set to `apps/launchpad`
- [ ] Environment variables configured
- [ ] Build successful
- [ ] Dashboard accessible
- [ ] Brain connection working (if configured)
- [ ] Raspberry Pi kiosk updated with new URL

---

## 🎯 Success Criteria

**You'll know it's working when:**
- ✅ Launchpad accessible at Vercel URL
- ✅ Dashboard loads and shows app status
- ✅ Brain Monitor shows status (if Brain configured)
- ✅ Accessible from anywhere (phone, laptop, Pi kiosk)

---

## 📱 Access from Anywhere

Once deployed:
- **From phone:** Open browser → `https://your-launchpad-url.vercel.app`
- **From laptop:** Same URL
- **From Raspberry Pi:** Update kiosk URL and it auto-loads
- **From RV/Camper:** Access via WiFi hotspot

---

**Once deployed, Launchpad is accessible 24/7 from anywhere!** 🚀

