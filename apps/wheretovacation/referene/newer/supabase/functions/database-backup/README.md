# Database Backup Edge Function

## Overview
Comprehensive backup system that backs up **EVERYTHING** for catastrophic failure recovery.

## Features
- ✅ Backs up ALL tables in public schema
- ✅ Uses SERVICE ROLE KEY to bypass RLS (accesses all data)
- ✅ Stores encrypted backups in Supabase Storage
- ✅ Point-in-time recovery support
- ✅ Health monitoring
- ✅ Integrity verification

## Setup

### 1. Create Storage Bucket
In Supabase Dashboard > Storage:
- Create bucket: `database-backups`
- Set to private (not public)
- Enable file size limit: 50MB

### 2. Set Environment Variables
In Supabase Dashboard > Edge Functions > database-backup:
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: **CRITICAL** - Service role key (not anon key!)

### 3. Deploy Function
```bash
supabase functions deploy database-backup
```

## API Usage

### Create Backup
```bash
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/database-backup \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"action":"backup"}'
```

### List Backups
```bash
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/database-backup \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"action":"list"}'
```

### Health Check
```bash
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/database-backup \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"action":"health"}'
```

### Verify Backup
```bash
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/database-backup \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"action":"verify","backupId":"backup_1234567890"}'
```

### Restore Backup (DANGEROUS!)
```bash
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/database-backup \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"action":"restore","backupId":"backup_1234567890","confirm":"YES_RESTORE_ALL_DATA"}'
```

## What Gets Backed Up

**ALL tables in public schema**, including:
- profiles, captain_profiles, boats, bookings
- reviews, fishing_reports, user_stats
- points_transactions, badges, user_badges
- notifications, weather_data, payments
- conversations, messages
- And ALL other tables automatically discovered

## Security

⚠️ **IMPORTANT**: This function uses SERVICE ROLE KEY to bypass RLS.
- Never expose the service role key
- Only call from secure environments (GitHub Actions, server-side)
- The function itself should be protected

## GitHub Actions Integration

The workflow in `.github/workflows/database-backup.yml` is already configured.
Just ensure:
1. `SUPABASE_URL` secret is set
2. `SUPABASE_ANON_KEY` secret is set (for calling the function)
3. Function is deployed with SERVICE_ROLE_KEY environment variable

## Recovery from Catastrophic Failure

1. **Download backup** from Supabase Storage
2. **Verify integrity** using verify action
3. **Restore** using restore action (with confirmation)
4. **Verify data** after restore

## Backup Format

Each backup is a JSON file containing:
```json
{
  "backupId": "backup_1234567890",
  "timestamp": "2025-12-03T...",
  "version": "1.0",
  "tables": {
    "profiles": {
      "success": true,
      "recordCount": 150,
      "data": [...]
    },
    ...
  },
  "metadata": {
    "totalTables": 50,
    "totalRecords": 10000,
    "backupSize": 5242880
  }
}
```

