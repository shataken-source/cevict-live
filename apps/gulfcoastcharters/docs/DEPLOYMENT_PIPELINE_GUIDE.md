# Deployment Pipeline Guide

## Overview

This project uses an automated deployment pipeline with staging and production environments, pre-deployment checks, rollback capabilities, and deployment notifications.

## Environments

### Staging Environment
- **Branch:** `develop`
- **URL:** https://staging.gulfcoastcharters.com
- **Purpose:** Testing and QA before production
- **Auto-deploy:** Yes (on push to develop)

### Production Environment
- **Branch:** `main`
- **URL:** https://gulfcoastcharters.com
- **Purpose:** Live production environment
- **Auto-deploy:** Yes (on push to main)

## Required GitHub Secrets

### Vercel Configuration
- `VERCEL_TOKEN` - Vercel authentication token
- `VERCEL_ORG_ID` - Your Vercel organization ID
- `VERCEL_PROJECT_ID` - Your Vercel project ID

### Staging Environment
- `STAGING_SUPABASE_URL` - Staging Supabase URL
- `STAGING_SUPABASE_ANON_KEY` - Staging Supabase anonymous key

### Production Environment
- `VITE_SUPABASE_URL` - Production Supabase URL
- `VITE_SUPABASE_ANON_KEY` - Production Supabase anonymous key

## Deployment Workflows

### 1. Deploy to Staging
**File:** `.github/workflows/deploy-staging.yml`

**Triggers:**
- Push to `develop` branch
- Manual workflow dispatch

**Steps:**
1. TypeScript validation
2. ESLint checks
3. Run tests
4. Build validation
5. Deploy to Vercel staging
6. Send notifications

### 2. Deploy to Production
**File:** `.github/workflows/deploy-production.yml`

**Triggers:**
- Push to `main` branch
- Git tags starting with `v*`
- Manual workflow dispatch

**Steps:**
1. TypeScript validation
2. ESLint checks
3. Run tests (can be skipped with input)
4. Build production
5. Create GitHub deployment
6. Deploy to Vercel production
7. Update deployment status
8. Send notifications

### 3. Rollback Deployment
**File:** `.github/workflows/rollback.yml`

**Triggers:**
- Manual workflow dispatch only

**Required Inputs:**
- `environment` - staging or production
- `commit-sha` - Specific commit to rollback to (optional)
- `reason` - Reason for rollback (required)

**Steps:**
1. Checkout previous/specified commit
2. Build rollback version
3. Deploy to Vercel
4. Create rollback issue for tracking

### 4. Deployment Notifications
**File:** `.github/workflows/deployment-notifications.yml`

**Triggers:**
- Deployment status changes

**Actions:**
- Success: Creates comment with deployment details
- Failure: Creates issue and assigns to deployer

## Pre-Deployment Checks

All deployments run these checks:

1. **TypeScript Validation**
   ```bash
   npm run type-check
   ```

2. **ESLint Checks**
   ```bash
   npm run lint
   ```

3. **Automated Tests**
   ```bash
   npm run test
   ```

4. **Build Validation**
   ```bash
   npm run build
   ```

## Using the Pipeline

### Deploy to Staging
```bash
# Merge to develop branch
git checkout develop
git merge feature/your-feature
git push origin develop
```

### Deploy to Production
```bash
# Merge to main branch
git checkout main
git merge develop
git push origin main
```

### Manual Deployment
1. Go to GitHub Actions
2. Select workflow (Deploy to Staging/Production)
3. Click "Run workflow"
4. Select branch and run

### Rollback Deployment
1. Go to GitHub Actions
2. Select "Rollback Deployment"
3. Click "Run workflow"
4. Fill in:
   - Environment (staging/production)
   - Commit SHA (optional - uses previous if empty)
   - Reason for rollback
5. Run workflow

## Build Commands

```bash
# Development build
npm run build:dev

# Staging build
npm run build:staging

# Production build
npm run build:production

# Run all validations
npm run validate
```

## Monitoring Deployments

### GitHub Deployments
- View in repository → Environments
- Shows deployment history
- Environment URLs
- Deployment status

### Vercel Dashboard
- Real-time deployment logs
- Build analytics
- Performance metrics

## Best Practices

1. **Always test in staging first**
2. **Use feature branches** for development
3. **Merge to develop** for staging deployment
4. **Merge to main** only after staging verification
5. **Tag releases** for production deployments
6. **Document rollbacks** with clear reasons
7. **Monitor deployment notifications**

## Troubleshooting

### Deployment Failed
1. Check GitHub Actions logs
2. Review pre-deployment check failures
3. Fix issues in feature branch
4. Re-deploy

### Need to Rollback
1. Use rollback workflow
2. Specify environment and reason
3. Investigate root cause
4. Fix and re-deploy

### Build Failures
1. Run locally: `npm run validate`
2. Fix TypeScript/ESLint errors
3. Ensure tests pass
4. Push fixes

## Environment Variables

Create `.env.staging` and `.env.production` files:

```env
# Staging
VITE_SUPABASE_URL=your_staging_url
VITE_SUPABASE_ANON_KEY=your_staging_key

# Production
VITE_SUPABASE_URL=your_production_url
VITE_SUPABASE_ANON_KEY=your_production_key
```

## Support

For issues with the deployment pipeline:
1. Check GitHub Actions logs
2. Review this guide
3. Contact DevOps team
