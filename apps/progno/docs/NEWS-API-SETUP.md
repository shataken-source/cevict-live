# 📰 News API Setup Guide

## What to Search For

**Search for:** `NewsAPI.org` or go directly to: **https://newsapi.org/**

## Quick Setup Steps

### 1. Sign Up for Free Account
1. Go to **https://newsapi.org/**
2. Click **"Get API Key"** or **"Sign Up"**
3. Fill in your details:
   - Email address
   - Password
   - Name
4. Verify your email

### 2. Get Your API Key
1. After signing up, go to your **Dashboard**
2. Your API key will be displayed on the dashboard
3. Copy the key (it looks like: `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6`)

### 3. Free Tier Limits
- **100 requests per day** (free tier)
- Perfect for testing and development
- Covers multiple teams/games per day

### 4. Add to Your Project

#### Option A: Environment Variable
Add to `apps/progno/.env.local`:
```env
NEWS_API_KEY=your_api_key_here
```

#### Option B: Keys Store
```typescript
import { addKey } from './app/keys-store';
addKey('News API Key', 'your_api_key_here');
```

## What It Does

The News API will:
- ✅ Collect news articles about teams
- ✅ Search for team names, players, coaches
- ✅ Get articles from ESPN, CBS Sports, Yahoo Sports, etc.
- ✅ Provide sentiment analysis data
- ✅ Support narrative detection (Phase 2)

## Alternative: RSS Feeds (No API Key Needed)

If you don't want to use NewsAPI, the system will automatically fall back to RSS feeds from:
- ESPN
- CBS Sports
- Yahoo Sports

However, NewsAPI provides:
- Better search capabilities
- More sources
- Structured data
- Better filtering

## Testing

Once you add the key, test it:
```bash
# The system will automatically use it when collecting sentiment data
# Run a simulation to see it in action
curl http://localhost:3008/api/simulate/yesterday
```

---

**Note:** The free tier (100 requests/day) is perfect for development. For production, you may want to upgrade to a paid plan for more requests.

