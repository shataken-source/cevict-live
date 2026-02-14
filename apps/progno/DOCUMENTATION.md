# Progno - Project Documentation

## Overview
Progno is a sports prediction and analytics platform built with Next.js 16 and TypeScript. It provides AI-powered predictions for sports games, live odds tracking, and portfolio management for picks.

## Project Structure

```
apps/progno/
├── app/                          # Next.js app directory
│   ├── api/                      # API routes
│   │   ├── admin/                # Admin endpoints
│   │   ├── auth/                 # Authentication
│   │   ├── cron/                 # Cron jobs for data sync
│   │   ├── game/                 # Game data endpoints
│   │   ├── keys/                 # API key management
│   │   ├── leagues/              # League information
│   │   ├── monte-carlo/          # Monte Carlo simulation
│   │   ├── progno/               # Main prediction endpoints
│   │   ├── simulate/             # Simulation engine
│   │   └── test/                 # Testing endpoints
│   ├── components/               # React components
│   ├── lib/                      # App-level utilities
│   │   ├── prediction-engine.ts  # Core prediction logic
│   │   ├── prediction-tracker.ts # Prediction accuracy tracking
│   │   ├── monte-carlo.ts        # Monte Carlo simulation engine
│   │   └── claude-effect*.ts     # Claude AI effect analysis
│   ├── anything-page.tsx         # "Predict Anything" feature
│   ├── anything-learner.ts       # Learning system for anything predictions
│   ├── anything-predictor.ts     # General prediction logic
│   ├── layout.tsx                # Root layout
│   └── page.tsx                  # Main page
├── components/                   # Shared components
│   └── ui/                       # UI primitives
├── docs/                         # Documentation
├── lib/                          # Shared libraries
│   ├── api-sports/               # API-Sports integration
│   │   ├── client.ts             # API client
│   │   └── services/             # Service modules
│   ├── data-sources/             # Data source implementations
│   ├── live-odds-dashboard.ts    # Live odds tracking
│   ├── pick-portfolio.ts         # Portfolio management
│   └── odds-service.ts           # Odds service integration
├── public/                       # Static assets
├── types/                        # TypeScript definitions
├── utils/                        # Utility functions
├── next.config.js                # Next.js configuration
├── package.json                  # Dependencies
└── tsconfig.json                 # TypeScript configuration
```

## Architecture

### Core Systems

1. **Prediction Engine** (`app/lib/prediction-engine.ts`)
   - Generates predictions for sports games
   - Calculates win probabilities, confidence scores
   - Detects value bets and edges

2. **Monte Carlo Simulation** (`app/lib/monte-carlo.ts`)
   - Runs simulations to predict outcomes
   - Supports moneyline, spread, and total bets

3. **Prediction Tracker** (`app/lib/prediction-tracker.ts`)
   - Tracks prediction accuracy over time
   - Calculates ROI, win rates, Brier scores
   - Provides learning statistics

4. **Live Odds Dashboard** (`lib/live-odds-dashboard.ts`)
   - Captures live odds from various sources
   - Detects line movements, steam moves, reverse line movement
   - Sends alerts for significant changes

5. **Pick Portfolio** (`lib/pick-portfolio.ts`)
   - Manages picks like a stock portfolio
   - Tracks performance by sport, confidence level
   - Provides portfolio analytics

### Data Sources

- **API-Sports**: Primary data source for NBA, NFL, NHL
- **The Odds API**: Odds data (requires API key)
- **Supabase**: Database for teams, games, predictions, user data

### AI Integration

- **Claude Effect**: Analyzes Claude AI's influence on predictions
- **Gemini API**: Web search and content analysis (optional)
- **Custom Search API**: Google Custom Search integration (optional)

## Build Issues Fixed (Feb 2026)

### Syntax Errors

1. **`prediction-engine.ts:823`**
   - **Problem**: Malformed JSDoc comment
   - **Fix**: Converted to valid multi-line comment block

2. **`prediction-tracker.ts:268`**
   - **Problem**: Export statements inside class definition
   - **Fix**: Moved exports to end of file, after class closure

3. **`team-sync.ts:114`**
   - **Problem**: `private async` method outside class
   - **Fix**: Converted to regular function, updated `this.fetchWithRetry` calls to `fetchWithRetry`

### Missing Module Errors

