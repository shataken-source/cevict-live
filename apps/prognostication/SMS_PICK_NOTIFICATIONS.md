# SMS Pick Notifications System

## Overview
This system sends SMS notifications every time Progno makes a pick, including all bet information (confidence, game time/date, line when bet was predicted, etc.). It also provides a daily summary of free/pro/elite picks.

## Features

### 1. Real-time Pick Notifications
- Automatically sends SMS when Progno creates a new pick
- Includes comprehensive bet information:
  - Game matchup
  - Pick recommendation
  - Confidence percentage
  - Edge percentage
  - Odds (home/away)
  - Spread
  - Total
  - Game time and date
  - Predicted score
  - Recommended wager amount
  - Bet reasoning

### 2. Daily Summary
- Sends a formatted SMS summary of all picks for the day
- Organized by tier (Free, Pro, Elite)
- Includes all pick details for each tier

## Setup

### Environment Variables Required

**In Prognostication:**
- `ADMIN_PHONE_NUMBER` - Your phone number (e.g., +1234567890)
- `SINCH_SERVICE_PLAN_ID` - Sinch SMS service plan ID
- `SINCH_API_TOKEN` - Sinch API token
- `SINCH_FROM_NUMBER` - Sinch from phone number
- `NEXT_PUBLIC_SITE_URL` - Your site URL

**In Progno:**
- `PROGNOSTICATION_URL` or `NEXT_PUBLIC_PROGNOSTICATION_URL` - URL of Prognostication app
- `ADMIN_PHONE_NUMBER` - Same phone number as above

### Deployment

1. Run the deploy script:
```powershell
cd apps/prognostication
.\DEPLOY.ps1
```

2. The script will:
   - Check for required environment variables
   - Prompt for your phone number
   - Attempt to add `ADMIN_PHONE_NUMBER` to Vercel automatically
   - Build and deploy the application

3. Manually add any missing environment variables in Vercel dashboard if needed

## API Endpoints

### 1. Notify Pick (Automatic)
**Endpoint:** `POST /api/sms/notify-pick`

This is automatically called by Progno when a pick is saved. You can also call it manually:

```json
{
  "phoneNumber": "+1234567890",
  "game": "Dallas Cowboys @ New York Giants",
  "homeTeam": "New York Giants",
  "awayTeam": "Dallas Cowboys",
  "pick": "Dallas Cowboys -3.5",
  "confidence": 75,
  "edge": 5.2,
  "odds": {
    "home": -110,
    "away": -110
  },
  "spread": -3.5,
  "total": 45.5,
  "gameTime": "2024-01-15T20:00:00Z",
  "sport": "NFL",
  "league": "NFL",
  "recommendedWager": 50,
  "betReasoning": "Strong statistical edge based on recent form",
  "predictedScore": {
    "home": 17,
    "away": 24
  }
}
```

### 2. Daily Summary
**Endpoint:** `POST /api/sms/daily-summary-image`

Get a formatted summary of all picks for the day:

```json
{
  "phoneNumber": "+1234567890"
}
```

Response includes:
- Count of picks per tier
- All pick details organized by tier

## Integration

The system is automatically integrated into Progno's prediction engine. When `savePrediction()` is called in `apps/progno/app/lib/progno-db.ts`, it automatically:

1. Checks if it's a sports prediction
2. Checks if `ADMIN_PHONE_NUMBER` and `PROGNOSTICATION_URL` are configured
3. Calls the Prognostication SMS notification endpoint
4. Sends SMS with all pick details

## Testing

1. **Test Pick Notification:**
```bash
curl -X POST https://your-site.com/api/sms/notify-pick \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+1234567890",
    "game": "Test Game",
    "pick": "Test Pick",
    "confidence": 75,
    "edge": 5
  }'
```

2. **Test Daily Summary:**
```bash
curl -X POST https://your-site.com/api/sms/daily-summary-image \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+1234567890"
  }'
```

## Cron Jobs

Add to `vercel.json` for automatic daily summaries:

```json
{
  "crons": [
    {
      "path": "/api/sms/daily-summary-image",
      "schedule": "0 9 * * *"
    }
  ]
}
```

Note: Cron jobs need to pass `phoneNumber` in the request body, so you may need a wrapper endpoint.

## Troubleshooting

1. **No SMS received:**
   - Check `ADMIN_PHONE_NUMBER` is set correctly
   - Verify Sinch credentials are correct
   - Check Vercel logs for errors

2. **Notifications not triggering:**
   - Verify `PROGNOSTICATION_URL` is set in Progno
   - Check that `savePrediction()` is being called
   - Review Progno logs for SMS notification errors

3. **Daily summary not working:**
   - Ensure `/api/picks/today` endpoint is working
   - Check that phone number is provided in request

## Notes

- SMS notifications are sent asynchronously and won't block prediction saving
- If SMS fails, the prediction is still saved (non-blocking)
- All phone numbers must be in E.164 format (e.g., +1234567890)


