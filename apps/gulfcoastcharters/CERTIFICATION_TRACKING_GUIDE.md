# Certification Tracking System Setup Guide

## Overview
Automated system for tracking captain certifications, licenses, and insurance with email/SMS reminders at 90, 60, and 30 days before expiration.

## Features
- Track USCG licenses, insurance, safety certifications, and boat inspections
- Automated email reminders via Mailjet
- Automated SMS reminders via Sinch
- Document upload for renewals
- Visual status indicators (Active, Expiring Soon, Expired)
- Captain dashboard integration

## Edge Function: certification-tracker

### Endpoint
`https://api.databasepad.com/functions/v1/certification-tracker`

### Actions

#### 1. Check Expirations
Checks for certifications expiring in 90, 60, or 30 days.

```javascript
const { data } = await supabase.functions.invoke('certification-tracker', {
  body: {
    action: 'check_expirations'
  }
});
```

#### 2. Send Reminder
Sends email and SMS reminders for expiring certifications.

```javascript
const { data } = await supabase.functions.invoke('certification-tracker', {
  body: {
    action: 'send_reminder',
    certificationData: {
      certification: {
        cert_name: 'USCG Master License',
        cert_number: 'ML-123456',
        expiration_date: '2025-12-15'
      },
      daysUntilExpiration: 30,
      captain: {
        email: 'captain@example.com',
        name: 'John Smith',
        phone: '+15551234567'
      }
    }
  }
});
```

## Frontend Component: CertificationManager

Located in `src/components/CertificationManager.tsx`

### Usage
```jsx
import { CertificationManager } from '@/components/CertificationManager';

<CertificationManager captainId="captain-uuid" />
```

### Features
- Display all certifications with expiration dates
- Visual status badges (Active, Expiring Soon, Expired)
- Days remaining counter
- Upload renewal documents
- Add new certifications

## Captain Dashboard Integration

The certification manager is integrated into the Captain Dashboard as a dedicated tab:

1. Navigate to Captain Dashboard
2. Click "Certifications" tab
3. View all certifications and their status
4. Upload renewal documents as needed

## Automated Reminder Schedule

### Email Reminders (via Mailjet)
- **90 days before**: First reminder with full details
- **60 days before**: Second reminder with urgency
- **30 days before**: Final urgent reminder
- **Day of expiration**: Expiration notice

### SMS Reminders (via Sinch)
- Same schedule as email
- Shorter format with link to dashboard

## Setting Up Automated Checks

### Option 1: Cron Job (Recommended)
Set up a daily cron job to check expirations:

```bash
# Run daily at 9 AM
0 9 * * * curl -X POST https://api.databasepad.com/functions/v1/certification-tracker \
  -H "Content-Type: application/json" \
  -d '{"action":"check_expirations"}'
```

### Option 2: GitHub Actions
Create `.github/workflows/certification-check.yml`:

```yaml
name: Check Certifications
on:
  schedule:
    - cron: '0 9 * * *'  # Daily at 9 AM UTC
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - name: Check Expirations
        run: |
          curl -X POST https://api.databasepad.com/functions/v1/certification-tracker \
            -H "Content-Type: application/json" \
            -d '{"action":"check_expirations"}'
```

## Storage Setup

Certification documents are stored in the `captain-certifications` bucket:

```javascript
// Upload certification document
const { data, error } = await supabase.storage
  .from('captain-certifications')
  .upload(`${captainId}/${certificationId}/${file.name}`, file);
```

## Certification Types

- **uscg_license**: USCG Captain's License
- **insurance**: Liability Insurance
- **safety_cert**: Safety Certifications
- **boat_inspection**: Boat Inspection Certificates
- **first_aid**: First Aid Certification
- **cpr**: CPR Certification

## Testing

### Test Reminder Email
```javascript
await supabase.functions.invoke('certification-tracker', {
  body: {
    action: 'send_reminder',
    certificationData: {
      certification: {
        cert_name: 'Test Certification',
        cert_number: 'TEST-123',
        expiration_date: '2025-12-15'
      },
      daysUntilExpiration: 30,
      captain: {
        email: 'your-test-email@example.com',
        name: 'Test Captain',
        phone: '+15551234567'
      }
    }
  }
});
```

## Environment Variables Required

- `MAILJET_API_KEY`: Mailjet API key for email
- `MAILJET_SECRET_KEY`: Mailjet secret key
- `SINCH_API_TOKEN`: Sinch API token for SMS
- `SINCH_PHONE_NUMBER`: Sinch sender phone number

All environment variables are already configured in your Supabase project.

## Best Practices

1. **Regular Checks**: Run expiration checks daily
2. **Document Verification**: Review uploaded renewal documents promptly
3. **Captain Communication**: Ensure captains keep contact info updated
4. **Backup Reminders**: Consider additional manual checks quarterly
5. **Audit Trail**: Keep logs of all reminders sent

## Troubleshooting

### Reminders Not Sending
- Check environment variables are set
- Verify captain email/phone are valid
- Check Mailjet/Sinch service status
- Review edge function logs

### Upload Issues
- Verify storage bucket exists
- Check file size limits
- Ensure proper permissions

## Future Enhancements

- Admin notification for expired certifications
- Automatic captain suspension for expired critical certifications
- Integration with USCG license verification API
- Bulk certification upload
- Certification history tracking
