# Netlify Deployment Setup Guide

## Quick Start

This guide will help you deploy your charter booking platform to Netlify with automatic deployments from GitHub.

## Prerequisites

- GitHub repository with your code
- Netlify account (free tier works great)

## Step 1: Create Netlify Site

1. Go to [https://app.netlify.com](https://app.netlify.com)
2. Click **"Add new site"** → **"Import an existing project"**
3. Choose **GitHub** as your Git provider
4. Authorize Netlify to access your repositories
5. Select your charter booking repository
6. Configure build settings:
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
   - **Node version:** 20
7. Click **"Deploy site"**

## Step 2: Get Your Netlify Credentials

### Get NETLIFY_AUTH_TOKEN

1. Go to [https://app.netlify.com/user/applications/personal](https://app.netlify.com/user/applications/personal)
2. Click **"New access token"**
3. Give it a name like "GitHub Actions Deploy"
4. Click **"Generate token"**
5. **Copy the token immediately** (you won't see it again!)

### Get NETLIFY_SITE_ID

1. Go to your site dashboard on Netlify
2. Click **"Site settings"**
3. Under **"Site details"**, find **"Site ID"**
4. Copy the Site ID (looks like: `abc123-def456-ghi789`)

## Step 3: Add Secrets to GitHub

1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **"New repository secret"**
4. Add these two secrets:

```
Name: NETLIFY_AUTH_TOKEN
Value: [paste your token from Step 2]

Name: NETLIFY_SITE_ID
Value: [paste your site ID from Step 2]
```

## Step 4: Configure Environment Variables in Netlify

1. In Netlify, go to **Site settings** → **Environment variables**
2. Add these variables:

```
VITE_SUPABASE_URL
Value: https://xzdzmeaxbjvntuqeommq.supabasepad.com

VITE_SUPABASE_ANON_KEY
Value: [Your Supabase anon key]
```

## Step 5: Test Deployment

1. Push a commit to your `main` branch
2. Go to **Actions** tab in GitHub
3. Watch the "Deploy to Netlify" workflow run
4. Once complete, your site will be live!

## Automatic Deployments

Now every time you:
- Push to `main` branch → Automatic production deployment
- Open a pull request → Preview deployment with unique URL

## Custom Domain (Optional)

1. In Netlify: **Site settings** → **Domain management**
2. Click **"Add custom domain"**
3. Follow instructions to configure DNS

## Troubleshooting

### Build fails with "Netlify credentials not provided"
- Make sure you added both NETLIFY_AUTH_TOKEN and NETLIFY_SITE_ID to GitHub secrets
- Check that secret names are spelled exactly as shown above

### Site deploys but shows blank page
- Check environment variables in Netlify (Step 4)
- Make sure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set

### Build succeeds but deployment skipped
- This is normal if you haven't configured the secrets yet
- The workflow will build and test your code, but skip deployment

## Need Help?

See `.github/DEPLOYMENT_SECRETS.md` for more details on all available secrets.
