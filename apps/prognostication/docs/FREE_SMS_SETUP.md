# Free SMS Daily Best Bet Setup

This feature allows free users to sign up for SMS alerts and receive an exclusive daily best bet that's not available on the website.

## Features

- ✅ Free SMS signup form on homepage
- ✅ Daily best bet selection (excludes picks already on website)
- ✅ Automated daily SMS delivery
- ✅ Supabase database storage
- ✅ SMS logging and tracking

## Database Setup

1. Run the migration SQL in your Supabase database:

```sql
-- See migrations/create-sms-tables.sql
```

Or run it via Supabase dashboard:
- Go to SQL Editor
- Copy and paste the contents of `migrations/create-sms-tables.sql`
- Execute

## Environment Variables

Make sure these are set in your `.env.local`:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# SMS Service (Sinch)
SINCH_SERVICE_PLAN_ID=your_service_plan_id
SINCH_API_TOKEN=your_api_token
SINCH_FROM_NUMBER=your_from_number

# Progno API
PROGNO_BASE_URL=http://localhost:3008

# Site URL
NEXT_PUBLIC_SITE_URL=https://prognostication.com

# Admin Password (for API security)
ADMIN_PASSWORD=your_admin_password
# OR
PROGNOSTICATION_ADMIN_PASSWORD=your_admin_password
```

## How It Works

### 1. User Signup
- Users visit the homepage
- See the "Get FREE Daily Best Bet via SMS" section
- Enter phone number with country code (e.g., +1234567890)
- Subscription stored in `sms_subscriptions` table

### 2. Daily Best Bet Selection
The system:
- Fetches all picks from Progno
- Gets picks already allocated to free/pro/elite tiers (from `/api/picks/today`)
- Filters out those picks
- Selects the best remaining pick (by quality score: edge * 2.5 + confidence)
- This ensures the SMS bet is exclusive and not on the website

### 3. Daily SMS Delivery
- Runs daily (via cron or scheduled task)
- Sends the best exclusive bet to all active free subscribers
- Logs all sends in `sms_sent_logs` table

## Running the Daily Job

### Option 1: Via Script
```bash
cd apps/prognostication
pnpm send-daily-best-bet
```

### Option 2: Via API (for cron jobs)
```bash
curl -X POST https://prognostication.com/api/sms/send-daily-best-bet \
  -H "Authorization: Bearer YOUR_ADMIN_PASSWORD"
```

### Option 3: Cron Job (Linux/Mac)
Add to crontab:
```bash
# Run daily at 9 AM
0 9 * * * cd /path/to/apps/prognostication && pnpm send-daily-best-bet
```

### Option 4: Vercel Cron
Add to `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/sms/send-daily-best-bet",
      "schedule": "0 9 * * *"
    }
  ]
}
```

## API Endpoints

### POST `/api/sms/subscribe-free`
Subscribe a phone number to free SMS bets.

**Request:**
```json
{
  "phoneNumber": "+1234567890"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Successfully subscribed to free SMS bets"
}
```

### POST `/api/sms/send-daily-best-bet`
Send daily best bet to all free subscribers (requires admin auth).

**Headers:**
```
Authorization: Bearer YOUR_ADMIN_PASSWORD
```

**Response:**
```json
{
  "success": true,
  "message": "Daily best bet sent to 42 subscribers",
  "sent": 42,
  "errors": 0,
  "bestBet": {
    "game": "Miami Heat @ Atlanta Hawks",
    "pick": "Miami Heat -3.3",
    "confidence": 78,
    "edge": 12.5
  }
}
```

## Database Tables

### `sms_subscriptions`
Stores phone number subscriptions.

Columns:
- `id` (UUID)
- `phone_number` (TEXT)
- `tier` (TEXT: 'free', 'pro', 'elite')
- `active` (BOOLEAN)
- `subscribed_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)
- `unsubscribed_at` (TIMESTAMPTZ)

### `sms_sent_logs`
Logs all SMS sends for tracking.

Columns:
- `id` (UUID)
- `tier` (TEXT)
- `message_type` (TEXT)
- `pick_game_id` (TEXT)
- `pick_game` (TEXT)
- `pick` (TEXT)
- `sent_count` (INTEGER)
- `error_count` (INTEGER)
- `sent_at` (TIMESTAMPTZ)

## Unsubscribing

Users can unsubscribe by:
1. Replying "STOP" to the SMS (requires SMS service support)
2. Contacting support
3. Admin can deactivate in database: `UPDATE sms_subscriptions SET active = false WHERE phone_number = '+1234567890'`

## Testing

1. **Test signup:**
   ```bash
   curl -X POST http://localhost:3005/api/sms/subscribe-free \
     -H "Content-Type: application/json" \
     -d '{"phoneNumber": "+1234567890"}'
   ```

2. **Test daily send (manual):**
   ```bash
   curl -X POST http://localhost:3005/api/sms/send-daily-best-bet \
     -H "Authorization: Bearer YOUR_ADMIN_PASSWORD"
   ```

## Troubleshooting

- **No picks available**: Check `PROGNO_BASE_URL` is set and Progno API is accessible
- **SMS not sending**: Verify Sinch credentials are correct
- **Database errors**: Ensure migration SQL has been run
- **All picks already allocated**: The system will log a warning if no exclusive picks are available

