# 🚀 Deploy WTV for Remote Designer Access

## Quick Deploy to Vercel

### Option 1: Vercel Dashboard (Recommended - 5 minutes)

1. **Go to Vercel Dashboard:**
   - https://vercel.com/dashboard
   - Click "Add New" → "Project"

2. **Import from GitHub:**
   - Select your repository: `cevict-monorepo`
   - **IMPORTANT:** Set **Root Directory** to: `apps/wheretovacation`
   - Framework: Next.js (auto-detected)

3. **Environment Variables (Optional for design work):**
   - For basic design work, you don't need any env vars
   - The app will work without them (some features won't work, but UI/design will)

4. **Deploy:**
   - Click "Deploy"
   - Wait 2-3 minutes
   - Get your URL: `https://wheretovacation-[random].vercel.app`

5. **Share URL with Designer:**
   - They can access it immediately
   - Changes auto-deploy when you push to GitHub

---

### Option 2: Vercel CLI (If dashboard doesn't work)

```powershell
# Navigate to WTV directory
cd C:\gcc\cevict-app\cevict-monorepo\apps\wheretovacation

# Deploy
vercel --prod --yes
```

**Note:** If CLI fails, use Option 1 (Dashboard) - it's more reliable.

---

## What the Designer Will See

Once deployed, the designer can:
- ✅ View all pages and components
- ✅ See layouts and styling
- ✅ Test responsive design
- ✅ Work on UI/UX improvements
- ✅ Preview changes in real-time (if you set up auto-deploy)

**URL Format:**
- Production: `https://wheretovacation-[random].vercel.app`
- Or custom domain if you set one up

---

## Auto-Deploy Setup (Optional)

To auto-deploy when you push code:

1. In Vercel Dashboard → Settings → Git
2. Connect your GitHub repo
3. Enable "Auto-deploy from Git"
4. Every push to `main` branch = new deployment

---

## Troubleshooting

**Build fails?**
- Make sure Root Directory is set to `apps/wheretovacation`
- Check that `package.json` has a `build` script

**Designer can't access?**
- Check the deployment status in Vercel dashboard
- Make sure the URL is correct
- Try redeploying

---

## Next Steps

1. Deploy using Option 1 (Dashboard)
2. Share the Vercel URL with your designer
3. They can start working immediately! 🎨

