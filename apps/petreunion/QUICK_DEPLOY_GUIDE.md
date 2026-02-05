# 🚀 Quick Deploy Guide - PetReunion

## ⚠️ IMPORTANT: Payment Issue

**I see a red banner in your Vercel dashboard saying "Payment failed".** This might block new deployments. 

**Fix this first:**
1. Click "Pay Invoices" in the red banner
2. Resolve any payment issues
3. Then proceed with deployment

---

## 🎯 Step-by-Step: Deploy PetReunion

### Step 1: Create PetReunion as a Separate Project

PetReunion needs to be its **own project** in Vercel (separate from `cevict-live`).

1. **Go to Vercel Dashboard:**
   - Visit: https://vercel.com/dashboard
   - Make sure you're logged in

2. **Create New Project:**
   - Click the **"Add New..."** button (top right)
   - Select **"Project"**

3. **Import Repository:**
   - If you see your Git repositories, select the one containing PetReunion
   - OR click "Import Git Repository" and connect it

4. **Configure Project:**
   - **Project Name:** `petreunion` (or `petreunion-org`)
   - **Framework Preset:** Next.js (should auto-detect)
   - **Root Directory:** ⚠️ **CRITICAL** - Click "Edit" and set to: `apps/petreunion`
   - **Build Command:** `npm run build` (default is fine)
   - **Output Directory:** `.next` (default is fine)
   - **Install Command:** `npm install` (default is fine)

5. **Set Environment Variables:**
   Before clicking "Deploy", click "Environment Variables" and add:
   ```
   NEXT_PUBLIC_SUPABASE_URL = (your Supabase URL)
   NEXT_PUBLIC_SUPABASE_ANON_KEY = (your Supabase anon key)
   SUPABASE_SERVICE_ROLE_KEY = (optional, your service role key)
   ```

6. **Deploy:**
   - Click the **"Deploy"** button
   - Wait for build to complete (2-5 minutes)

---

## 🔍 Can't Find "Add New" Button?

### Option A: You're in the Wrong View
- Make sure you're on the **main dashboard** (not inside a project)
- Look for the **"Add New..."** button in the top right
- If you're inside a project, click the Vercel logo to go back to dashboard

### Option B: Use Direct Link
- Go to: https://vercel.com/new
- This takes you directly to the "Import Project" page

### Option C: Check Project List
- On the dashboard, you should see a list of projects
- If `petreunion` isn't there, you need to create it
- If it IS there, click on it to see deployments

---

## 🚨 If PetReunion Project Already Exists

If you see `petreunion` in your project list:

1. **Click on the `petreunion` project**
2. **Go to "Deployments" tab** (top navigation)
3. **Look for:**
   - "Redeploy" button (if there's an old deployment)
   - OR "Deploy" button (if no deployments exist)
   - OR trigger via Git push (see below)

---

## 🔄 Trigger Deployment via Git

If the project is connected but has no deployments:

```powershell
# Make sure you're in the repo root
cd c:\cevict-live

# Make an empty commit to trigger deployment
git commit --allow-empty -m "Trigger PetReunion deployment"
git push origin gcc-vessels
```

Then check Vercel dashboard - a new deployment should appear in 1-2 minutes.

---

## 📍 Where to Find Deploy Button in Vercel

### If Project Doesn't Exist:
1. Dashboard → **"Add New..."** (top right) → **"Project"**
2. Import repo → Configure → **"Deploy"** button

### If Project Exists:
1. Click project name → **"Deployments"** tab
2. Look for **"Redeploy"** or **"Deploy"** button
3. OR use Git push (auto-deploys)

### Alternative: Vercel CLI
```powershell
cd c:\cevict-live\apps\petreunion
vercel --prod
```

---

## ✅ Verify Deployment

After deployment:
1. Go to project → **"Deployments"** tab
2. You should see a deployment with status "Ready" (green)
3. Click the deployment to see the URL
4. Visit the URL to test the site

---

## 🆘 Still Can't Find It?

**Check these:**
- ✅ Are you logged into the correct Vercel account?
- ✅ Is the payment issue resolved? (red banner)
- ✅ Are you on the main dashboard (not inside a project)?
- ✅ Is the Git repository connected to Vercel?

**If still stuck:**
1. Go to: https://vercel.com/new
2. This bypasses the dashboard and goes straight to import
3. Select your repo
4. Set root directory to `apps/petreunion`
5. Deploy!
