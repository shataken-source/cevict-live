# Captain Verification & Onboarding System Guide

## Overview
Comprehensive captain verification system with USCG license verification, background checks, insurance validation, and automated email notifications for application status updates.

## Features Implemented

### 1. Database Tables
- **captain_applications**: Stores captain application data with status tracking
- **captain_verifications**: Tracks verification status for USCG, background checks, insurance, and references
- **captain_background_checks**: Manages background check results from third-party providers

### 2. Edge Functions

#### captain-application-review
**Endpoint**: `/functions/v1/captain-application-review`

**Actions**:
- `review`: Approve or reject applications with admin notes
- `list`: Get applications filtered by status (pending, under_review, approved, rejected)

**Example Usage**:
```javascript
// Review application
await supabase.functions.invoke('captain-application-review', {
  body: {
    action: 'review',
    applicationId: 'uuid',
    status: 'approved',
    adminNotes: 'All documents verified',
    adminId: 'admin-uuid'
  }
});

// List pending applications
await supabase.functions.invoke('captain-application-review', {
  body: { action: 'list', status: 'pending' }
});
```

#### background-check-service
**Endpoint**: `/functions/v1/background-check-service`

**Actions**:
- `initiate`: Start background checks (criminal, driving, employment)
- `update`: Update check status and results
- `status`: Get background check status for captain

**Example Usage**:
```javascript
// Initiate background checks
await supabase.functions.invoke('background-check-service', {
  body: {
    action: 'initiate',
    captainId: 'uuid',
    applicationId: 'uuid'
  }
});
```

### 3. Admin Panel Components

#### CaptainApplicationReview
- View applications filtered by status
- Review detailed application information
- Approve or reject with admin notes
- Automatically sends email notifications

**Route**: `/admin/captain-review`

#### CaptainVerificationDashboard
- Shows verification progress for captains
- Displays USCG license, background check, insurance, and reference status
- One-click background check initiation
- Progress tracking with percentage completion

### 4. Email Notifications

Automated emails sent via SendGrid:
- **Approval Email**: Congratulations message with next steps
- **Rejection Email**: Status update with admin notes
- **Status Update Email**: General application status changes

## Admin Workflow

### Reviewing Applications

1. Navigate to `/admin/captain-review`
2. Filter applications by status (pending, under_review, approved, rejected)
3. Click on an application to view details
4. Review:
   - Personal information
   - USCG license details
   - Years of experience
   - Insurance information
   - Uploaded documents
5. Add admin notes (optional)
6. Click "Approve" or "Reject"
7. System automatically:
   - Updates application status
   - Sends email notification to captain
   - Records admin ID and timestamp

### Background Check Process

1. Admin initiates background check from application review
2. System creates checks for:
   - Criminal background
   - Driving record
   - Employment verification
3. Each check gets unique reference number
4. Status tracked: pending → in_progress → clear/review_required/failed
5. Results stored in database for compliance

## Captain Workflow

### Application Submission

1. Captain visits `/apply-captain`
2. Fills out application form with:
   - Personal information
   - USCG license number
   - Years of experience
   - Insurance details
3. Uploads required documents:
   - USCG license document
   - Insurance certificate
   - Additional certifications
4. Submits application
5. Receives confirmation email

### Verification Dashboard

1. Captain logs in and views verification dashboard
2. Sees status of:
   - USCG License Verification
   - Background Check
   - Insurance Validation
   - References
3. Progress bar shows completion percentage
4. Can initiate background check when ready

## Integration with Existing Systems

### USCG License Verification
Uses existing `uscg-license-verifier` function:
```javascript
await supabase.functions.invoke('uscg-license-verifier', {
  body: {
    action: 'verify-single',
    captainId: 'uuid',
    licenseNumber: 'USCG-123456'
  }
});
```

### Insurance Verification
Uses existing `insurance-policy-verifier` function:
```javascript
await supabase.functions.invoke('insurance-policy-verifier', {
  body: {
    action: 'verify',
    captainId: 'uuid',
    policyNumber: 'POL-123456',
    provider: 'BoatUS'
  }
});
```

## Database Schema

### captain_applications
```sql
- id: UUID (primary key)
- captain_id: UUID (references auth.users)
- full_name: TEXT
- email: TEXT
- phone: TEXT
- location: TEXT
- uscg_license: TEXT
- years_experience: INTEGER
- specialties: TEXT
- bio: TEXT
- insurance_provider: TEXT
- insurance_coverage: TEXT
- insurance_policy_number: TEXT
- documents: JSONB
- status: TEXT (pending/under_review/approved/rejected)
- admin_notes: TEXT
- reviewed_by: UUID
- reviewed_at: TIMESTAMPTZ
- submitted_at: TIMESTAMPTZ
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
```

### captain_verifications
```sql
- id: UUID (primary key)
- captain_id: UUID
- application_id: UUID
- verification_type: TEXT (uscg_license/background_check/insurance/references)
- status: TEXT (pending/in_progress/verified/failed)
- verification_data: JSONB
- verified_by: TEXT
- verified_at: TIMESTAMPTZ
- expiry_date: DATE
- notes: TEXT
```

### captain_background_checks
```sql
- id: UUID (primary key)
- captain_id: UUID
- application_id: UUID
- check_type: TEXT (criminal/driving/employment/reference)
- status: TEXT (pending/clear/review_required/failed)
- provider: TEXT
- reference_number: TEXT
- results: JSONB
- completed_at: TIMESTAMPTZ
```

## Security Features

1. **Row Level Security (RLS)**: Enabled on all tables
2. **Rate Limiting**: Application submissions rate-limited
3. **Input Sanitization**: All inputs sanitized with DOMPurify
4. **Document Validation**: File size and type validation
5. **Secure Storage**: Documents stored in private bucket

## Testing

### Test Application Review
```bash
curl -X POST https://api.databasepad.com/functions/v1/captain-application-review \
  -H "Content-Type: application/json" \
  -d '{
    "action": "list",
    "status": "pending"
  }'
```

### Test Background Check
```bash
curl -X POST https://api.databasepad.com/functions/v1/background-check-service \
  -H "Content-Type: application/json" \
  -d '{
    "action": "status",
    "captainId": "uuid"
  }'
```

## Future Enhancements

- Real-time background check provider integration (Checkr, GoodHire)
- Automated USCG license expiration monitoring
- Insurance policy renewal reminders
- Reference check automation
- Video interview scheduling
- Document OCR for automatic data extraction
- Multi-step application wizard
- Application analytics dashboard
- Batch approval workflow
- Custom email templates per status

## Support

For issues or questions:
- Check application logs in Supabase dashboard
- Review email delivery status in SendGrid
- Monitor background check status in admin panel
- Contact support team for integration assistance
