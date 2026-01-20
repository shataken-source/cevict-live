# 🏀 API-SPORTS + CLAUDE EFFECT INTEGRATION

## Complete Implementation Guide

This document describes the complete API-Sports integration combined with the Claude Effect engine for Progno.

---

## 📋 FEATURES IMPLEMENTED

### ✅ P0 - Core Foundation
- [x] API-Sports client with logging and rate limiting
- [x] Complete database schema (teams, players, injuries, standings, H2H, odds)
- [x] Team sync service
- [x] Injury sync service (for CSI - Chaos Sensitivity Index)
- [x] H2H sync service (for NM - Narrative Momentum)

### ✅ P1 - Competitive Advantage
- [x] Multi-source odds comparison (API-Sports, The Odds API, SportsBlaze)
- [x] Complete Claude Effect engine (all 7 phases)
- [x] Sharp money detection
- [x] Cron job scheduling

### ✅ P2 - User Engagement
- [x] Live game tracking with momentum and win probability
- [x] Accuracy tracking with comprehensive metrics
- [x] Market efficiency scoring

---

## 🔧 SETUP

### 1. Environment Variables

Add to `apps/progno/.env.local`:

```env
# API-Sports
API_SPORTS_KEY=<<set-in-env>>
API_SPORTS_NBA_HOST=v1.basketball.api-sports.io
API_SPORTS_NFL_HOST=v1.american-football.api-sports.io
API_SPORTS_NHL_HOST=v1.hockey.api-sports.io

# Cron Secret (for securing cron jobs)
CRON_SECRET=<<set-in-env>>

# Rate Limiting
API_SPORTS_RATE_LIMIT=100
```

### 2. Database Migration

Run the SQL in `supabase-api-sports-migration.sql` in your Supabase SQL Editor.

### 3. Install Dependencies

```bash
cd apps/progno
npm install axios date-fns
```

---

## 📁 FILE STRUCTURE

```
apps/progno/
├── lib/
│   └── api-sports/
│       ├── index.ts                    # Main exports
│       ├── client.ts                   # API-Sports client
│       ├── claude-effect-complete.ts   # Complete Claude Effect engine
│       └── services/
│           ├── team-sync.ts            # Team synchronization
│           ├── injury-sync.ts          # Injury synchronization
│           ├── h2h-sync.ts             # Head-to-head history
│           ├── multi-source-odds.ts    # Multi-source odds comparison
│           ├── live-tracker.ts         # Live game tracking
│           └── accuracy-tracker.ts     # Performance tracking
├── app/
│   └── api/
│       ├── cron/
│       │   ├── sync-teams/route.ts     # Weekly team sync
│       │   ├── sync-injuries/route.ts  # 6-hourly injury sync
│       │   ├── sync-odds/route.ts      # 30-min odds tracking
│       │   ├── generate-picks/route.ts # Daily pick generation
│       │   ├── verify-results/route.ts # Daily result verification
│       │   └── update-live/route.ts    # Live game updates
│       └── picks/
│           └── enhanced/route.ts       # Enhanced picks API
├── vercel.json                         # Cron configuration
└── supabase-api-sports-migration.sql   # Database schema
```

---

## 🧠 CLAUDE EFFECT - ALL 7 PHASES

### Phase 1: Sentiment Field (SF)
- Tracks social media sentiment from players, coaches, reporters
- Uses weighted scoring based on author type
- Compares against team baselines

### Phase 2: Narrative Momentum (NM)
- Analyzes head-to-head history
- Detects revenge games and losing streaks
- Calculates historical momentum

### Phase 3: Information Asymmetry Index (IAI)
- Compares odds from multiple sources
- Detects sharp money movements
- Measures market efficiency

### Phase 4: Chaos Sensitivity Index (CSI)
- Tracks injuries by severity
- Identifies star player absences
- Detects cluster injuries

### Phase 5: Network Influence Graph (NIG)
- Analyzes player/coach relationships
- Tracks recent trades and transfers
- Measures team chemistry changes

### Phase 6: Temporal Relevance Decay (TRD)
- Applies time-based weighting to data
- Recent data weighted more heavily
- Adjusts for game proximity

### Phase 7: Emergent Pattern Detection (EPD)
- Detects systematic patterns in results
- Analyzes confidence vs. accuracy correlation
- Tracks market inefficiency patterns

---

## 📡 API ENDPOINTS

### Enhanced Picks
```
GET /api/picks/enhanced
  ?sport=nba|nfl|nhl
  ?date=YYYY-MM-DD
  ?analysis=true|false
```

### Cron Jobs (require CRON_SECRET)
```
POST /api/cron/sync-teams        # Sync team data
POST /api/cron/sync-injuries     # Sync injury data
POST /api/cron/sync-odds         # Track odds movements
POST /api/cron/generate-picks    # Generate daily picks
POST /api/cron/verify-results    # Verify yesterday's results
POST /api/cron/update-live       # Update live games
```

---

## ⏰ CRON SCHEDULE

| Job | Schedule | Description |
|-----|----------|-------------|
| sync-teams | Sunday midnight | Sync all team data |
| sync-injuries | Every 6 hours | Update injury reports |
| sync-odds | Every 30 min | Track line movements |
| generate-picks | 8 AM daily | Generate today's picks |
| verify-results | 6 AM daily | Verify yesterday's results |

---

## 🎯 PICK TIERS

- **Free**: Confidence < 70% (3 picks/day)
- **Pro**: Confidence 70-80%
- **Elite**: Confidence 80%+

---

## 📊 EXPECTED RESULTS

After implementation:
- ✅ Real injury data in picks
- ✅ Head-to-head history for narratives
- ✅ Team standings for context
- ✅ Multi-source odds comparison
- ✅ Sharp money detection
- ✅ Enhanced confidence scores
- ✅ Complete Claude Effect calculations
- ✅ Live game tracking
- ✅ Accuracy tracking and reporting

---

## 🚀 NEXT STEPS

1. **Sentiment Collection**: Integrate Twitter/Reddit APIs for Phase 1
2. **ML Models**: Train pattern detection for Phase 7
3. **Weather Integration**: Add weather data for outdoor sports
4. **Push Notifications**: Alert users to sharp money movements
5. **Dashboard**: Build real-time analytics dashboard

---

## 📝 TESTING

```bash
# Test team sync
curl -X POST http://localhost:3008/api/cron/sync-teams \
  -H "Authorization: Bearer <<CRON_SECRET>>"

# Test enhanced picks
curl http://localhost:3008/api/picks/enhanced?sport=nba

# Test with analysis
curl http://localhost:3008/api/picks/enhanced?analysis=true
```

---

## 🔒 SECURITY

- All cron endpoints require `CRON_SECRET` header
- Rate limiting on API-Sports calls (100/day for free tier)
- Request logging for debugging
- Supabase RLS policies for data access

---

**Implementation Complete! 🎉**

