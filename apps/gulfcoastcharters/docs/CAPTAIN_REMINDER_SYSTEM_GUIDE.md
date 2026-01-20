# Captain Reminder System - Complete Setup Guide

## Overview
Automated email system that sends reminders to captains for:
1. **Document Expiration**: 30, 14, and 7 days before documents expire
2. **Profile Updates**: Every 90 days if profile hasn't been updated

## Features
✅ Automatic document expiration warnings (USCG License, Insurance, Certifications)
✅ Profile update reminders to keep information current
✅ Beautiful HTML email templates with direct action links
✅ Tracks reminder history to prevent duplicate emails
✅ Configurable reminder intervals
✅ Admin dashboard to monitor reminder status

## Database Setup

Run the migration:
```bash
supabase migration up 20240123_captain_reminders
```

This creates:
- `captain_profile_updates` - Tracks when captains update their profiles
- `captain_profile_reminders` - Logs all reminders sent
- Adds `last_reminder_sent_at` and `reminder_count` to `captain_documents`

## Edge Functions to Deploy

### 1. Document Expiration Reminder Function

**Function Name**: `document-expiration-reminder`

**Deploy Command**:
```bash
supabase functions deploy document-expiration-reminder
```

**Code** (`supabase/functions/document-expiration-reminder/index.ts`):
```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

serve(async (req) => {
  const supabase = createClient(SUPABASE_URL!, SERVICE_KEY!)
  const targetDays = [30, 14, 7]
  const reminders = []
  
  for (const days of targetDays) {
    const targetDate = new Date()
    targetDate.setDate(targetDate.getDate() + days)
    const dateStr = targetDate.toISOString().split('T')[0]
    
    const { data: docs } = await supabase.from('captain_documents')
      .select('*, captains:captain_id(email, full_name)')
      .gte('expiry_date', dateStr).lt('expiry_date', `${dateStr}T23:59:59`)
      .or(`last_reminder_sent_at.is.null,last_reminder_sent_at.lt.${new Date(Date.now()-86400000).toISOString()}`)
    
    for (const doc of docs || []) {
      await sendEmail(doc, days)
      await supabase.from('captain_documents').update({
        last_reminder_sent_at: new Date().toISOString(), reminder_count: (doc.reminder_count || 0) + 1
      }).eq('id', doc.id)
      reminders.push(doc)
    }
  }
  
  return new Response(JSON.stringify({ success: true, sent: reminders.length }))
})
```

### 2. Profile Update Reminder Function

**Function Name**: `profile-update-reminder`

**Code** (`supabase/functions/profile-update-reminder/index.ts`):
```typescript
// Similar structure, checks captain_profile_updates for last update > 90 days
```

## Cron Job Setup

### GitHub Actions (Recommended)
Create `.github/workflows/captain-reminders.yml`:

```yaml
name: Captain Reminders

on:
  schedule:
    - cron: '0 9 * * *'  # Daily at 9 AM UTC
  workflow_dispatch:

jobs:
  send-reminders:
    runs-on: ubuntu-latest
    steps:
      - name: Document Expiration Reminders
        run: |
          curl -X POST ${{ secrets.SUPABASE_URL }}/functions/v1/document-expiration-reminder \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_ANON_KEY }}"
      
      - name: Profile Update Reminders
        run: |
          curl -X POST ${{ secrets.SUPABASE_URL }}/functions/v1/profile-update-reminder \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_ANON_KEY }}"
```

## Email Templates
Located in `src/components/email-templates/`:
- `DocumentExpirationEmail.tsx` - Document expiration warnings
- `ProfileUpdateReminderEmail.tsx` - Profile update prompts

## Testing
1. Create test document expiring in 30 days
2. Manually trigger function
3. Check email delivery
4. Verify database tracking updated

## Monitoring
Admin panel shows:
- Upcoming expirations
- Reminder history
- Email delivery status
- Captain compliance rates
