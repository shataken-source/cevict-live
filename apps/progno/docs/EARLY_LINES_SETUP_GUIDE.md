# Early Lines System - Setup & Deployment Guide

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Quick Start](#quick-start)
3. [Detailed Setup](#detailed-setup)
4. [Configuration](#configuration)
5. [Testing](#testing)
6. [Deployment](#deployment)
7. [Maintenance](#maintenance)

---

## Prerequisites

### Required
- **Node.js**: 18.0.0 or higher
- **npm**: 10.0.0 or higher
- **Next.js**: 15.0.0 or higher (already in Progno)
- **The Odds API Key**: Free tier (500 requests/month)

### Optional
- **Supabase Account**: For historical data storage
- **Vercel Account**: For production deployment
- **Slack Webhook**: For arb alerts

---

## Quick Start

### 1. Get API Key

Visit https://the-odds-api.com/ and sign up for a free account:

1. Click "Get API Key"
2. Sign up with email
3. Verify email
4. Copy your API key

### 2. Add to Environment

Open `apps/progno/.env.local` and add:

```bash
THE_ODDS_API_KEY=your_api_key_here
```

### 3. Start Server

```bash
cd apps/progno
npm run dev
```

### 4. Test API

```bash
curl "http://localhost:3008/api/early-lines/analysis?sports=NBA"
```

You should see JSON response with early odds, injuries, and news.

### 5. Access Admin Dashboard

1. Open browser: `http://localhost:3008/progno/admin`
2. Click **"EARLY LINES"** tab
3. Enter sports: `NBA,NFL,NCAAB`
4. Click **"Fetch Early Lines"**

---

## Detailed Setup

### Step 1: Verify Installation

Check that all files are in place:

```bash
# Core library files
ls apps/progno/app/lib/early-odds-aggregator.ts
ls apps/progno/app/lib/injury-news-tracker.ts
ls apps/progno/app/lib/line-move-arb-detector.ts
ls apps/progno/app/lib/odds-sources/the-odds-api.ts

# API endpoint
ls apps/progno/app/api/early-lines/analysis/route.ts

# Admin component
ls apps/progno/components/admin/EarlyLinesSection.tsx

# Documentation
ls apps/progno/docs/EARLY_LINES_*.md
```

All files should exist. If any are missing, check the git commit history.

### Step 2: Install Dependencies

All dependencies should already be installed, but verify:

```bash
cd apps/progno
npm install
```

No additional packages are required - the system uses built-in Next.js and Node.js features.

### Step 3: Configure Environment Variables

Create or edit `apps/progno/.env.local`:

```bash
# Required: The Odds API
THE_ODDS_API_KEY=your_key_here

# Alternative names (fallback)
ODDS_API_KEY_2=your_key_here
ODDS_API_KEY=your_key_here

# Optional: For future enhancements
NEWS_API_KEY=your_news_api_key
OPENWEATHER_API_KEY=your_weather_api_key
SLACK_WEBHOOK_URL=your_slack_webhook_url
```

**Important**: The system checks for API keys in this order:
1. `THE_ODDS_API_KEY`
2. `ODDS_API_KEY_2`
3. `ODDS_API_KEY`

Use at least one of these.

### Step 4: Verify API Key

Test your API key directly:

```bash
curl "https://api.the-odds-api.com/v4/sports/?apiKey=YOUR_KEY_HERE"
```

Expected response:
```json
[
  {
    "key": "americanfootball_nfl",
    "group": "American Football",
    "title": "NFL",
    "description": "US Football",
    "active": true,
    "has_outrights": false
  },
  ...
]
```

Check the response headers for quota:
```bash
curl -I "https://api.the-odds-api.com/v4/sports/?apiKey=YOUR_KEY_HERE"
```

Look for:
- `x-requests-remaining`: How many requests left this month
- `x-requests-used`: How many used so far

### Step 5: Start Development Server

```bash
cd apps/progno
npm run dev
```

Expected output:
```
> progno@0.1.0 dev
> next dev -p 3008

  ▲ Next.js 15.x.x
  - Local:        http://localhost:3008
  - Network:      http://192.168.x.x:3008

 ✓ Ready in 2.5s
```

### Step 6: Test API Endpoint

**Test 1: Basic fetch**
```bash
curl "http://localhost:3008/api/early-lines/analysis?sports=NBA"
```

Expected: JSON with `success: true` and early odds data.

**Test 2: Multiple sports**
```bash
curl "http://localhost:3008/api/early-lines/analysis?sports=NFL,NBA,NCAAB"
```

Expected: More games across multiple sports.

**Test 3: Fast mode (no injuries/news)**
```bash
curl "http://localhost:3008/api/early-lines/analysis?sports=NBA&includeInjuries=false&includeNews=false"
```

Expected: Faster response (~5 seconds vs ~30 seconds).

### Step 7: Test Admin Dashboard

1. Open browser: `http://localhost:3008/progno/admin`
2. You should see tabs: LIVE ODDS, PICKS, RESULTS, LINE MOVES, **EARLY LINES**, ANALYZER, CONFIG
3. Click **EARLY LINES** tab
4. Enter sports: `NBA`
5. Click **Fetch Early Lines**
6. Wait 10-30 seconds
7. You should see:
   - Summary stats (games, injuries, news)
   - Early odds cards with moneyline, spread, totals
   - Injury report with impact badges
   - Breaking news with odds impact badges

---

## Configuration

### Sports Configuration

Edit the sports list in the admin UI or API call:

**Supported Sports**:
- `NFL` - National Football League
- `NCAAF` - College Football
- `NBA` - National Basketball Association
- `NCAAB` - College Basketball
- `MLB` - Major League Baseball
- `NHL` - National Hockey League

**Example**:
```bash
# Single sport
curl "http://localhost:3008/api/early-lines/analysis?sports=NBA"

# Multiple sports
curl "http://localhost:3008/api/early-lines/analysis?sports=NFL,NBA,NCAAB"

# All sports
curl "http://localhost:3008/api/early-lines/analysis?sports=NFL,NCAAF,NBA,NCAAB,MLB,NHL"
```

### Days Ahead Configuration

Control how far ahead to look for early odds:

```bash
# 3 days ahead (default)
curl "http://localhost:3008/api/early-lines/analysis?sports=NBA&daysAhead=3"

# 5 days ahead
curl "http://localhost:3008/api/early-lines/analysis?sports=NBA&daysAhead=5"

# 7 days ahead
curl "http://localhost:3008/api/early-lines/analysis?sports=NBA&daysAhead=7"
```

**Recommendation**: Use 3-5 days for best results. Too far ahead may have fewer odds available.

### Performance Configuration

**Fast mode** (odds only):
```bash
curl "http://localhost:3008/api/early-lines/analysis?sports=NBA&includeInjuries=false&includeNews=false"
```

**Full mode** (all data):
```bash
curl "http://localhost:3008/api/early-lines/analysis?sports=NBA&includeInjuries=true&includeNews=true"
```

### Caching Configuration

Add caching to reduce API calls:

Edit `apps/progno/app/api/early-lines/analysis/route.ts`:

```typescript
// Add at top of file
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// In GET handler, before fetching data:
const cacheKey = `${sports}-${daysAhead}`;
const cached = cache.get(cacheKey);

if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
  return NextResponse.json(cached.data);
}

// After fetching data, before returning:
cache.set(cacheKey, { data: responseData, timestamp: Date.now() });
```

---

## Testing

### Manual Testing

**Test 1: API Endpoint**
```bash
# Should return success: true
curl "http://localhost:3008/api/early-lines/analysis?sports=NBA" | jq '.success'

# Should return number > 0
curl "http://localhost:3008/api/early-lines/analysis?sports=NBA" | jq '.summary.earlyGames'

# Should return array of odds
curl "http://localhost:3008/api/early-lines/analysis?sports=NBA" | jq '.data.earlyOdds | length'
```

**Test 2: Admin Dashboard**
1. Navigate to `http://localhost:3008/progno/admin`
2. Click EARLY LINES tab
3. Enter `NBA,NFL`
4. Click Fetch Early Lines
5. Verify data appears

**Test 3: Error Handling**
```bash
# Invalid API key (should return error)
THE_ODDS_API_KEY=invalid npm run dev
curl "http://localhost:3008/api/early-lines/analysis?sports=NBA"
# Expected: success: false, error: "..."

# Invalid sport (should return empty or error)
curl "http://localhost:3008/api/early-lines/analysis?sports=INVALID"
```

### Automated Testing

Create test file `apps/progno/tests/early-lines.test.ts`:

```typescript
import { describe, it, expect } from '@jest/globals';
import { EarlyOddsAggregator } from '../app/lib/early-odds-aggregator';
import { InjuryNewsTracker } from '../app/lib/injury-news-tracker';
import { LineMoveArbDetector } from '../app/lib/line-move-arb-detector';

describe('Early Lines System', () => {
  it('should fetch early odds', async () => {
    const aggregator = new EarlyOddsAggregator();
    const odds = await aggregator.aggregateEarlyOdds(['NBA'], 3);
    expect(odds).toBeInstanceOf(Array);
  });

  it('should fetch injuries', async () => {
    const tracker = new InjuryNewsTracker();
    const { injuries } = await tracker.getAllUpdates(['NBA']);
    expect(injuries).toBeInstanceOf(Array);
  });

  it('should detect arbs', () => {
    const detector = new LineMoveArbDetector();
    const arbs = detector.detectLineMoveArbs([], [], []);
    expect(arbs).toBeInstanceOf(Array);
  });
});
```

Run tests:
```bash
npm test
```

### Load Testing

Test API performance:

```bash
# Install Apache Bench
# macOS: brew install httpd
# Ubuntu: sudo apt-get install apache2-utils
# Windows: Download from Apache website

# Run 10 requests
ab -n 10 -c 1 "http://localhost:3008/api/early-lines/analysis?sports=NBA"

# Expected results:
# - Time per request: 5-30 seconds (depending on includeInjuries/News)
# - Failed requests: 0
```

---

## Deployment

### Vercel Deployment

#### Step 1: Prepare for Deployment

Ensure all changes are committed:

```bash
cd apps/progno
git add .
git commit -m "feat: add early lines system"
git push
```

#### Step 2: Configure Vercel Project

1. Go to https://vercel.com/dashboard
2. Select your project (or create new)
3. Go to Settings → Environment Variables
4. Add `THE_ODDS_API_KEY` with your API key
5. Select environments: Production, Preview, Development
6. Save

#### Step 3: Deploy

**Option A: Automatic (via Git)**
```bash
git push
# Vercel will auto-deploy
```

**Option B: Manual (via CLI)**
```bash
npm install -g vercel
cd apps/progno
vercel --prod
```

#### Step 4: Verify Deployment

```bash
# Test production API
curl "https://your-domain.vercel.app/api/early-lines/analysis?sports=NBA"

# Check response
curl "https://your-domain.vercel.app/api/early-lines/analysis?sports=NBA" | jq '.success'
# Should return: true
```

#### Step 5: Monitor Deployment

1. Go to Vercel dashboard
2. Click on deployment
3. Check logs for errors
4. Verify environment variables are set

### Environment-Specific Configuration

**Development** (`.env.local`):
```bash
THE_ODDS_API_KEY=your_dev_key
```

**Production** (Vercel dashboard):
```bash
THE_ODDS_API_KEY=your_prod_key
```

**Preview** (Vercel dashboard):
```bash
THE_ODDS_API_KEY=your_preview_key
```

### Cron Jobs (Optional)

Add automated early odds capture:

**Step 1: Create capture endpoint**

Create `apps/progno/app/api/early-lines/capture/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { EarlyOddsAggregator } from '@/app/lib/early-odds-aggregator';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET() {
  try {
    const aggregator = new EarlyOddsAggregator();
    const odds = await aggregator.aggregateEarlyOdds(['NFL', 'NBA', 'NCAAB'], 3);
    
    // Store in database
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_KEY!
    );
    
    await supabase.from('early_odds').insert(odds);
    
    return NextResponse.json({ success: true, count: odds.length });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
```

**Step 2: Add to vercel.json**

Edit `apps/progno/vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/early-lines/capture",
      "schedule": "0 8 * * *"
    }
  ]
}
```

This runs daily at 8:00 AM UTC.

**Step 3: Deploy**

```bash
git add vercel.json app/api/early-lines/capture/route.ts
git commit -m "feat: add early lines cron job"
git push
```

---

## Maintenance

### Daily Tasks

1. **Check API quota**
   ```bash
   curl -I "https://api.the-odds-api.com/v4/sports/?apiKey=YOUR_KEY"
   # Look for x-requests-remaining header
   ```

2. **Monitor errors**
   - Check Vercel logs for 500 errors
   - Check browser console for client errors

### Weekly Tasks

1. **Review arb opportunities**
   - Check if any arbs were detected
   - Analyze success rate
   - Adjust strategy if needed

2. **Update documentation**
   - Add new findings to research notes
   - Update troubleshooting guide

### Monthly Tasks

1. **API key renewal**
   - The Odds API resets on 1st of month
   - Verify quota is reset
   - Consider upgrading if needed

2. **Performance review**
   - Check average response times
   - Optimize slow queries
   - Review caching strategy

### Quarterly Tasks

1. **Feature enhancements**
   - Add new data sources
   - Improve impact scoring
   - Add new sports

2. **Code cleanup**
   - Remove unused code
   - Update dependencies
   - Refactor as needed

---

## Troubleshooting

### Common Issues

**Issue**: No odds data returned

**Solution**:
1. Check API key is set: `echo $THE_ODDS_API_KEY`
2. Restart server: `npm run dev`
3. Verify quota: `curl -I "https://api.the-odds-api.com/v4/sports/?apiKey=YOUR_KEY"`

**Issue**: 401 Unauthorized

**Solution**:
1. Verify API key is correct
2. Check environment variable name
3. Restart server

**Issue**: Slow response

**Solution**:
1. Use `includeInjuries=false&includeNews=false`
2. Reduce number of sports
3. Implement caching

**Issue**: Admin dashboard blank

**Solution**:
1. Check browser console for errors
2. Verify server is running
3. Clear browser cache

### Getting Help

1. Check documentation in `docs/` folder
2. Review error messages in console
3. Check Vercel logs (production)
4. Review API response for error details

---

## Next Steps

After setup is complete:

1. **Generate early picks**
   - Run picks generation 2-5 days before games
   - Save to `predictions-early-YYYY-MM-DD.json`

2. **Monitor line movements**
   - Check admin dashboard daily
   - Look for significant moves

3. **Generate regular picks**
   - Run picks generation 0-2 days before games
   - Save to `predictions-YYYY-MM-DD.json`

4. **Review arb opportunities**
   - Check admin dashboard for arbs
   - Calculate hedge stakes
   - Execute trades

5. **Track performance**
   - Record arb results
   - Analyze success rate
   - Optimize strategy

---

## Additional Resources

- **Technical Documentation**: `EARLY_LINES_TECHNICAL_DOCUMENTATION.md`
- **API Guide**: `EARLY_LINES_API_GUIDE.md`
- **Strategy Overview**: `EARLY_LINES_STRATEGY.md`
- **Research Notes**: `early-lines-gold.txt`

---

## Support

For issues or questions:
1. Check this setup guide
2. Review troubleshooting section
3. Check API key and environment variables
4. Verify server is running
5. Check logs for errors

---

## License

This is part of the Progno sports betting intelligence platform. All rights reserved.
