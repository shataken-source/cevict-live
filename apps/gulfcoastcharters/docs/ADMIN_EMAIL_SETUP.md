# Admin Email Campaign Setup

## What You Just Got

A complete admin panel for sending email campaigns (T-shirt votes, announcements, etc.) directly from your app.

## Routes Created

- `/admin` - Main admin dashboard
- `/admin/campaigns` - List all email campaigns
- `/admin/campaigns/new` - Create and send new campaign

## Database Tables

Run this migration to create the tables:

```bash
# If using Supabase CLI
supabase db push

# Or apply the migration file manually:
# supabase/migrations/20240128_email_campaigns.sql
```

Tables created:
- `email_campaign_templates` - Reusable templates
- `email_campaigns` - Individual campaigns
- `email_campaign_recipients` - Delivery tracking

## Environment Variables Needed

Add these to your `.env.local`:

```bash
# Resend API Key (get from resend.com)
RESEND_API_KEY=re_your_api_key_here

# Email sending configuration
RESEND_FROM_EMAIL="Gulf Coast Charters <noreply@yourdomain.com>"
RESEND_REPLY_TO="shataken@gmail.com"

# Supabase service role key (for admin operations)
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# App URL (for internal API calls)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## How to Get a Resend API Key

1. Go to https://resend.com
2. Sign up for free account (100 emails/day free tier)
3. Verify your domain OR use their test domain for now
4. Go to API Keys section
5. Create new API key
6. Copy it to `.env.local` as `RESEND_API_KEY`

## How to Use

### Send T-Shirt Vote Email

1. Start dev server: `npm run dev`
2. Go to: `http://localhost:3000/admin/campaigns/new`
3. Template dropdown already has "T-Shirt Vote" selected
4. Add recipients in the box (comma-separated):
   ```
   shataken@gmail.com, friend@example.com
   ```
5. Click "Send Now"
6. Emails go out immediately via Resend

### Create Custom Campaign

1. Go to `/admin/campaigns/new`
2. Select "Custom Email" from template dropdown
3. Fill in:
   - Campaign name
   - Subject
   - Body (use `{name}` and `{email}` for personalization)
   - Recipients
4. Click "Send Now" or "Schedule for Later"

### View Campaign History

1. Go to `/admin/campaigns`
2. See all campaigns with:
   - Status (draft, sending, sent, failed)
   - Recipient count
   - Sent count
   - Creation date

## Features

- ✅ Pre-built T-shirt vote template
- ✅ Personalization with `{name}` and `{email}`
- ✅ Delivery tracking (sent, failed, pending)
- ✅ Campaign stats (total, sent, failed counts)
- ✅ Admin-only access (RLS policies)
- ✅ Resend integration for reliable delivery

## Next Steps (Optional)

1. **Add authentication check** - Right now admin routes are open; add auth middleware
2. **Schedule campaigns** - Wire up the "Schedule for Later" button
3. **Track opens/clicks** - Add tracking pixels and link wrappers
4. **Import user lists** - Add button to import all users/captains from DB
5. **Email templates builder** - Visual editor instead of plain text

## Testing

To test without sending real emails:

1. Use Resend's test mode (check their docs)
2. Or comment out the `resend.emails.send()` call in:
   `src/pages/api/admin/campaigns/[id]/send.ts`
3. Just update recipient status to 'sent' for testing

## Troubleshooting

**"Cannot find module 'resend'"**
- Run: `npm install resend`

**"Campaign not found"**
- Make sure you ran the migration to create tables

**"Failed to send"**
- Check your `RESEND_API_KEY` is set correctly
- Check Resend dashboard for error logs
- Verify sender email is verified in Resend

**Emails not arriving**
- Check spam folder
- Verify recipient email is valid
- Check Resend dashboard for delivery status
