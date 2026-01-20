# GitHub Workflows Fix Guide

## Issues Fixed

### 1. Missing Playwright Dependency
**Problem**: Visual regression tests were failing because `@playwright/test` was not installed.

**Solution**: 
- Added `@playwright/test: ^1.48.0` to `devDependencies` in `package.json`
- Added test scripts: `test`, `test:ui`, and `test:visual`

### 2. Missing Test Script
**Problem**: Workflows were trying to run `npm test` but the script didn't exist.

**Solution**: Added test scripts to package.json:
```json
"test": "playwright test",
"test:ui": "playwright test --ui",
"test:visual": "playwright test tests/e2e/visual-regression.spec.ts"
```

### 3. Vercel Deployment Failures
**Problem**: Vercel deployment workflows were failing when `VERCEL_TOKEN` secret wasn't configured.

**Solution**: Added conditional checks to skip Vercel deployment if secrets are missing:
```yaml
if: github.event_name == 'push' && github.ref == 'refs/heads/main' && secrets.VERCEL_TOKEN != ''
```

## Required GitHub Secrets

To enable all workflows, configure these secrets in your GitHub repository:

### Supabase Secrets
- `VITE_SUPABASE_URL` - Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Your Supabase anonymous key

### Vercel Secrets (Optional)
- `VERCEL_TOKEN` - Vercel authentication token
- `VERCEL_ORG_ID` - Your Vercel organization ID
- `VERCEL_PROJECT_ID` - Your Vercel project ID

### Netlify Secrets (Optional)
- `NETLIFY_AUTH_TOKEN` - Netlify authentication token
- `NETLIFY_SITE_ID` - Your Netlify site ID

## Setting Up Secrets

1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add each secret with its corresponding value

## Running Tests Locally

```bash
# Install dependencies (including Playwright)
npm install

# Install Playwright browsers
npx playwright install

# Run all tests
npm test

# Run tests with UI
npm run test:ui

# Run only visual regression tests
npm run test:visual
```

## Workflow Status

After these fixes:
- ✅ CI/CD Pipeline - Will run tests and build
- ✅ Visual Regression - Will run if Playwright is installed
- ✅ Security Testing - Updated to use actions v4
- ⚠️ Vercel Deployments - Will skip if secrets not configured
- ✅ Netlify Deployment - Will work if secrets configured

## Next Steps

1. **Install dependencies**: Run `npm install` to get Playwright
2. **Configure secrets**: Add required secrets to GitHub
3. **Test locally**: Run `npm test` to verify tests work
4. **Push changes**: Commit and push to trigger workflows
