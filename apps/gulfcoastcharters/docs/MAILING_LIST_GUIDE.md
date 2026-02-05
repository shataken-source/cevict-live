# Mailing List System Guide

## Overview
A comprehensive mailing list system allowing public signups via email/phone and admin moderation.

## Features
- Public signup form with email and/or phone
- Dual channel preferences (email + SMS)
- Admin moderation dashboard
- CSV export functionality
- Subscriber status management (active/blocked/unsubscribed)

## Components

### 1. NewsletterSignup Component
**Location**: `src/components/NewsletterSignup.tsx`
**Usage**: Place anywhere on your site for public signups

```tsx
import NewsletterSignup from '@/components/NewsletterSignup';

<NewsletterSignup />
```

### 2. MailingListManager Component
**Location**: `src/components/MailingListManager.tsx`
**Access**: Admin only at `/admin/mailing-list`

## Edge Function

### mailing-list-manager
**Endpoint**: `https://api.databasepad.com/functions/v1/mailing-list-manager`

**Actions**:
- `subscribe` - Add new subscriber
- `list` - Get all subscribers (with filters)
- `update` - Update subscriber status/preferences
- `delete` - Remove subscriber
- `stats` - Get subscriber statistics

## Database Table

The system uses a `mailing_list` table with:
- email (optional if phone provided)
- phone (optional if email provided)
- first_name, last_name
- email_enabled, sms_enabled (preferences)
- status (active/blocked/unsubscribed)
- subscribed_at timestamp

## Admin Features

### Subscriber Management
1. View all subscribers with search/filter
2. Change status (active → blocked, etc.)
3. Delete subscribers
4. Export to CSV

### Statistics Dashboard
- Total subscribers
- Active count
- Email-enabled count
- SMS-enabled count

## Integration with Email Campaigns

Mailing list subscribers can be targeted in email campaigns:
1. Go to Email Campaign Manager
2. Create new campaign
3. Select mailing list as audience
4. Launch campaign

## Best Practices

1. **Double Opt-in**: Consider adding email confirmation
2. **Unsubscribe Links**: Always include in emails
3. **Privacy Policy**: Link to privacy policy on signup
4. **GDPR Compliance**: Store consent timestamps
5. **Regular Cleanup**: Remove bounced emails

## Future Enhancements

- Segmentation by tags/interests
- Automated welcome emails
- Subscriber engagement scoring
- A/B testing for signup forms
- Integration with SMS campaigns
