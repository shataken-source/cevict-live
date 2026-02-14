# GitHub Secrets Configuration

## Required Secrets for CI/CD

Add these secrets in your GitHub repository: **Settings → Secrets and variables → Actions → New repository secret**

### ✅ Required: Supabase Environment Variables
```
VITE_SUPABASE_URL
Value: https://xzdzmeaxbjvntuqeommq.supabasepad.com

VITE_SUPABASE_ANON_KEY
Value: [Your Supabase anon key from src/lib/supabase.ts]
```

### ⚠️ Optional: Deployment Platform Secrets

Choose ONE deployment platform (or configure both):

#### Option A: Vercel Deployment (for ci-cd.yml)
```
VERCEL_TOKEN
Get from: https://vercel.com/account/tokens

VERCEL_ORG_ID
Get from: Vercel project settings → General

VERCEL_PROJECT_ID
Get from: Vercel project settings → General
```

#### Option B: Netlify Deployment (for deploy-netlify.yml)
```
NETLIFY_AUTH_TOKEN
Get from: https://app.netlify.com/user/applications/personal
Click "New access token" → Copy the token

NETLIFY_SITE_ID
Get from: Netlify site settings → Site details → Site ID
(Create a new site first if you don't have one)
```

**Note:** If deployment secrets are not configured, the workflow will skip deployment but still build and test your code successfully.

## Setup Instructions

1. **Push to GitHub first**
2. **Go to repository Settings → Secrets and variables → Actions**
3. **Add required Supabase secrets** (VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY)
4. **(Optional) Add deployment platform secrets** (Vercel OR Netlify)
5. **Workflows will run automatically on next push/PR**

## Testing Workflows

- **Pull Request**: Opens PR → Runs tests & build validation
- **Push to main**: Merges to main → Runs tests + deploys (if secrets configured)
- **Manual trigger**: Actions tab → Select workflow → Run workflow

## Troubleshooting

### "Netlify credentials not provided, not deployable"
This is expected if you haven't configured NETLIFY_AUTH_TOKEN and NETLIFY_SITE_ID secrets. The build will still succeed.

To fix: Add the Netlify secrets following the instructions above, or use Vercel instead.

### "Build failed"
Check that VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are correctly configured in GitHub secrets.
