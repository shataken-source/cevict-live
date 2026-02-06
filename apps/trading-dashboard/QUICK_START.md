# 🚀 Trading Dashboard - Quick Start

## Installation

```bash
# Navigate to trading dashboard
cd apps/trading-dashboard

# Install dependencies
pnpm install

# Copy environment file
cp .env.example .env.local

# Edit .env.local with your settings
notepad .env.local
```

## Start Development Server

```bash
pnpm dev
```

Visit: **http://localhost:3011**

## Features

✅ **Real-time Stats**
- Total balance (Kalshi + Coinbase)
- Total P&L
- Win rate
- Trade counts

✅ **Trading Bubbles**
- Animated visualization of trades
- Color-coded by buy/sell
- Platform indicators

✅ **Platform Breakdown**
- Kalshi stats
- Coinbase stats
- Individual performance

✅ **Performance Charts**
- 30-day trend
- Platform comparison
- Combined performance

✅ **Recent Trades**
- Live trade feed
- Status indicators
- Profit/loss tracking

## Configuration

### Environment Variables

```env
# Alpha Hunter API (Local Agent)
NEXT_PUBLIC_ALPHA_HUNTER_API=http://localhost:3847

# Supabase (optional, for persistence)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
```

### Prerequisites

1. **Local Agent Running** (for real data)
   ```bash
   cd apps/local-agent
   pnpm dev
   ```

2. **Alpha Hunter Configured**
   - Kalshi credentials in `.env.local`
   - Coinbase credentials (optional)

## Project Structure

```
trading-dashboard/
├── src/
│   ├── app/                    # Next.js app router
│   │   ├── api/                # API routes
│   │   ├── layout.tsx          # Root layout
│   │   └── page.tsx            # Dashboard page
│   ├── components/             # React components
│   │   ├── Dashboard.tsx       # Main dashboard
│   │   ├── StatsCards.tsx      # Stat cards
│   │   ├── TradingBubbles.tsx  # Bubble visualization
│   │   ├── PlatformBreakdown.tsx
│   │   ├── PerformanceChart.tsx
│   │   └── RecentTrades.tsx
│   ├── lib/                    # Utilities
│   │   └── api.ts              # API client
│   └── types/                  # TypeScript types
│       └── trading.ts
├── public/                     # Static assets
└── package.json
```

## API Endpoints

### Local Agent Integration

The dashboard fetches data from Local Agent:

- `GET http://localhost:3847/alpha-hunter/stats` - Trading statistics
- `GET http://localhost:3847/alpha-hunter/trades` - Recent trades

### Dashboard API Routes

- `GET /api/trading/stats` - Cached stats
- `GET /api/trading/trades` - Cached trades

## Auto-Refresh

The dashboard automatically refreshes every **5 seconds** to show:
- Latest balances
- New trades
- Updated statistics
- Performance metrics

## Troubleshooting

### "Failed to fetch from API"
- Ensure Local Agent is running on port 3847
- Check `NEXT_PUBLIC_ALPHA_HUNTER_API` in `.env.local`

### "No data showing"
- Dashboard will show mock data if API unavailable
- Check browser console for errors
- Verify Local Agent health: `curl http://localhost:3847/health`

### Port conflicts
- Default port: 3011
- Change in `package.json`: `"dev": "next dev -p YOUR_PORT"`

## Production Build

```bash
# Build
pnpm build

# Start production server
pnpm start
```

## Tech Stack

- **Next.js 14** - React framework with App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Utility-first styling
- **Framer Motion** - Smooth animations
- **Recharts** - Data visualization
- **Lucide React** - Beautiful icons

---

**Enjoy your trading dashboard!** 🎯

