# Boat Documentation Management System

## Overview
Comprehensive boat documentation upload and management system for Gulf Coast Charters, featuring automated expiration tracking, renewal reminders, and verification badges visible to customers.

## Features

### Document Types Supported
- Vessel Registration
- Insurance Certificates
- Safety Inspection Reports
- Coast Guard Documentation
- Commercial Licenses
- Environmental Compliance Certificates

### Key Capabilities
- **Document Upload**: Drag-and-drop file upload with support for PDF, JPG, PNG formats
- **Expiration Tracking**: Optional expiration date tracking for time-sensitive documents
- **Automated Reminders**: Email notifications at 90, 60, 30, 14, and 7 days before expiration
- **Verification Status**: Admin verification with visual badges
- **Customer Visibility**: Verified documents displayed on boat listings
- **Secure Storage**: Private storage bucket for sensitive documentation

## Usage Guide

### For Captains

#### Uploading Documents
1. Navigate to Captain Dashboard → Fleet Management
2. Select a boat from your fleet
3. Click the "Documents" tab
4. Choose document type from dropdown
5. (Optional) Set expiration date for documents requiring renewal
6. Click "Choose File to Upload" and select your document
7. Document uploads automatically and appears in the list

#### Managing Documents
- View all uploaded documents with status badges
- Click "View" to open any document
- Monitor expiration dates
- Receive automated email reminders before documents expire

### For Administrators

#### Verifying Documents
Use the edge function to verify documents:
```javascript
await supabase.functions.invoke('boat-documentation-manager', {
  body: {
    action: 'verify',
    documentId: 'doc-uuid-here'
  }
});
```

#### Checking Expirations
Run manual expiration check:
```javascript
await supabase.functions.invoke('boat-documentation-manager', {
  body: { action: 'check_expirations' }
});
```

## Automated Reminder System

### Email Reminders
Reminders are sent via Mailjet at:
- 90 days before expiration
- 60 days before expiration
- 30 days before expiration
- 14 days before expiration
- 7 days before expiration

### Setting Up Automated Checks
Create a scheduled job (cron) to run daily:

```yaml
# .github/workflows/document-expiration-check.yml
name: Check Document Expirations
on:
  schedule:
    - cron: '0 9 * * *'  # Daily at 9 AM UTC
  workflow_dispatch:

jobs:
  check-expirations:
    runs-on: ubuntu-latest
    steps:
      - name: Check Expiring Documents
        run: |
          curl -X POST https://api.databasepad.com/functions/v1/boat-documentation-manager \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}" \
            -H "Content-Type: application/json" \
            -d '{"action":"check_expirations"}'
```

## Verification Badges

### Badge Display
Verified documents appear as badges on:
- Boat cards in fleet management
- Captain profile pages
- Boat listings visible to customers

### Badge Types
- **Verified** (Green): Document verified and not expired
- **Pending** (Gray): Awaiting admin verification
- **Expired** (Red): Document past expiration date

## API Reference

### Upload Document
```javascript
{
  action: 'upload',
  boatId: 'boat-uuid',
  captainId: 'captain-id',
  documentType: 'Vessel Registration',
  fileUrl: 'https://storage-url/file.pdf',
  fileName: 'registration.pdf',
  expirationDate: '2025-12-31' // Optional
}
```

### List Documents
```javascript
{
  action: 'list',
  boatId: 'boat-uuid'
}
```

### Verify Document
```javascript
{
  action: 'verify',
  documentId: 'document-uuid'
}
```

### Check Expirations
```javascript
{
  action: 'check_expirations'
}
```

## Storage Bucket Configuration

**Bucket Name**: `boat-documents`
**Access**: Private (not publicly accessible)
**File Types**: PDF, JPG, JPEG, PNG
**Path Structure**: `{captainId}/{boatId}/{timestamp}_{filename}`

## Security Considerations

- Documents stored in private bucket
- Only boat owners and admins can access documents
- Verification required before badges display to customers
- Secure file upload with validation
- Expiration tracking prevents outdated documents

## Best Practices

1. **Upload documents immediately** after receiving them
2. **Set expiration dates** for all time-sensitive documents
3. **Respond to reminders promptly** to maintain verification status
4. **Keep high-quality scans** - clear, legible documents
5. **Update expired documents** within 7 days of expiration

## Troubleshooting

### Upload Fails
- Check file format (PDF, JPG, PNG only)
- Ensure file size under 10MB
- Verify document type is selected
- Check internet connection

### Reminders Not Received
- Verify email address in profile
- Check spam/junk folder
- Ensure expiration date is set correctly
- Contact support if issue persists

### Verification Status Not Updating
- Allow 24-48 hours for admin review
- Ensure document is clear and legible
- Verify all required information is visible
- Contact support for urgent verification

## Support
For issues or questions, contact Gulf Coast Charters support or submit a ticket through the captain dashboard.
