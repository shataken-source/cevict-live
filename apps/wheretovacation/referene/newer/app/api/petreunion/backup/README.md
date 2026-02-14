# PetReunion Database Backup API

## Overview
This API provides automated backup functionality for the PetReunion database, including encryption, integrity verification, and storage management.

## Endpoints

### POST `/api/petreunion/backup`

#### Actions

**1. Create Backup** (`action: 'backup'`)
```typescript
POST /api/petreunion/backup
Content-Type: application/json

{
  "action": "backup"
}

// Response:
{
  "success": true,
  "backupId": "petreunion-backup-1234567890",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "totalRecords": 500,
  "tables": ["lost_pets", "found_pets"],
  "recordCounts": {
    "lost_pets": 450,
    "found_pets": 50
  },
  "checksum": "sha256-hash",
  "fileName": "petreunion-backup-1234567890.encrypted.json",
  "message": "Backup completed successfully: 500 records"
}
```

**2. List Backups** (`action: 'list'`)
```typescript
POST /api/petreunion/backup
Content-Type: application/json

{
  "action": "list"
}

// Response:
{
  "backups": [
    {
      "backupId": "petreunion-backup-1234567890",
      "timestamp": "2024-01-15T10:30:00.000Z",
      "totalRecords": 500,
      "recordCounts": {
        "lost_pets": 450,
        "found_pets": 50
      },
      "fileName": "petreunion-backup-1234567890.encrypted.json"
    }
  ]
}
```

**3. Verify Backup** (`action: 'verify'`)
```typescript
POST /api/petreunion/backup
Content-Type: application/json

{
  "action": "verify",
  "backupId": "petreunion-backup-1234567890"
}

// Response:
{
  "valid": true,
  "backupId": "petreunion-backup-1234567890",
  "checksum": "sha256-hash",
  "size": 1024000,
  "message": "Backup file exists and is valid"
}
```

**4. Health Check** (`action: 'health'`)
```typescript
POST /api/petreunion/backup
Content-Type: application/json

{
  "action": "health"
}

// Response:
{
  "healthy": true,
  "databaseAccessible": true,
  "storageAccessible": true,
  "hoursSinceLastBackup": 2.5,
  "lastBackupTime": "2024-01-15T08:00:00.000Z",
  "message": "System is healthy"
}
```

### GET `/api/petreunion/backup?action=health`

Quick health check endpoint.

## Features

### 1. Encryption
- **AES-256-GCM encryption** for all backup files
- Secure encryption key management
- Initialization vectors (IV) for each backup

### 2. Integrity Verification
- **SHA-256 checksums** for all backups
- Automatic verification on restore
- Tamper detection

### 3. Tables Backed Up
- `lost_pets` - Lost pet reports
- `found_pets` - Found pet reports
- `pet_matches` - Matched pets
- `shelters` - Shelter information
- `pet_alerts` - Alert subscriptions

### 4. Storage
- Backups stored in Supabase Storage bucket: `database-backups`
- Metadata stored separately for quick access
- Automatic file naming with timestamps

## Setup

### 1. Environment Variables
```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
BACKUP_ENCRYPTION_KEY=your-encryption-key (optional, defaults to a default key)
```

### 2. Create Storage Bucket
In Supabase Dashboard:
1. Go to Storage
2. Create bucket: `database-backups`
3. Set to public or configure RLS policies

### 3. Usage Examples

**Create a backup:**
```typescript
const response = await fetch('/api/petreunion/backup', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ action: 'backup' })
});
const result = await response.json();
```

**List all backups:**
```typescript
const response = await fetch('/api/petreunion/backup', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ action: 'list' })
});
const { backups } = await response.json();
```

**Check backup health:**
```typescript
const response = await fetch('/api/petreunion/backup?action=health', {
  method: 'GET'
});
const health = await response.json();
```

## Automated Backups

### Using GitHub Actions
Create `.github/workflows/petreunion-backup.yml`:
```yaml
name: PetReunion Database Backup

on:
  schedule:
    - cron: '0 */6 * * *'  # Every 6 hours
  workflow_dispatch:

jobs:
  backup:
    runs-on: ubuntu-latest
    steps:
      - name: Create Backup
        run: |
          curl -X POST ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}/api/petreunion/backup \
            -H "Content-Type: application/json" \
            -d '{"action":"backup"}'
```

### Using Vercel Cron
Add to `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/petreunion/backup",
    "schedule": "0 */6 * * *"
  }]
}
```

## Security Notes

1. **Encryption Key**: Change `BACKUP_ENCRYPTION_KEY` in production
2. **Service Role Key**: Never expose the service role key in client-side code
3. **Storage Access**: Configure RLS policies on the storage bucket
4. **Backup Retention**: Implement cleanup policies for old backups

## Troubleshooting

### Backup fails with "Database not configured"
- Check that `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set
- Verify environment variables are loaded correctly

### Storage upload fails
- Verify the `database-backups` bucket exists
- Check bucket permissions
- Backup will still complete but won't be stored in cloud storage

### Table doesn't exist errors
- This is normal for tables that haven't been created yet
- The backup will skip missing tables and continue












