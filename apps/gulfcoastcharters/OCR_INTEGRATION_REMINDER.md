# OCR Document Processing & Captain Document Management

## Overview
The system now includes comprehensive captain document management with OCR processing, renewal reminders, push notifications, and email capabilities.

## Components Created

### 1. ComprehensiveDocumentManager.tsx
- Upload any document type (USCG License, Insurance, Certifications, etc.)
- OCR processing via Google Cloud Vision API
- Automatic field extraction from scanned documents
- Email documents to captain
- Download documents
- Delete documents
- Expiration date tracking
- Renewal reminders (30 days before expiration)

### 2. Edge Functions

#### ocr-document-processor
- Uses Google Cloud Vision API (GOOGLE_CLOUD_VISION_API_KEY)
- Extracts text from uploaded documents
- Parses fields based on document type:
  - USCG License: license number, expiration date
  - Insurance: policy number, effective date
  - Boat Registration: registration number

#### document-renewal-reminders
- Checks documents for upcoming expirations
- Sends email reminders at 30, 14, 7, 3, 1 days before expiration
- Uses SendGrid for email notifications

### 3. Push Notifications (pushNotifications.ts)
- Browser push notification support
- Service worker integration
- Permission management
- Subscription storage

## Usage in Mobile Captain Dashboard

Add to MobileCaptainDashboard.tsx:
```tsx
import ComprehensiveDocumentManager from '@/components/ComprehensiveDocumentManager';

// In the tabs section, add:
<TabsContent value="documents">
  <ComprehensiveDocumentManager />
</TabsContent>
```

## Document Types Supported
- USCG License
- Insurance Policy
- Boat Registration
- Safety Certificate
- First Aid Certification
- CPR Certification
- Medical Certificate
- Drug Test Results
- Background Check
- Business License
- Tax Documents
- Other (custom)

## Features
✅ Upload/Edit/Delete any document
✅ OCR text extraction
✅ Auto-fill forms from scanned documents
✅ Email copies of documents
✅ Expiration tracking
✅ Renewal reminders (email)
✅ Push notifications (browser)
✅ Offline document access (PWA)

## Integration Steps
1. Component already created: ComprehensiveDocumentManager.tsx
2. Edge functions deployed: ocr-document-processor, document-renewal-reminders
3. Add to captain dashboard tabs
4. Test OCR by uploading a license or insurance document
5. Set expiration dates to test reminders

## API Keys Required
- GOOGLE_CLOUD_VISION_API_KEY (already configured)
- SENDGRID_API_KEY (already configured)