4. **`@/lib/api-sports/claude-effect-complete`**
   - **Fix**: Created re-export file at `lib/api-sports/claude-effect-complete.ts`

5. **`../../lib/odds-service`**
   - **Fix**: Corrected import path from `../../lib/odds-service` to `../../../lib/odds-service`

6. **`./odds-api-helper`**
   - **Fix**: Created placeholder file at `lib/api-sports/services/odds-api-helper.ts`

7. **`dotenv` imports**
   - **Files**: `live-odds-dashboard.ts`, `pick-portfolio.ts`
   - **Fix**: Removed `dotenv` imports (Next.js handles env vars automatically)

### Missing Type Definitions

8. **`anything-learner.ts`** - Created
   - Exports: `getAnythingLearningStats()`, `learnFromAnythingResult()`
   - Tracks learning statistics for "Predict Anything" feature

9. **`anything-predictor.ts`** - Created
   - Exports: `AnythingInput`, `AnythingPrediction`, `validateQuestion()`, `predictAnything()`, etc.
   - Interface: `AnythingInput` with `question`, `context`, `timeframe`, `riskProfile`, `category`

## Environment Variables

Create `.env.local` with:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# API-Sports
API_SPORTS_KEY=your-api-sports-key

# The Odds API (optional)
ODDS_API_KEY=your-odds-api-key

# Stripe (for payments)
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# Cron Secret
CRON_SECRET=your-cron-secret

# AI Services (optional)
ANTHROPIC_API_KEY=your-claude-key
GOOGLE_API_KEY=your-google-key
```

## Key Features

### 1. Sports Predictions
- NBA, NFL, NHL game predictions
- Moneyline, spread, and total predictions
- Confidence scores and value bet detection

### 2. Monte Carlo Simulation
- Configurable iteration count
- Simulates game outcomes based on team stats
- Generates probability distributions

### 3. Live Odds Tracking
- Captures odds from multiple sources
- Detects line movements
- RLM (Reverse Line Movement) detection
- Steam move alerts

### 4. "Predict Anything"
- General-purpose prediction interface
- AI-powered analysis for any question
- Web search integration (Google or DuckDuckGo)
- Learning system that improves over time

### 5. Portfolio Management
- Track picks like stock portfolio
- Performance analytics by sport/confidence
- ROI calculations

## API Endpoints

### Main Prediction
- `POST /api/progno/analyze-game` - Analyze a specific game
- `GET /api/progno/predictions` - Get all predictions

### Monte Carlo
- `POST /api/monte-carlo/simulate` - Run simulation
- `GET /api/monte-carlo/analysis/:gameId` - Get analysis

### Cron Jobs (Automated)
- `GET /api/cron/daily-predictions` - Generate daily picks
- `GET /api/cron/sync-teams` - Sync team data
- `GET /api/cron/sync-odds` - Sync odds data
- `GET /api/cron/capture-odds` - Capture live odds

### Admin
- `GET /api/admin/reports` - Performance reports
- `GET /api/admin/accuracy` - Accuracy metrics

## Database Schema

Main tables in Supabase:
- `teams` - Team information from API-Sports
- `team_standings` - Current standings
- `games` - Scheduled and completed games
- `predictions` - Generated predictions
- `prediction_results` - Outcomes and accuracy
- `live_odds_dashboard` - Live odds data
- `pick_portfolios` - User portfolios
- `portfolio_picks` - Individual picks

## Development

### Install Dependencies
```bash
cd apps/progno
npm install
```

### Run Development Server
```bash
npm run dev
```

### Build for Production
```bash
npm run build
```

### Type Checking
```bash
npx tsc --noEmit
```

## Deployment

The app is configured for deployment to Vercel:
- Framework: Next.js 16 with Turbopack
- Build Command: `npm run build`
- Output Directory: `.next`

## Known Limitations

1. **AI Features**: Require API keys (Anthropic/Google) for full functionality
2. **Live Data**: Requires active API-Sports subscription
3. **Web Search**: Falls back to DuckDuckGo if Google keys not provided

## Future Enhancements

- MLB and NCAA support
- Player prop predictions
- Real-time alerts via SMS/email
- Mobile app
- Social features (sharing picks)
- Advanced portfolio analytics

## Maintenance Notes

- Keep API-Sports key rotated regularly
- Monitor Supabase row limits on free tier
- Check prediction accuracy weekly via admin dashboard
- Update team/league IDs if API-Sports changes their schema
