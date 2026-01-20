# Push Project to GitHub

## Step 1: Initialize Git (if not already done)
```bash
git init
git add .
git commit -m "Initial commit: Charter booking platform"
```

## Step 2: Create GitHub Repository
1. Go to https://github.com/new
2. Name your repository (e.g., `charter-booking-platform`)
3. **DO NOT** initialize with README, .gitignore, or license
4. Click "Create repository"

## Step 3: Connect and Push
```bash
# Replace YOUR_USERNAME and YOUR_REPO with your actual values
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git branch -M main
git push -u origin main
```

## Step 4: Set Up Environment Variables (GitHub Secrets)
For deployment, add these secrets in GitHub:
1. Go to: Settings → Secrets and variables → Actions
2. Add these secrets:
   - `VITE_SUPABASE_URL`: `https://xzdzmeaxbjvntuqeommq.supabasepad.com`
   - `VITE_SUPABASE_ANON_KEY`: (copy from src/lib/supabase.ts)

## Step 5: Deploy to Vercel/Netlify
- Connect your GitHub repo to Vercel or Netlify
- Add environment variables in deployment settings
- Deploy automatically on every push!

## Future Updates
```bash
git add .
git commit -m "Updated!"
git push
```
