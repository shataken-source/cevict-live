# USCG License Verification Integration Guide

## Overview
Automated USCG license verification system that integrates with the National Maritime Center to verify captain credentials, track expiration dates, and maintain verification status.

## Features Implemented

### 1. USCG License Verifier Edge Function
- **Function**: `uscg-license-verifier`
- **Actions**:
  - `verify-single`: Verify individual license
  - `verify-all`: Monthly batch verification of all licenses

### 2. Verification Badge System
- **USCG Verified Badge**: Blue badge with shield icon
- Shows verification date on hover
- Displayed on captain profiles and directory

### 3. Certification Manager Integration
- One-click USCG verification button
- Real-time verification status updates
- MMR number tracking
- Visual verification badges

## Monthly Automated Checks

### Setup GitHub Actions (Recommended)
```yaml
name: Monthly USCG Verification
on:
  schedule:
    - cron: '0 2 1 * *'  # 2 AM on 1st of month
  workflow_dispatch:

jobs:
  verify-licenses:
    runs-on: ubuntu-latest
    steps:
      - name: Verify All USCG Licenses
        run: |
          curl -X POST https://api.databasepad.com/functions/v1/uscg-license-verifier \
            -H "Content-Type: application/json" \
            -d '{"action":"verify-all"}'
```

### Alternative: Cron Job
```bash
# Add to crontab (runs 1st of each month at 2 AM)
0 2 1 * * curl -X POST https://api.databasepad.com/functions/v1/uscg-license-verifier -H "Content-Type: application/json" -d '{"action":"verify-all"}'
```

## Manual Verification

Captains can verify licenses from their dashboard:
1. Go to Captain Dashboard > Certifications tab
2. Click "Verify USCG" button on license card
3. System checks license with USCG NMC
4. Badge updates automatically

## API Usage

### Verify Single License
```javascript
const { data } = await supabase.functions.invoke('uscg-license-verifier', {
  body: {
    action: 'verify-single',
    licenseNumber: 'ML-1234567',
    mmrNumber: 'MMR-987654',
    captainId: 'uuid'
  }
});
```

### Monthly Batch Verification
```javascript
const { data } = await supabase.functions.invoke('uscg-license-verifier', {
  body: { action: 'verify-all' }
});
```

## Discrepancy Handling

When verification fails:
1. Captain receives email notification via Mailjet
2. Issue logged in verification data
3. Admin dashboard flags discrepancy
4. Captain prompted to update license info

## USCG API Notes

**IMPORTANT**: USCG doesn't currently offer public API access. Current implementation:
- Validates license format
- Simulates verification (for demo)
- Framework ready for real API integration

**For Production**: Contact USCG NMC at IASKNMC@uscg.mil to request API access or partnership for automated verification.

## Testing

Test verification:
```bash
curl -X POST https://api.databasepad.com/functions/v1/uscg-license-verifier \
  -H "Content-Type: application/json" \
  -d '{
    "action": "verify-single",
    "licenseNumber": "1234567",
    "captainId": "test-id"
  }'
```

## Components Updated

1. **CaptainVerificationBadges.tsx**: Added USCG Verified badge
2. **CertificationManager.tsx**: Added verification button and status
3. **CaptainProfile.tsx**: Displays USCG verification status
4. **CaptainDirectory.tsx**: Shows verified captains

## Environment Variables

Required in Supabase edge functions:
- `MAILJET_API_KEY`: For email notifications
- `MAILJET_SECRET_KEY`: For email authentication

## Future Enhancements

- Real USCG API integration when available
- QR code scanning for physical credentials
- Automated expiration alerts
- Verification history tracking
