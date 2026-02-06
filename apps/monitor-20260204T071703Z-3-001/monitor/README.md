# Website Monitor

Multi-website monitoring dashboard with real-time uptime tracking, visitor analytics, bot status monitoring, and AI-powered issue diagnosis.

## Features

- **Multi-Website Monitoring**: Monitor multiple websites from a single dashboard
- **Uptime Tracking**: Real-time status checks with response time metrics
- **Visitor Analytics**: Track unique visitors per day and week
- **Bot Status Monitoring**: Monitor bot health (running/waiting/broken) with color-coded indicators
- **Responsive Design**: Optimized for landscape tablets and 75" TVs
- **Drill-Down Details**: Click any website to see detailed metrics and history
- **AI Chat Assistant**: Claude AI integration for diagnosing and fixing issues
- **SMS Alerts**: Critical alerts sent via SMS (configurable phone number)

## Setup

### 1. Install Dependencies

```bash
cd apps/monitor
pnpm install
```

### 2. Environment Variables

Create `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
ANTHROPIC_API_KEY=your_claude_api_key
NEXT_PUBLIC_BASE_URL=http://localhost:3010  # For worker + server-side SMS callback

# Optional: SMS alerts via Twilio (if unset, alerts are logged only)
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890  # Your Twilio "From" number
```

### 3. Database Setup

Run the migration in Supabase:

```sql
-- Run apps/monitor/supabase/migrations/20250126_website_monitor.sql
```

Or use Supabase CLI:

```bash
cd apps/monitor
supabase migration up
```

### 4. Start Development Server

```bash
pnpm dev
```

The app will be available at `http://localhost:3010`

### Marketing / Public landing page

A marketing page for Website Monitor lives at **`/landing`**. It explains benefits for users with multiple websites, who it's for (freelancers, agencies, indie hackers, teams), and shows three tiers (Free / Pro / Team) with feature comparison. Use it to market the product or as the public face when hosting on cevict.ai (e.g. `cevict.ai/monitor` can show the landing, with "Open dashboard" linking into the app).

## Usage

### Adding Websites

1. Go to the Admin Panel (`/admin`)
2. Click "Add Website"
3. Enter:
   - Website Name
   - URL (must be valid HTTP/HTTPS)
   - Check Interval (seconds, default: 60)
   - Enabled status

### Configuring Alerts

1. In Admin Panel, scroll to "Alert Configuration"
2. Enter your SMS phone number (default: 2562645669)
3. Optionally enter email
4. Toggle "Only send alerts for critical issues"
5. Click "Save Alert Config"

### Monitoring Worker

The monitoring worker checks all enabled websites periodically. Run it as a cron job or background service:

```bash
# Run once
pnpm tsx scripts/monitor-worker.ts

# Or set up a cron job (every 5 minutes)
*/5 * * * * cd /path/to/apps/monitor && pnpm tsx scripts/monitor-worker.ts
```

### Bot Status Updates

Update bot status via API:

```bash
POST /api/bots/status
{
  "websiteId": "uuid",
  "botName": "scraper-bot",
  "status": "running",  # or "waiting" or "broken"
  "errorMessage": null,  # if broken
  "metadata": {}
}
```

### Visitor Tracking

Track visitors via API (integrate with your analytics). `date` defaults to today; upserts by website + date.

```bash
POST /api/visitors/track
{
  "websiteId": "uuid",
  "date": "2025-01-26",       # optional, default today
  "uniqueVisitors": 150,
  "totalVisits": 250          # optional, defaults to uniqueVisitors
}
```

## Dashboard Features

### Main Dashboard

- **Website Cards**: Grid view of all monitored websites
- **Status Indicators**: Color-coded (green=up, red=down, yellow=slow)
- **Quick Stats**: Uptime percentage, response time, visitors today
- **Bot Status**: Visual indicators for each bot (green/yellow/red)

### Detail View

Click any website card to see:
- Detailed uptime statistics
- Response time history
- Visitor trends
- Bot status details
- Error messages

### AI Chat

Click "AI Chat" button to:
- Ask questions about website issues
- Get diagnostic help
- Receive fix suggestions
- Context-aware responses based on selected website

## API Endpoints

- `GET /api/websites` - List all websites
- `POST /api/websites` - Add website
- `PUT /api/websites` - Update website
- `DELETE /api/websites?id=uuid` - Remove website
- `POST /api/monitor/check` - Manually check website
- `GET /api/monitor/stats?websiteId=uuid&period=week` - Get stats
- `GET /api/bots/status?websiteId=uuid` - Get bot statuses
- `POST /api/bots/status` - Update bot status
- `POST /api/ai/chat` - Chat with Claude AI
- `POST /api/visitors/track` - Upsert visitor stats (websiteId, date?, uniqueVisitors, totalVisits?)
- `GET /api/admin/config` - Get alert config
- `POST /api/admin/config` - Update alert config

## Responsive Design

The dashboard uses `clamp()` CSS functions to scale perfectly:
- **Tablet (Landscape)**: Optimized for Samsung tablets
- **75" TV**: Large, readable text and cards
- **Desktop**: Standard responsive layout

## SMS Alerts

SMS alerts are sent when:
- Website goes DOWN (critical)
- Bot status becomes BROKEN (critical)
- Only if "critical_only" is enabled OR severity is critical

Set `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and `TWILIO_PHONE_NUMBER` in `.env.local` to send real SMS; otherwise alerts are logged only.

## Tech Stack

- **Next.js 14** - React framework
- **Supabase** - Database and backend
- **Claude AI** - AI chat assistant
- **Tailwind CSS** - Styling
- **TypeScript** - Type safety
- **Lucide Icons** - Icons

## Development

```bash
# Install
pnpm install

# Dev server
pnpm dev

# Build
pnpm build

# Start production
pnpm start

# Run monitoring worker
pnpm tsx scripts/monitor-worker.ts
```

## License

Part of the CEVICT monorepo.

