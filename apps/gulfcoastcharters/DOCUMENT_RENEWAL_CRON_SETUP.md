# Document Renewal Workflow Setup Guide

## Overview
Streamlined document renewal system with one-click upload from reminder emails, automatic OCR extraction, and instant verification.

## Features
✅ Secure tokenized renewal links (7-day expiration)
✅ Drag-and-drop document upload
✅ Automatic OCR extraction (expiration dates, document numbers)
✅ Real-time verification status updates
✅ Beautiful email templates with direct renewal links

## Database Tables

### document_renewal_tokens
Stores secure tokens for email renewal links:
- `id`: UUID primary key
- `user_id`: References auth.users
- `token`: Unique secure token
- `document_type`: Type of document (license, insurance, etc.)
- `expires_at`: Token expiration (7 days default)
- `used_at`: Timestamp when token was used
- `created_at`: Creation timestamp

### document_ocr_data
Stores OCR extracted data:
- `id`: UUID primary key
- `user_id`: References auth.users
- `document_type`: Type of document
- `extracted_data`: JSONB with full OCR results
- `confidence_score`: OCR confidence (0-1)
- `expiration_date`: Extracted expiration date
- `document_number`: Extracted document number
- `issuing_authority`: Extracted issuing authority
- `created_at`: Creation timestamp

## Edge Functions

### 1. ocr-document-processor
Processes uploaded documents using Google Cloud Vision API.

**Endpoint**: `/functions/v1/ocr-document-processor`

**Request**:
```json
{
  "imageBase64": "base64_encoded_image",
  "documentType": "USCG License",
  "userId": "user-uuid"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "fullText": "extracted text...",
    "expirationDate": "12/31/2025",
    "documentNumber": "ABC123456",
    "confidence": 0.95
  }
}
```

### 2. document-renewal-reminders
Generates and verifies renewal tokens.

**Actions**:

**Generate Token**:
```json
{
  "action": "generate_token",
  "userId": "user-uuid",
  "documentType": "USCG License",
  "email": "captain@example.com"
}
```

**Verify Token**:
```json
{
  "action": "verify_token",
  "token": "renewal-token-uuid"
}
```

## Email Template Usage

```typescript
import { DocumentExpirationEmail } from '@/components/email-templates/DocumentExpirationEmail';

// Generate renewal token first
const { data } = await supabase.functions.invoke('document-renewal-reminders', {
  body: {
    action: 'generate_token',
    userId: captain.id,
    documentType: 'USCG License'
  }
});

// Send email with renewal URL
<DocumentExpirationEmail
  captainName="John Smith"
  documentType="USCG License"
  expirationDate="2025-12-31"
  daysUntilExpiration={14}
  renewalUrl={data.renewalUrl}
/>
```

## User Flow

1. **Captain receives email** with expiring document notice
2. **Clicks "Renew Document Now"** button in email
3. **Redirected to /renew-document?token=xxx**
4. **Token verified** (checks expiration and usage)
5. **Drag & drop document** or click to select file
6. **OCR processes document** automatically
7. **Expiration date extracted** and displayed
8. **Captain confirms upload**
9. **Verification status updated** instantly
10. **Redirected to dashboard** with success message

## GitHub Actions Integration

The existing `.github/workflows/captain-reminders.yml` workflow sends daily reminders. Update it to generate renewal tokens:

```yaml
# In the workflow, call the edge function to generate tokens
- name: Send Document Reminders
  run: |
    curl -X POST https://your-project.supabase.co/functions/v1/send-reminders \
      -H "Authorization: Bearer ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}"
```

## Testing

### Test OCR Processing
```bash
# Upload a test document image
curl -X POST https://your-project.supabase.co/functions/v1/ocr-document-processor \
  -H "Content-Type: application/json" \
  -d '{"imageBase64": "..."}'
```

### Test Token Generation
```bash
curl -X POST https://your-project.supabase.co/functions/v1/document-renewal-reminders \
  -H "Content-Type: application/json" \
  -d '{"action": "generate_token", "userId": "...", "documentType": "USCG License"}'
```

## Security Features

✅ Tokens expire after 7 days
✅ Tokens can only be used once
✅ User must be authenticated to upload
✅ RLS policies protect all data
✅ OCR data stored separately for audit trail

## Next Steps

1. Configure Google Cloud Vision API key in Supabase secrets
2. Update email sending service to use new template
3. Test renewal flow end-to-end
4. Monitor OCR accuracy and adjust patterns
5. Add admin dashboard for OCR review queue
