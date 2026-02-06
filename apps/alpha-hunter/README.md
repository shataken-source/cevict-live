# 🦅 Alpha Hunter

**Autonomous Profit-Hunting AI Bot**

Target: **$250/day** through intelligent trading, prediction markets, and opportunity scanning.

## Features

- 🧠 **AI-Powered Analysis** - Uses Claude for intelligent decision making
- 📊 **Multi-Source Intelligence** - Scans news, sports, prediction markets
- 💰 **Fund Management** - Smart bankroll management with risk limits
- 🎯 **PROGNO Integration** - Leverages PROGNO prediction engine
- 📈 **Kalshi Trading** - Automated prediction market trading
- 📱 **SMS Alerts** - Daily suggestions via Sinch SMS
- 🔄 **Learning System** - Improves from outcomes
- 🏢 **Project Scanner** - Finds monetization opportunities in your projects

## Quick Start (simple: Progno sports only)

By default the bot only uses **Progno sports picks** (no news/Kalshi/crypto). See **RUNNING-SIMPLE.md** for full steps.

1. Run migration `apps/prognostication/supabase/migrations/002_alpha_hunter_and_bot_config.sql` in your Supabase project.
2. Set `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `PROGNO_BASE_URL` in `.env.local`.
3. Start Progno (`cd apps/progno && npm run dev`), then alpha-hunter:

```bash
cd apps/alpha-hunter
npm install
npm run health        # Check Supabase
npm start scan        # One-off: Progno picks → suggest
# or: npm start run   # Scheduler
```

Set `PROGNO_SPORTS_ONLY=0` to re-enable news, Kalshi scan, crypto, and arbitrage in the main flow.

## Commands

```bash
# Main commands
pnpm start run        # Start scheduled operations
pnpm start scan       # Quick opportunity scan
pnpm start sports     # Scan sports opportunities only
pnpm start status     # Show account status

# Fund management
pnpm start deposit 100    # Add $100 to account
pnpm start withdraw 50    # Withdraw $50

# Kalshi + Progno (best picks)
npm run best-kalshi   # Match Progno /api/picks/today to Kalshi markets, show top EV (see below)
npm run find-best     # Same as best-kalshi

# Development
pnpm run dev          # Watch mode
pnpm run test         # Test all systems
pnpm run health       # Supabase + Kalshi connectivity check (exit 0/1)
```
(Use `npm run` if you don't use pnpm.)

### Find Best Kalshi (Progno picks → Kalshi)

1. Start Progno so picks are available: `cd apps/progno && npm run dev` (serves `http://localhost:3008/api/picks/today`).
2. From alpha-hunter: `npm run best-kalshi` or `npx tsx src/find-best-kalshi.ts`.
3. Script loads today’s picks from Progno, matches them to Kalshi sports (and optionally crypto) markets, and prints the top 20 opportunities by edge. Optional: set `MIN_VOLUME=10000` to filter by volume; set `PROGNO_BASE_URL` if Progno runs elsewhere.

## Schedule

When running `pnpm start run`, the bot operates on this schedule (Eastern Time):

| Time | Action |
|------|--------|
| 6:00 AM | Morning scan - identify opportunities |
| 9:00 AM | Main hunt - execute best opportunities |
| 12:00 PM | Midday check - assess progress |
| 5:00 PM | Sports scan - evening games |
| 10:00 PM | Daily summary - SMS report |
| 12:00 AM | Reset daily counters |

## Configuration

### Risk Management

```env
DAILY_PROFIT_TARGET=250   # Stop trading when reached
MAX_DAILY_LOSS=100        # Stop trading if lost this much
MAX_SINGLE_TRADE=50       # Maximum per trade
MAX_OPEN_POSITIONS=5      # Maximum concurrent trades
```

### Auto-Execute

```env
AUTO_EXECUTE=false   # Set to 'true' for autonomous trading
MIN_CONFIDENCE=65    # Minimum confidence to execute
MIN_EXPECTED_VALUE=5 # Minimum expected value (%)
```

