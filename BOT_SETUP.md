# Daily Bot Setup Guide

This guide explains how to set up and configure the daily bot that keeps your SmokersRights application current with the latest laws and data.

## Overview

The daily bot performs the following tasks:
- **Law Updates**: Fetches new smoking laws and regulations from external sources
- **Data Cleanup**: Removes old/expired data to optimize performance
- **Notifications**: Sends alerts to users about law changes
- **Analytics**: Updates usage statistics and generates reports

## Environment Variables

Add these to your `.env.local` file:

```bash
# Bot Configuration
BOT_API_KEY=your-secret-bot-key-here
BOT_URL=https://your-domain.com/api/bot/run

# External API Keys (for law sources)
LEGISLATION_API_KEY=your-legislation-api-key
CDC_API_KEY=your-cdc-api-key
PHLC_API_KEY=your-public-health-law-center-api-key

# Existing variables (required for bot operations)
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
STRIPE_SECRET_KEY=your-stripe-secret-key
SINCH_API_TOKEN=your-sinch-api-token
SINCH_SERVICE_PLAN_ID=your-sinch-service-plan-id
EMAIL_HOST=your-email-host
EMAIL_PORT=587
EMAIL_USER=your-email-user
EMAIL_PASS=your-email-password
EMAIL_FROM=your-email-address
```

## Setup Options

### Option 1: Cron Job (Recommended for Production)

1. **Copy the cron example:**
   ```bash
   cp crontab.example ~/smokersrights-crontab
   ```

2. **Edit the file with your paths:**
   ```bash
   # Change /path/to/your/app to your actual application path
   # Update the BOT_URL to your production URL
   # Set the correct BOT_API_KEY
   ```

3. **Install the cron job:**
   ```bash
   crontab ~/smokersrights-crontab
   ```

4. **Verify installation:**
   ```bash
   crontab -l
   ```

### Option 2: GitHub Actions (Recommended for Cloud Deployments)

1. **Add secrets to your GitHub repository:**
   - Go to Settings → Secrets and variables → Actions
   - Add all the environment variables from above as secrets

2. **The workflow is already configured** in `.github/workflows/daily-bot.yml`

3. **Test the workflow:**
   - Go to Actions → Daily Bot Run
   - Click "Run workflow" to test manually

### Option 3: Manual/Scheduled Execution

1. **Run the bot manually:**
   ```bash
   node scripts/runBot.js
   ```

2. **Check bot status:**
   ```bash
   node scripts/runBot.js status
   ```

3. **Run with custom configuration:**
   ```bash
   BOT_API_KEY=your-key node scripts/runBot.js
   ```

## Database Setup

1. **Run the migration:**
   ```bash
   # Apply the bot tables migration
   supabase db push
   ```

2. **Verify tables were created:**
   ```sql
   -- Check bot tables exist
   SELECT table_name FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name LIKE 'bot_%' OR table_name LIKE 'daily_%' OR table_name LIKE 'analytics_%';
   ```

## Monitoring

### Bot Status API

Check the bot status via API:

```bash
curl -H "Authorization: Bearer your-bot-api-key" \
     https://your-domain.com/api/bot/run
```

### Database Queries

Monitor bot performance:

```sql
-- Recent bot runs
SELECT * FROM bot_run_logs 
ORDER BY run_date DESC 
LIMIT 10;

-- Success rate over last 30 days
SELECT 
  COUNT(*) as total_runs,
  COUNT(*) FILTER (WHERE success = true) as successful_runs,
  ROUND(COUNT(*) FILTER (WHERE success = true) * 100.0 / COUNT(*), 2) as success_rate
FROM bot_run_logs 
WHERE run_date >= CURRENT_DATE - INTERVAL '30 days';

-- Bot status dashboard
SELECT * FROM bot_status_dashboard;
```

### Logs

Check bot logs:

```bash
# If using cron
tail -f /var/log/smokersrights-bot.log

# If using GitHub Actions
# Check the Actions tab in your GitHub repository
```

## Configuration Options

The bot can be configured with these options:

```javascript
const config = {
  enableLawUpdates: true,      // Fetch new laws
  enableDataCleanup: true,     // Clean old data
  enableNotifications: true,   // Send user notifications
  enableAnalytics: true,       // Update analytics
  logLevel: 'info'            // debug, info, warn, error
};
```

## Troubleshooting

### Common Issues

1. **Bot fails with "Unauthorized"**
   - Check BOT_API_KEY matches between client and server
   - Verify the Authorization header format

2. **Law updates not working**
   - Check external API keys are valid
   - Verify network connectivity to external sources
   - Check bot logs for specific error messages

3. **Notifications not sending**
   - Verify email/SMS service credentials
   - Check user notification preferences
   - Review notification service logs

4. **Database errors**
   - Ensure migration was applied
   - Check database permissions
   - Verify service role key has proper access

### Debug Mode

Run the bot in debug mode for detailed logging:

```bash
NODE_ENV=development node scripts/runBot.js
```

### Test Mode

Run with minimal operations for testing:

```bash
curl -X POST https://your-domain.com/api/bot/run \
  -H "Authorization: Bearer your-bot-api-key" \
  -H "Content-Type: application/json" \
  -d '{"config": {"enableLawUpdates": false, "enableDataCleanup": false, "enableNotifications": false, "enableAnalytics": true, "logLevel": "debug"}}'
```

## Security Considerations

1. **API Key Security:**
   - Use a strong, random BOT_API_KEY
   - Never commit API keys to version control
   - Rotate keys periodically

2. **Database Security:**
   - Use service role key for bot operations
   - Enable Row Level Security on bot tables
   - Limit bot database permissions

3. **Network Security:**
   - Use HTTPS for all API calls
   - Consider IP whitelisting for bot endpoints
   - Monitor for unusual bot activity

## Performance Optimization

1. **Batch Processing:**
   - Process notifications in batches
   - Use database transactions for bulk operations
   - Implement rate limiting for external APIs

2. **Scheduling:**
   - Run during off-peak hours (2:00 AM recommended)
   - Stagger different bot operations
   - Consider timezone distribution for global users

3. **Monitoring:**
   - Set up alerts for bot failures
   - Monitor execution time trends
   - Track success rates and error patterns

## Maintenance

1. **Regular Tasks:**
   - Review bot logs weekly
   - Update external API credentials as needed
   - Monitor storage usage and cleanup old logs

2. **Updates:**
   - Keep bot dependencies updated
   - Review and update external API endpoints
   - Test bot after application updates

3. **Scaling:**
   - Consider multiple bot instances for high volume
   - Implement queue system for notifications
   - Add caching for frequently accessed data
