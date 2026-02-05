# 🍿 PopThePopcorn - Gen Z Breaking News Platform

A Gen Z-focused breaking news aggregator with AI-powered drama scoring, social listening (Reddit/Twitter), video script generation, and multi-platform distribution (Discord, SMS, TikTok-ready).

## 🎯 Features (Gen Z Optimized)

- **Video-First Content**: Auto-generates TikTok/YouTube Shorts/Reels scripts for every headline
- **Social Listening**: Monitors Reddit, Twitter/X, and Google Trends (Gen Z's preferred sources)
- **Multi-Platform Distribution**: Discord webhooks, SMS alerts, and website
- **AI-Powered Drama Scoring**: Automatic 1-10 drama score with trending topic boosts
- **Source Transparency**: Labels for verified/unverified/viral/user reports (Gen Z values authenticity)
- **Real-Time Updates**: Auto-refreshes with configurable intervals
- **Breaking News Ticker**: Sticky top bar with scrolling breaking headlines
- **Voting System**: Upvote/downvote stories to influence ranking
- **Gen Z-Focused Categories**: Entertainment/Viral, Tech/Social, Politics (prioritized for Gen Z interests)
- **Trending Topics**: Twitter and Google Trends integration
- **Admin Dashboard**: Analytics, settings, scraper controls, and more

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- Supabase account and project
- (Optional) Sinch account for SMS alerts

### Installation

1. **Install dependencies:**
   ```bash
   cd apps/popthepopcorn
   npm install
   ```

2. **Set up environment variables:**
   Create a `.env.local` file:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   
   # Admin password (default: admin123)
   ADMIN_PASSWORD=your_secure_admin_password
   
   # Optional: Sinch for SMS alerts
   SINCH_SERVICE_PLAN_ID=your_sinch_service_plan_id
   SINCH_API_TOKEN=your_sinch_api_token
   SINCH_FROM_NUMBER=your_sinch_phone_number
   SINCH_REGION=us
   
   # Optional: Twitter/X API for trending topics
   TWITTER_BEARER_TOKEN=your_twitter_bearer_token
   TWITTER_TRENDS_LOCATION=worldwide  # Options: worldwide, usa, uk, canada, australia
   
   # Optional: Perplexity API for fast research and verification
   PERPLEXITY_API_KEY=pplx-your_api_key_here
   
   # Optional: Discord webhook for breaking news
   DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
   ```

3. **Set up database:**
   Run the SQL schema in your Supabase SQL editor:
   ```bash
   # Copy and paste the contents of supabase/schema.sql
   ```
   
   **If you've already created the tables**, run the RLS policies separately:
   ```bash
   # Copy and paste the contents of supabase/rls-policies.sql
   ```
   
   **🚨 CRITICAL: Refresh Supabase Schema Cache**
   
   After running the schema, you MUST refresh Supabase's schema cache, otherwise you'll get:
   > "Could not find the table 'public.headlines' in the schema cache"
   
   **To fix:**
   1. Go to: **Supabase Dashboard → Settings → API**
   2. Scroll down to find **"Schema Cache"** section
   3. Click the **"Reload schema cache"** button
   4. Wait 10-30 seconds for it to refresh
   
   **Alternative:** Run this SQL command in Supabase SQL Editor:
   ```sql
   NOTIFY pgrst, 'reload schema';
   ```
   
   **If headlines aren't showing up after refresh:**
   - Make sure you've run the RLS policies from `supabase/rls-policies.sql`
   - Check that environment variables are set in Vercel
   - Verify the table exists: Run `SELECT COUNT(*) FROM headlines;` in Supabase SQL Editor

4. **Run the development server:**
   ```bash
   npm run dev
   ```

   Visit [http://localhost:3003](http://localhost:3003)

## 📋 Available Scripts

- `npm run dev` - Start development server (port 3003)
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run scraper` - Run news scraper once
- `npm run scraper:watch` - Run scraper in watch mode
- `npm run trends` - Monitor trends and update drama scores
- `npm run trends:watch` - Monitor trends in watch mode

## 🔧 Configuration

### News Sources

Edit `lib/scraper.ts` to add or modify news sources. Current sources include:

- **Politics (Mainstream)**: CNN, BBC News, NPR, The Hill, Axios
- **Politics (Alternative - Left)**: Truthout, Raw Story, Common Dreams, The Intercept, Democracy Now
- **Politics (Alternative - Right)**: Breitbart, The Daily Wire, The Federalist
- **Tech**: TechCrunch, The Verge, Ars Technica, Hacker News, Wired, Engadget
- **Business**: Bloomberg, CNBC, MarketWatch, Forbes
- **Entertainment**: TMZ, People, Entertainment Weekly, Variety, Deadline, Hollywood Reporter, Rolling Stone
- **Sports**: ESPN, BBC Sport

### Drama Scoring

The enhanced drama score algorithm (in `lib/drama-score.ts`) considers:
- **High-impact keywords**: breaking, bombshell, scandal, crisis, chaos, etc. (up to +4 points)
- **Medium-impact keywords**: urgent, exclusive, leaked, controversial, etc. (up to +2 points)
- **Low-impact keywords**: drama, tension, concern, etc. (up to +1 point)
- **Source type**: Tabloids get +1.8, major outlets +0.6, tech outlets +0.3
- **Title characteristics**: ALL CAPS words, exclamation marks, question marks
- **Engagement**: Vote counts and controversial vote ratios
- **Recency**: Fresh stories (< 30 min) get +1.5, decaying over 12 hours
- **Category**: Politics and entertainment get slight boosts

The algorithm produces scores from 1-10, with higher scores indicating more dramatic/engaging content.

### Scraping Schedule

Set up a cron job to run the scraper every 5 minutes:

```bash
# Add to crontab
*/5 * * * * cd /path/to/popthepopcorn && npm run scraper
```

Or use a service like Vercel Cron or GitHub Actions.

## 📱 SMS Alerts Setup

1. Sign up for [Sinch](https://www.sinch.com/)
2. Get your Service Plan ID, API Token, and phone number from the Sinch Dashboard
3. Add them to `.env.local`:
   - `SINCH_SERVICE_PLAN_ID` - Your Sinch service plan ID
   - `SINCH_API_TOKEN` - Your Sinch API token
   - `SINCH_FROM_NUMBER` - Your Sinch phone number (or `SINCH_PHONE_NUMBER`)
   - `SINCH_REGION` - Region code (us, eu, br, au, ca) - defaults to 'us'
4. Users can subscribe to alerts via the "Subscribe to Alerts" button
5. Alerts are sent automatically when drama score ≥ 8

## 🐦 Twitter/X Trending Topics Setup

The app can fetch trending topics from Twitter/X to boost drama scores for matching headlines and display them on the frontend.

### Setup Steps:

1. **Create a Twitter Developer Account:**
   - Go to [developer.twitter.com](https://developer.twitter.com/)
   - Sign up or log in with your Twitter/X account
   - Create a new App or use an existing one

2. **Get Your Bearer Token:**
   - Go to your App's "Keys and Tokens" section
   - Generate a "Bearer Token" (App-only authentication)
   - Copy the token

3. **Add to Environment Variables:**
   ```env
   TWITTER_BEARER_TOKEN=your_bearer_token_here
   TWITTER_TRENDS_LOCATION=worldwide  # Options: worldwide, usa, uk, canada, australia
   ```

4. **How It Works:**
   - The trend monitor (`npm run trends`) fetches Twitter trends every 15 minutes
   - Trends are stored in the `trending_topics` table (expires after 1 hour)
   - Headlines matching trending topics get a drama score boost (+0.8 to +2.5 points)
   - Trending topics are displayed on the homepage with a Twitter/X indicator
   - The scraper uses current trends when calculating drama scores for new headlines

5. **Without Twitter API:**
   - The app will still work fine without Twitter API
   - It will fall back to extracting keywords from headlines for trending topics
   - Drama scores won't get the trending boost, but all other features work normally

**Note:** Twitter API v2 has rate limits. The app handles rate limiting gracefully and will continue working even if the API is temporarily unavailable.

## 🔍 Google Trends Setup

The app can also fetch trending topics from Google Trends (no API key required!) to supplement or replace Twitter trends.

### Setup Steps:

1. **No API Key Required:**
   - Google Trends uses RSS feeds, so no authentication is needed
   - The app will automatically fetch trends from Google Trends RSS feeds

2. **Optional Configuration:**
   ```env
   GOOGLE_TRENDS_LOCATION=US  # Options: US, GB, CA, AU, DE, FR, ES, IT, JP, IN, BR, etc.
   ```
   - If not set, defaults to `TWITTER_TRENDS_LOCATION` or `US`
   - See [Google Trends](https://trends.google.com/trending) for available locations

3. **How It Works:**
   - The trend monitor fetches both Twitter and Google Trends (if configured)
   - Trends from both sources are combined and deduplicated
   - Trends appearing in both sources are marked as "both" for higher priority
   - Headlines matching any trending topics get a drama score boost
   - All trends are displayed on the homepage

4. **RSS Feed Notes:**
   - Google Trends RSS feeds are available via the Export feature on [trends.google.com](https://trends.google.com/trending)
   - The app tries common RSS feed URL patterns
   - If the primary URL pattern doesn't work, the app will try alternative patterns
   - If all patterns fail, the app gracefully falls back to Twitter-only or keyword extraction

5. **Benefits of Using Both:**
   - **More comprehensive coverage:** Catch trends that might only appear on one platform
   - **Higher confidence:** Trends appearing on both platforms are likely more significant
   - **Redundancy:** If one source fails, the other can still provide trends
   - **No API limits:** Google Trends RSS has no rate limits (unlike Twitter API)

**Note:** Google Trends RSS feed URLs may change over time. If you encounter issues, you can manually get the RSS feed URL from Google Trends → Trending → Export → RSS Feed and update the URL pattern in `lib/google-trends.ts`.

## 🎮 Discord Integration (Gen Z Distribution)

Discord is Gen Z's preferred communication platform. Breaking news automatically posts to Discord channels.

### Setup Steps:

1. **Create a Discord Webhook:**
   - Go to your Discord server
   - Server Settings → Integrations → Webhooks
   - Click "New Webhook"
   - Copy the webhook URL

2. **Add to Environment Variables:**
   ```env
   DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
   ```
   
   Or set it in the admin dashboard under Settings → Discord Integration

3. **How It Works:**
   - Headlines with drama score ≥ 7 automatically post to Discord
   - Messages include emoji-rich formatting, drama score, and source verification
   - Gen Z-optimized tone with "Popcorn Bot" personality
   - Can be configured per category (entertainment, tech, politics, etc.)

## 📹 Video Script Generation

Every headline automatically generates TikTok/YouTube Shorts/Instagram Reels scripts optimized for Gen Z.

### Features:

- **Hook Generation**: First 3 seconds optimized for retention
- **Body Content**: 20-30 second scripts with Gen Z tone
- **Hashtags**: Platform-specific hashtag suggestions
- **Tone Matching**: Casual, urgent, dramatic, or informative based on content

### Accessing Scripts:

- Scripts are stored in the `video_script` field in the database
- Can be exported via API or viewed in admin dashboard
- Ready to paste into TikTok/YouTube Shorts/Reels

## 🔍 Reddit Social Listening

The scraper now monitors Reddit for breaking news (Gen Z's preferred source over RSS feeds).

### Monitored Subreddits:

- `r/news` - General news
- `r/worldnews` - International news
- `r/entertainment` - Entertainment news
- `r/technology` - Tech news
- `r/videos` - Viral videos
- `r/PublicFreakout` - Viral content
- `r/UpliftingNews` - Positive news
- `r/nottheonion` - Unbelievable news

### Source Verification:

Reddit posts are labeled with source verification:
- **Viral**: High engagement (1000+ upvotes or 100+ comments)
- **User Report**: Regular Reddit post
- **Unverified**: Default for user-generated content

This transparency builds trust with Gen Z, who value authenticity.

## 🗄️ Database Schema

The app uses Supabase with the following main tables:

- `headlines` - News stories with drama scores
- `votes` - User votes (IP-based to prevent duplicates)
- `user_alerts` - SMS/email alert subscriptions
- `reported_stories` - User-reported content
- `drama_history` - Historical drama score tracking
- `trending_topics` - Trending topics from Twitter/X and Google Trends

See `supabase/schema.sql` for the complete schema.

## 🚢 Deployment

**📖 Full deployment guide:** See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed instructions.

### Quick Deploy to Vercel

1. **Install Vercel CLI:**
   ```bash
   npm i -g vercel
   ```

2. **Deploy:**
   ```bash
   cd apps/popthepopcorn
   vercel --prod
   ```

3. **Set environment variables:**
   - Go to Vercel Dashboard → Project Settings → Environment Variables
   - Add all required variables (see DEPLOYMENT.md)

4. **Enable cron jobs:**
   - Vercel Dashboard → Settings → Cron Jobs
   - Cron jobs are automatically configured in `vercel.json`

**Or use the deployment script:**
```powershell
.\deploy.ps1
```

### Required Environment Variables

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ADMIN_PASSWORD`
- `CRON_SECRET` (optional but recommended)

## 📊 Admin Dashboard

Access at `/admin` (password protected) to view:
- Total headlines and statistics
- Top voted stories
- Reported stories requiring review
- Drama score history charts
- Active alert subscriptions
- **Scraper Controls** - Run news scraper and trend monitor directly from the dashboard

**Login:** Visit `/admin/login` and enter the password set in `ADMIN_PASSWORD` environment variable (default: `admin123`).

### Running the Scraper

You can run the scraper in three ways:

1. **From Admin Dashboard** (Recommended):
   - Log into `/admin/login`
   - Click "Run Scraper" button in the Scraper Controls section
   - Stats will auto-refresh after completion

2. **Via Command Line**:
   ```bash
   npm run scraper
   ```

3. **Via API** (requires authentication):
   ```bash
   curl -X POST http://localhost:3003/api/admin/scraper \
     -H "x-admin-token: your_admin_password"
   ```

The scraper will:
- Fetch headlines from all configured RSS feeds
- Calculate drama scores for each headline
- Store new headlines in the database
- Skip duplicates (based on URL)

## 🎨 Customization

### Colors

Edit `tailwind.config.js` to customize the color scheme:
- `drama-high`: Red for high drama (9-10)
- `drama-medium`: Yellow for medium drama (4-6)
- `drama-low`: Green for low drama (1-3)

### Layout

The main page (`app/page.tsx`) uses a three-column grid that becomes single-column on mobile. Modify the grid classes to adjust the layout.

## 🔒 Security

- Votes are IP-based to prevent spam
- API routes validate all inputs
- Supabase Row Level Security (RLS) should be configured for production
- Never commit `.env.local` files

## 📝 License

Private - Part of the Cevict Empire

## 🆘 Troubleshooting

**Scraper not working:**
- Check RSS feed URLs are accessible
- Verify Supabase connection
- Check environment variables

**Drama scores seem off:**
- Adjust weights in `lib/drama-score.ts`
- Check source categorization

**SMS alerts not sending:**
- Verify Sinch credentials (Service Plan ID, API Token)
- Check phone number format (E.164 format: +1234567890)
- Verify SINCH_REGION matches your Sinch account region
- Review Sinch dashboard logs

## 🤝 Contributing

This is part of the Cevict Empire monorepo. Follow the established patterns and conventions.

---

Built with Next.js 14, TypeScript, Tailwind CSS, and Supabase.
