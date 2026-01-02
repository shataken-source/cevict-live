# Protecting Your .env.local File

## The Problem

Vercel CLI commands like `vercel env pull` or `vercel link` will **overwrite** your local `.env.local` file with only the variables stored in Vercel's dashboard. This can cause you to lose local-only variables or variables that haven't been synced to Vercel yet.

## Solutions

### 1. Always Backup Before Vercel Operations

Before running any Vercel CLI commands, backup your `.env.local`:

```powershell
.\backup-env.ps1
```

Then if it gets overwritten, restore it:

```powershell
.\restore-env.ps1
```

### 2. Use .env.example as Template

The `.env.example` file contains all the variables your app needs. Use it as a reference when restoring.

### 3. Add All Variables to Vercel Dashboard

To prevent loss, add ALL your environment variables to the Vercel project dashboard:
1. Go to your Vercel project
2. Settings → Environment Variables
3. Add all variables from `.env.local`
4. Then `vercel env pull` will include them all

### 4. Never Run `vercel env pull` Without Backup

The `vercel env pull` command will **replace** your local file. Always backup first!

## Quick Commands

```powershell
# Backup before Vercel operations
.\backup-env.ps1

# Run Vercel command (e.g., vercel env pull)
vercel env pull

# If needed, restore from backup
.\restore-env.ps1
```

## Current Environment Variables

Your app needs these variables (see `.env.example` for full list):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `SINCH_SERVICE_PLAN_ID`
- `SINCH_API_TOKEN`
- `SINCH_FROM`
- `ADMIN_PASSWORD`
- `BOT_API_KEY`
- And more...

