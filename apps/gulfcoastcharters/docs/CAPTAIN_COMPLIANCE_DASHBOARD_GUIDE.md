# Captain Compliance Dashboard Guide

## Overview
The Captain Compliance Dashboard provides a comprehensive view of document status, compliance scores, expiration tracking, and automated renewal reminders for Gulf Coast Charters captains.

## Features Implemented

### 1. Compliance Score Dashboard
- **Overall Compliance Score**: Percentage-based score showing document health (0-100%)
- **Visual Health Indicators**: 
  - Green: Valid documents (30+ days until expiration)
  - Yellow: Expiring soon (7-30 days)
  - Red: Critical/Expired (less than 7 days or expired)
  - Gray: Missing/Not uploaded
- **Metrics Display**: Shows count of valid, expiring, expired, and missing documents

### 2. Document Status Grid
Located in Captain Dashboard → Documents tab, displays:
- USCG License
- Insurance Policy
- Vessel Registration
- Safety Certification
- First Aid Certification
- CPR Certification

Each document card shows:
- Status badge (Valid, Expiring, Expired, Not Uploaded)
- Expiration date (if applicable)
- Days remaining/overdue
- Quick upload/update button

### 3. Expiration Timeline
- Chronological list of documents expiring within 90 days
- Color-coded urgency indicators
- Days remaining/overdue display
- Sortable by expiration date

### 4. Automated Email Reminders
Daily cron job sends renewal reminders at:
- **30 days** before expiration (first notice)
- **14 days** before expiration (second notice)
- **7 days** before expiration (URGENT notice)

Email includes:
- Document name and type
- Current expiration date
- Days remaining
- Direct upload link to captain dashboard
- Urgency indicator for critical documents

## Database Schema

### captain_documents table
```sql
CREATE TABLE captain_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  captain_id UUID REFERENCES auth.users(id),
  document_type TEXT NOT NULL,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  status TEXT CHECK (status IN ('pending', 'verified', 'expired')),
  expiration_date DATE,
  ocr_data JSONB,
  uploaded_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## Setup Instructions

### 1. Enable Automated Reminders
See `DOCUMENT_RENEWAL_CRON_SETUP.md` for detailed cron setup instructions.

### 2. Configure Email Service
Ensure SendGrid is configured in Supabase edge function:
```bash
SENDGRID_API_KEY=your_sendgrid_api_key
FROM_EMAIL=noreply@gulfcoastcharters.com
```

### 3. Test the System
1. Upload a test document with expiration date 29 days in the future
2. Wait for daily cron to run (or trigger manually)
3. Verify email is received at captain's email address

## Usage

### For Captains
1. Navigate to Captain Dashboard
2. Click "Documents" tab
3. View compliance score and document status
4. Click "Upload" or "Update" on any document card
5. Drag-and-drop or select file to upload
6. OCR automatically extracts expiration dates
7. Monitor renewal timeline for upcoming expirations

### Quick Actions
- **Upload Missing Document**: Click "Upload" button on gray cards
- **Renew Expiring Document**: Click "Update" button on yellow/red cards
- **View Document**: Click eye icon on uploaded documents
- **Download Document**: Click download icon

## Compliance Score Calculation
```
Score = (Valid Documents + Expiring Documents) / Total Required Documents × 100
```

Example:
- 4 valid documents
- 1 expiring document
- 1 expired document
- Total: 6 required documents
- Score: (4 + 1) / 6 × 100 = 83%

## Visual Indicators

### Document Status Colors
- **Green Border**: All documents valid (90%+ compliance)
- **Yellow Border**: Some documents expiring (70-89% compliance)
- **Red Border**: Documents expired or critical (<70% compliance)

### Urgency Badges
- **Valid** (Green): 30+ days remaining
- **Warning** (Yellow): 7-30 days remaining
- **Critical** (Red): Less than 7 days
- **Expired** (Red): Past expiration date

## Integration with OCR
Documents are automatically processed using the `ocr-document-processor` edge function:
- Extracts text from uploaded images/PDFs
- Detects expiration dates automatically
- Validates document type
- Updates document status based on OCR results

## Troubleshooting

### Documents Not Showing
- Verify captain is logged in
- Check captain_documents table for correct captain_id
- Ensure RLS policies allow captain to read own documents

### Emails Not Sending
- Check SendGrid API key is valid
- Verify cron job is running (see logs)
- Ensure captain has valid email address
- Check spam folder

### OCR Not Working
- Verify ocr-document-processor edge function is deployed
- Check image quality (minimum 300 DPI recommended)
- Ensure document text is clearly visible
- Try uploading PDF instead of image

## Best Practices

1. **Upload Documents Early**: Don't wait until expiration
2. **Keep Copies**: Download documents after upload for records
3. **Monitor Timeline**: Check expiration timeline weekly
4. **Update Promptly**: Renew documents as soon as new versions available
5. **Verify OCR**: Double-check extracted expiration dates

## Support
For issues or questions, contact Gulf Coast Charters support at support@gulfcoastcharters.com