## Architecture

```
alpha-hunter/
├── src/
│   ├── index.ts           # Main entry point & scheduler
│   ├── daily-hunter.ts    # Daily hunt execution
│   ├── ai-brain.ts        # Core AI decision engine
│   ├── fund-manager.ts    # Bankroll management
│   ├── sms-notifier.ts    # SMS notifications
│   ├── scanner.ts         # Quick scan utility
│   ├── test-run.ts        # System test
│   ├── types.ts           # TypeScript types
│   └── intelligence/
│       ├── news-scanner.ts      # News analysis
│       ├── progno-integration.ts # PROGNO API
│       ├── kalshi-trader.ts     # Prediction markets
│       ├── project-scanner.ts   # Project opportunities
│       └── massager-client.ts   # PROGNO Massager
├── supabase-schema.sql    # Database schema
├── .env.example           # Environment template
└── README.md
```

## Opportunity Types

1. **Sports Bets** - PROGNO-powered picks with edge detection
2. **Prediction Markets** - Kalshi opportunities with AI-predicted edge
3. **Arbitrage** - Risk-free profit from odds discrepancies
4. **News Plays** - Capitalize on breaking news
5. **Project Optimization** - Monetize your existing projects

## Strategy for $250/Day

The bot uses this strategy:

1. **Morning** - Scan all sources for opportunities
2. **Prioritize** - Arbitrage (lowest risk) > High-confidence picks > Prediction markets
3. **Size Positions** - Kelly Criterion with quarter Kelly for safety
4. **Diversify** - Max 5 open positions across different types
5. **Learn** - Track all outcomes and adjust confidence calibration

### Required Win Rate

With standard -110 odds and $50 bets:
- To make $250/day with 10 bets: Need ~78% win rate
- With arbitrage supplements: Need ~65% win rate
- Focus on 70%+ confidence picks to exceed targets

## Safety Features

- **Daily loss limit** - Stops trading after max loss
- **Profit target** - Stops trading when target hit (why risk it?)
- **Position limits** - Maximum concurrent open trades
- **Trade size limits** - No single bet can blow up account
- **Simulation mode** - Test without real money first

## Integrations

### Required
- **Anthropic (Claude)** - AI reasoning
- **Supabase** - Data persistence

### Trading
- **Kalshi** - Prediction market trading
- **PROGNO** - Sports predictions

### Notifications
- **Sinch** - SMS alerts

### Data Sources
- **News APIs** - Breaking news
- **The Odds API** - Sports odds
- **Twitter** - Social sentiment

## Database

Run `supabase-schema.sql` in your Supabase SQL editor to create:

- `alpha_hunter_accounts` - Fund tracking
- `alpha_hunter_trades` - Trade history
- `alpha_hunter_opportunities` - Opportunity log
- `alpha_hunter_learnings` - AI improvement data
- `alpha_hunter_daily_reports` - Daily summaries

## SMS Examples

### Daily Suggestion
```
🤖 ALPHA HUNTER DAILY BRIEF
📅 12/29/2024
💰 Balance: $523.50

🎯 TOP OPPORTUNITY:
NFL: Chiefs -10.5
📊 Confidence: 72%
📈 Expected Value: +8.5%
⚠️ Risk Level: medium
💵 Suggested Stake: $35
🎲 Potential Return: $66.82

📋 ACTION:
Place bet on: Chiefs -10.5
Odds: -110
Recommended stake: $35

🔥 LET'S GET THAT $250!
```

### Trade Alert
```
🎯 TRADE EXECUTED

NFL: Chiefs -10.5
💰 Amount: $35.00
📍 Platform: kalshi
⏰ 9:15 AM
```

### Daily Summary
```
📊 DAILY SUMMARY

📈 Trades: 8 (6W/2L)
🎯 Win Rate: 75.0%
💰 P&L: +$267.50
💵 Balance: $791.00

🔥 TARGET HIT!
```

## License

Part of the Cevict Monorepo. © Cevict.com

