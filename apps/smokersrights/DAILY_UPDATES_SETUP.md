# Daily Law Updates Setup

This document explains how to set up daily law updates for the SmokersRights platform.

## Overview

The daily law update service updates the `last_updated_at` field for all laws in the database. This ensures that laws appear as "actively monitored" and shows users that the platform is being maintained.

## Setup Options

### Option 1: Vercel Cron Jobs (Recommended for Production)

If deployed on Vercel, use Vercel Cron Jobs:

1. Add to `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/bot/run",
      "schedule": "0 2 * * *"
    }
  ]
}
```

2. Set environment variable `BOT_SECRET_TOKEN` in Vercel dashboard

3. The cron job will call `/api/bot/run` daily at 2 AM UTC

### Option 2: External Cron Service

Use a service like:
- **cron-job.org** (free)
- **EasyCron** (free tier)
- **GitHub Actions** (free for public repos)

Configure to call:
```
POST https://your-domain.com/api/bot/run
Authorization: Bearer YOUR_BOT_SECRET_TOKEN
```

### Option 3: Local Cron Job

On a server with cron:

```bash
# Edit crontab
crontab -e

# Add this line (runs daily at 2 AM)
0 2 * * * cd /path/to/apps/smokersrights && tsx scripts/daily-law-update.ts >> /var/log/smokersrights-updates.log 2>&1
```

### Option 4: Manual Testing

Test the update service manually:

```bash
# Using the script
cd apps/smokersrights
tsx scripts/daily-law-update.ts

# Or via API
curl -X POST https://your-domain.com/api/bot/run \
  -H "Authorization: Bearer YOUR_BOT_SECRET_TOKEN"
```

## Environment Variables

Required:
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (for updates)

Optional:
- `BOT_SECRET_TOKEN` - Secret token for API authentication (default: 'smokersrights-bot-secret')

## Verification

After setup, verify it's working:

1. Check the database - all laws should have `last_updated_at` set to today's date
2. Check logs - the script/API should log success messages
3. Check the website - law pages should show "Updated [today's date]"

## Troubleshooting

**Error: "Supabase credentials not configured"**
- Ensure `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set

**Error: "Unauthorized" (API endpoint)**
- Check that `BOT_SECRET_TOKEN` matches in both the request and environment

**Laws not updating**
- Check Supabase permissions - service role key needs UPDATE permission on `laws` table
- Check logs for specific error messages

## API Endpoint

The `/api/bot/run` endpoint accepts:
- **GET**: Manual trigger (no auth required for testing)
- **POST**: Scheduled trigger (requires `Authorization: Bearer TOKEN` header)

Response format:
```json
{
  "success": true,
  "result": {
    "totalChecked": 400,
    "updated": 400,
    "errors": [],
    "timestamp": "2026-01-18T02:00:00.000Z"
  }
}
```
