# Automated Database Backup System Guide

## Overview
Gulf Coast Charters now has an enterprise-grade automated backup system with encryption, point-in-time recovery, verification, and intelligent retention policies.

## Features

### 1. Encrypted Backups
- **AES-256-GCM encryption** for all backup files
- Secure storage in Supabase Storage bucket
- SHA-256 checksums for integrity verification

### 2. Automated Schedule
- **Every 6 hours** automatic backups
- Configurable intervals (hourly, daily, weekly, monthly)
- Automatic execution via cron jobs

### 3. Retention Policies
- **Daily backups**: Keep for 7 days
- **Weekly backups**: Keep for 4 weeks  
- **Monthly backups**: Keep for 1 year
- Automatic cleanup of old backups

### 4. Point-in-Time Recovery
- Restore to any previous backup point
- Find closest backup to target timestamp
- Minimal data loss scenarios

### 5. Health Monitoring
- Real-time backup health status
- Alerts if backups are overdue (>7 hours)
- Track success/failure rates

## Setup Instructions

### Step 1: Verify Storage Bucket
```bash
# The 'database-backups' bucket should already exist
# Verify in Supabase Dashboard > Storage
```

### Step 2: Set Up Cron Job (Every 6 Hours)
```bash
# Add to your cron scheduler (e.g., GitHub Actions, Vercel Cron, or system cron)
0 */6 * * * curl -X POST https://api.databasepad.com/functions/v1/database-backup \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"action":"backup"}'
```

### Step 3: GitHub Actions Workflow
Create `.github/workflows/database-backup.yml`:
```yaml
name: Automated Database Backup
on:
  schedule:
    - cron: '0 */6 * * *'  # Every 6 hours
  workflow_dispatch:  # Manual trigger

jobs:
  backup:
    runs-on: ubuntu-latest
    steps:
      - name: Create Database Backup
        run: |
          curl -X POST ${{ secrets.SUPABASE_URL }}/functions/v1/database-backup \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_ANON_KEY }}" \
            -H "Content-Type: application/json" \
            -d '{"action":"backup"}'
```

## API Usage

### Create Manual Backup
```typescript
const { data } = await supabase.functions.invoke('database-backup', {
  body: { action: 'backup' }
});
// Returns: { success: true, backupId: 1234567890, totalRecords: 5000 }
```

### List All Backups
```typescript
const { data } = await supabase.functions.invoke('database-backup', {
  body: { action: 'list' }
});
// Returns: { backups: [...] }
```

### Verify Backup Integrity
```typescript
const { data } = await supabase.functions.invoke('database-backup', {
  body: { action: 'verify', backupId: '1234567890' }
});
// Returns: { valid: true, recordCount: 5000, size: 1024000 }
```

### Restore from Backup
```typescript
const { data } = await supabase.functions.invoke('database-backup', {
  body: { action: 'restore', backupId: '1234567890' }
});
// Returns: { success: true, restoredCount: 5000 }
```

### Point-in-Time Recovery
```typescript
const { data } = await supabase.functions.invoke('database-backup', {
  body: { 
    action: 'point-in-time',
    pointInTime: '2024-01-15T14:30:00Z'
  }
});
// Restores to closest backup before specified time
```

### Check Backup Health
```typescript
const { data } = await supabase.functions.invoke('database-backup', {
  body: { action: 'health' }
});
// Returns: { healthy: true, hoursSinceLastBackup: 3, recentBackups: 10 }
```

## Admin Interface

Access the backup management interface:
```
/admin/backups
```

Features:
- View all backups with timestamps
- Create manual backups
- Verify backup integrity
- Restore from any backup point
- Monitor backup health status
- View backup history and statistics

## Monitoring & Alerts

### Health Check Indicators
- 🟢 **Healthy**: Last backup < 7 hours ago
- 🟡 **Warning**: Last backup 7-12 hours ago
- 🔴 **Critical**: Last backup > 12 hours ago

### Email Alerts (Optional)
Configure email notifications for:
- Backup failures
- Health check warnings
- Successful restorations

## Backup Contents

Each backup includes:
- `charters` - All charter listings
- `destinations` - Destination data
- `reviews` - User reviews
- `users` - User accounts
- `bookings` - Booking records
- `captains` - Captain profiles
- `captain_certifications` - Certifications
- `boats` - Boat/vessel data
- `payments` - Payment records
- `referrals` - Referral data

## Security Features

### Encryption
- All backups encrypted with AES-256-GCM
- Unique initialization vector per backup
- Secure key management

### Access Control
- Only admin users can access backup functions
- RLS policies on backup logs table
- Audit trail of all backup operations

### Integrity Verification
- SHA-256 checksums for each backup
- Automatic verification on restore
- Corruption detection

## Disaster Recovery

### Recovery Time Objective (RTO)
- **Target**: < 1 hour
- Automated restore process
- Minimal manual intervention

### Recovery Point Objective (RPO)
- **Target**: < 6 hours
- Maximum data loss: 6 hours
- Point-in-time recovery available

## Troubleshooting

### Backup Fails
1. Check Supabase service status
2. Verify storage bucket permissions
3. Check function logs in Supabase Dashboard
4. Ensure adequate storage space

### Restore Fails
1. Verify backup integrity first
2. Check for schema changes
3. Review error logs
4. Contact support if needed

### Health Check Warnings
1. Verify cron job is running
2. Check for failed backups in logs
3. Manually trigger backup if needed
4. Review system resources

## Best Practices

1. **Test Restores Regularly**: Verify backups work by testing restores monthly
2. **Monitor Health**: Check backup health dashboard weekly
3. **Document Changes**: Keep track of schema changes that affect backups
4. **Secure Access**: Limit backup access to admin users only
5. **Verify Integrity**: Run verification checks on critical backups

## Performance Considerations

- Backups run asynchronously (non-blocking)
- Average backup time: 2-5 minutes
- Storage usage: ~10MB per backup
- Retention cleanup: Automatic, runs with each backup

## Support

For issues or questions:
- Check function logs in Supabase Dashboard
- Review backup_logs table for history
- Contact system administrator
- Refer to Supabase documentation

---

**Status**: ✅ Production Ready
**Last Updated**: November 2024
**Version**: 1.0
