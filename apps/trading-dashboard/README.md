# 🎯 Trading Dashboard

Beautiful web dashboard for monitoring Kalshi and Coinbase trading bots.

## Features

- 📊 Real-time trading statistics
- 💰 Live balance tracking (Kalshi + Coinbase)
- 🎈 Trading bubble visualization
- 📈 Performance metrics and charts
- 🔄 Auto-refresh every 5 seconds
- 📱 Responsive design

## Quick Start

```bash
# Install dependencies
pnpm install

# Copy environment file
cp .env.example .env.local

# Start development server
pnpm dev
```

Visit: http://localhost:3011

## Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_ALPHA_HUNTER_API=http://localhost:3847
```

## Project Structure

```
trading-dashboard/
├── src/
│   ├── app/              # Next.js app router
│   ├── components/       # React components
│   ├── lib/              # Utilities
│   └── types/            # TypeScript types
├── public/               # Static assets
└── package.json
```

## Tech Stack

- **Next.js 14** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Recharts** - Data visualization
- **Framer Motion** - Animations
- **Lucide React** - Icons

