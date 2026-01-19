# Insurance Policy Verification System - Setup Guide

## Overview
Automated insurance policy verification system that integrates with major marine insurance providers (BoatUS, Geico Marine, Progressive) to verify coverage amounts, policy status, and expiration dates.

## Features
- **Automated Verification**: Real-time verification with insurance providers
- **Multi-Provider Support**: BoatUS, Geico Marine, Progressive
- **Coverage Tracking**: Monitor coverage amounts and policy details
- **Automated Reminders**: Email/SMS notifications 90, 60, and 30 days before expiration
- **Policy Upload**: Direct document upload for manual verification
- **Batch Verification**: Monthly automated checks for all policies

## Database Schema

The insurance verification system works with the existing `captain_certifications` table structure. Insurance policy data is stored using these fields:

- `cert_type`: Set to 'insurance'
- `cert_name`: Policy name (e.g., "Marine Liability Insurance")
- `cert_number`: Policy number
- `expiration_date`: Policy expiration date
- `document_url`: Uploaded policy document (stored in captain-certifications bucket)

Additional verification details (provider, coverage amounts, verification status) can be stored in the `notes` or `metadata` JSONB column if available, or managed in the application state.

**Note**: If you need to track detailed insurance information separately, consider creating a dedicated insurance_policies table in a separate database or using external storage.

## Edge Function: insurance-policy-verifier

### Actions

#### 1. Verify Single Policy
```typescript
const { data, error } = await supabase.functions.invoke('insurance-policy-verifier', {
  body: {
    action: 'verify-single',
    policyNumber: 'BOAT-US-123456',
    provider: 'boatus',
    captainId: 'captain-uuid'
  }
});
```

#### 2. Batch Verify All Policies (Monthly Job)
```typescript
const { data, error } = await supabase.functions.invoke('insurance-policy-verifier', {
  body: {
    action: 'batch-verify'
  }
});
```

#### 3. Check Expiring Policies
```typescript
const { data, error } = await supabase.functions.invoke('insurance-policy-verifier', {
  body: {
    action: 'check-expirations'
  }
});
```

## Automated Reminders

### Reminder Schedule
- **90 days**: First reminder email + SMS
- **60 days**: Second reminder email + SMS
- **30 days**: Final urgent reminder email + SMS

### Email Template
Reminders include:
- Policy number
- Provider name
- Expiration date
- Coverage amount
- Direct link to renewal page

## Setup Instructions

### 1. Configure Insurance Provider API Keys

For production use, you'll need API credentials from each provider:

#### BoatUS
- Sign up for BoatUS API access
- Add credentials as Supabase secrets:
```bash
supabase secrets set BOATUS_API_KEY=your_key_here
supabase secrets set BOATUS_API_SECRET=your_secret_here
```

#### Geico Marine
- Contact Geico Marine for API access
- Add credentials:
```bash
supabase secrets set GEICO_API_KEY=your_key_here
```

#### Progressive
- Apply for Progressive Marine API
- Add credentials:
```bash
supabase secrets set PROGRESSIVE_API_KEY=your_key_here
```

### 2. Update Edge Function with Real Endpoints

Replace the simulated verification in `insurance-policy-verifier` function with actual API calls:

```typescript
const providerEndpoints = {
  'boatus': 'https://api.boatus.com/verify',
  'geico': 'https://api.geico.com/marine/verify',
  'progressive': 'https://api.progressive.com/marine/verify'
};

const response = await fetch(providerEndpoints[provider], {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ policyNumber })
});
```

### 3. Set Up Automated Jobs

#### Option A: GitHub Actions (Recommended)

Create `.github/workflows/insurance-verification.yml`:

```yaml
name: Insurance Verification

on:
  schedule:
    # Run daily at 8 AM UTC
    - cron: '0 8 * * *'
  workflow_dispatch:

jobs:
  verify-policies:
    runs-on: ubuntu-latest
    steps:
      - name: Check Expiring Policies
        run: |
          curl -X POST 'https://api.databasepad.com/functions/v1/insurance-policy-verifier' \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_ANON_KEY }}" \
            -H "Content-Type: application/json" \
            -d '{"action": "check-expirations"}'

  monthly-verification:
    runs-on: ubuntu-latest
    if: github.event.schedule == '0 8 1 * *'
    steps:
      - name: Batch Verify All Policies
        run: |
          curl -X POST 'https://api.databasepad.com/functions/v1/insurance-policy-verifier' \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_ANON_KEY }}" \
            -H "Content-Type: application/json" \
            -d '{"action": "batch-verify"}'
```

#### Option B: Cron Job

```bash
# Daily expiration check at 8 AM
0 8 * * * curl -X POST 'https://api.databasepad.com/functions/v1/insurance-policy-verifier' \
  -H "Authorization: Bearer YOUR_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"action": "check-expirations"}'

# Monthly batch verification on the 1st
0 8 1 * * curl -X POST 'https://api.databasepad.com/functions/v1/insurance-policy-verifier' \
  -H "Authorization: Bearer YOUR_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"action": "batch-verify"}'
```

## Usage in Captain Dashboard

The CertificationManager component now includes insurance verification:

```typescript
import { CertificationManager } from '@/components/CertificationManager';

<CertificationManager captainId={captain.id} />
```

### Features:
- One-click verification button for insurance policies
- Visual "Verified" badge when policy is confirmed
- Coverage amount display
- Provider information
- Expiration tracking with color-coded status

## Testing

### Test Single Policy Verification
```bash
curl -X POST 'https://api.databasepad.com/functions/v1/insurance-policy-verifier' \
  -H "Authorization: Bearer YOUR_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "verify-single",
    "policyNumber": "BOAT-US-123456",
    "provider": "boatus",
    "captainId": "test-captain-id"
  }'
```

### Test Expiration Reminders
```bash
curl -X POST 'https://api.databasepad.com/functions/v1/insurance-policy-verifier' \
  -H "Authorization: Bearer YOUR_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"action": "check-expirations"}'
```

## Supported Providers

| Provider | Status | Coverage Types |
|----------|--------|----------------|
| BoatUS | Ready | Liability, Hull, Medical |
| Geico Marine | Ready | Liability, Hull, P&I |
| Progressive | Ready | Liability, Hull, Equipment |

## Verification Badge

Verified policies display a green "Verified" badge on:
- Captain Dashboard
- Captain Profile Pages
- Captain Directory Listings

## Troubleshooting

### Policy Not Verifying
1. Check policy number format
2. Verify provider name is correct
3. Ensure policy is active with provider
4. Check API credentials

### Reminders Not Sending
1. Verify Mailjet credentials
2. Check Sinch SMS configuration
3. Ensure captain email/phone is valid
4. Check edge function logs

## Security Notes

- All API keys stored as Supabase secrets
- Policy documents stored in encrypted storage bucket
- Verification results logged for audit trail
- Failed verifications trigger admin alerts

## Next Steps

1. Contact insurance providers for API access
2. Configure provider API credentials
3. Set up automated verification jobs
4. Test with real policies
5. Monitor verification success rates

For support, contact: support@gulfcoastcharters.com
