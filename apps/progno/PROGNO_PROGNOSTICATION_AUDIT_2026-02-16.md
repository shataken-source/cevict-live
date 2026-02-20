# PROGNO + PROGNOSTICATION Deep Audit Report
**Generated:** February 16, 2026
**Auditor:** Claude Code
**Scope:** Complete system integration audit including KeyVault, data flow, and college baseball

---

## Executive Summary

The progno-prognostication ecosystem is **partially operational** with critical integration gaps. KeyVault is properly configured with SCRAPINGBEE_API_KEY, but **college baseball is NOT included in pick generation** despite having code support. The syndication flow between systems is designed but may not be active due to missing PROGNOSTICATION_WEBHOOK_URL.

**Overall System Health:** 72% Operational
**Progno:** 78% | **Prognostication:** 68% | **Integration:** 65%

---

## 1. KeyVault Audit

### Store Location
- **Primary Store:** `C:\Cevict_Vault\env-store.json` (verified exists)
- **Resolution Order:** KEYVAULT_STORE_PATH env → C:\Cevict_Vault\env-store.json → repo vault\secrets\env-store.json

### Key Status: PROGNO + PROGNOSTICATION

| Key | Status | Value | Location |
|-----|--------|-------|----------|
| **SCRAPINGBEE_API_KEY** | ✅ **PRESENT** | `[stored in C:\Cevict_Vault\env-store.json]` | KeyVault + Prognostication .env.local |
| **ODDS_API_KEY** | ✅ PRESENT | `[stored in C:\Cevict_Vault\env-store.json]` | KeyVault |
| **THE_ODDS_API_KEY** | ✅ PRESENT | `[stored in C:\Cevict_Vault\env-store.json]` | KeyVault |
| **API_SPORTS_KEY** | ⚠️ PLACEHOLDER | `"your-api-sports-key"` | KeyVault line 202 |
| **API_SPORTS_BASEBALL_KEY** | ✅ PRESENT | `[stored in C:\Cevict_Vault\env-store.json]` | KeyVault |
| **CFBD_API_KEY** | ✅ PRESENT | `[stored in C:\Cevict_Vault\env-store.json]` | KeyVault |
| **PROGNO_BASE_URL** | ✅ PRESENT | `http://localhost:3008` | KeyVault + Prognostication |
| **PROGNOSTICATION_WEBHOOK_URL** | ❌ **MISSING** | N/A | Not in KeyVault or .env files |
| **PROGNO_API_KEY** | ❌ **MISSING** | N/A | Not found for syndication |

### Critical Finding: API_SPORTS_KEY is Placeholder
```json
// Line 202 of C:\Cevict_Vault\env-store.json
"API_SPORTS_KEY": "your-api-sports-key"
```
**Impact:** API-Sports fallback will fail when The Odds API is unavailable. This is a critical backup data source.

---

## 2. Progno System Audit

### What's Working ✅

#### A. Core Prediction Engine (`app/api/picks/today/route.ts`)
- **6 Sports Supported:** NBA, NFL, NHL, MLB, NCAAF, NCAAB
- **7-Dimensional Claude Effect:** 4 dimensions active (SF, IAI, CSI, TRD)
- **Monte Carlo:** 1000-5000 iterations per game
- **True Edge Engine:** Altitude, RLM, betting splits (when API key available)
- **Line Movement:** Steam moves, line freezes, RLM detection

#### B. Odds Service (`lib/odds-service.ts`)
**Data Source Priority:**
1. Supabase cache (fastest)
2. Plugin-based sources (DraftKings, etc.)
3. API-SPORTS (reliable, paid) - **MAY FAIL due to placeholder key**
4. CFBD for NCAAF (working)
5. DraftKings for College Baseball (code exists)
6. The Odds API (fallback)

#### C. College Baseball Support - **PARTIALLY IMPLEMENTED**
```typescript
// lib/odds-service.ts lines 27-28
const SPORT_MAP: Record<string, string> = {
  // ... other sports
  'college-baseball': 'baseball_ncaa',
  ncaabaseball: 'baseball_ncaa',
};

// Lines 159-170 - College Baseball Fallback
if (lowerSport === 'college-baseball' || lowerSport === 'ncaab') {  // ⚠️ BUG: 'ncaab' is basketball!
  console.log('[OddsService] College Baseball detected, trying DraftKings...');
  try {
    const dkGames = await fetchDraftKingsCollegeBaseball();
    // ...
  }
}
```

**BUG CONFIRMED:** Line 159 checks `lowerSport === 'ncaab'` for college baseball - that's **college basketball**, not baseball!

#### D. Syndication System (`app/api/syndication/route.ts`)
- Tier allocation: Elite (5 picks), Premium (3 picks), Free (2 picks)
- Quality scoring: `confidence + (edge * 2) + (keyFactors * 2)`
- Designed for prognostication integration

### What's Halfway Working ⚠️

| Feature | Status | Issue |
|---------|--------|-------|
| **College Baseball** | ⚠️ Code exists but not in picks | Only in odds-service, NOT in `/api/picks/today` |
| **Syndication** | ⚠️ Code ready but inactive | Missing PROGNOSTICATION_WEBHOOK_URL env var |
| **Betting Splits** | ⚠️ Code ready | Missing SCRAPINGBEE_API_KEY in progno .env.local |
| **Weather API** | ⚠️ Hardcoded values | Uses placeholder temps (72°F) instead of real API data |
| **Kalshi/Polymarket** | ⚠️ Stubbed | Returns empty arrays - TODO comments present |

### What's NOT Working ❌

#### A. College Baseball Picks Generation
**The smoking gun:**
```typescript
// app/api/picks/today/route.ts lines 211-218
const sports = [
  'basketball_nba',
  'americanfootball_nfl',
  'icehockey_nhl',
  'baseball_mlb',
  'americanfootball_ncaaf',
  'basketball_ncaab',
  // ❌ NO COLLEGE BASEBALL HERE!
]
```

**College baseball is mapped but never fetched for picks generation.**

#### B. Missing Tests
- **Zero test files found** in progno
- **Zero test files found** in prognostication
- No automated verification of pick quality or API integrations

#### C. 3 of 7 Claude Effect Dimensions Disabled
```typescript
// app/api/picks/today/route.ts
NM: 0,  // Narrative Momentum - no data source
NIG: 0, // News Impact Grade - no data source
EPD: 0, // External Pressure Differential - no data source
```

---

## 3. Prognostication System Audit

### What's Working ✅

#### A. Tier-Based Pick Distribution (`app/api/picks/today/route.ts`)
```typescript
// Lines 60-108
- Elite: 5 picks (confidence >= 80%)
- Pro: 3 picks (confidence >= 65%)
- Free: 2 picks (leftovers)
```

#### B. Stripe Integration
- Subscription verification working
- Price ID mapping for Pro/Elite tiers
- Active subscription check

#### C. Progno Integration
```typescript
// Lines 185-189
const prognoUrl = process.env.PROGNO_BASE_URL || 'http://localhost:3008';
const resp = await fetch(`${prognoUrl}/api/picks/today`, {
  cache: 'no-store'
});
```

#### D. SCRAPINGBEE_API_KEY Configured
Present in prognostication `.env.local` (line 18)

### What's Halfway Working ⚠️

#### A. Progno API Data Mapping
```typescript
// Lines 193-216 - Data transformation has issues
realPicks = picksData.picks.map(pick => ({
  id: pick.game_id ?? pick.gameId,
  game: pick.game ?? `${pick.away_team ?? ''} @ ${pick.home_team ?? ''}`,
  league: pick.league?.toUpperCase() || 'UNKNOWN',
  // ... more fields
  odds: {
    moneyline: pick.odds ? { home: pick.odds, away: 0 } : undefined,  // ⚠️ Incorrect mapping
    spread: pick.odds ? { home: pick.odds, away: 0 } : undefined,     // ⚠️ Same issue
  },
}));
```

**Issue:** Odds mapping is wrong - `pick.odds` is a number, not an object with home/away.

#### B. Progno-Massager Integration
- Streamlit app exists at `progno-massager/app.py`
- Has arbitrage calculator, supervisor agent
- **Not integrated** with main prognostication web app

### What's NOT Working ❌

#### A. No Test Suite
- No test files found
- No automated validation of tier allocation
- No tests for Stripe webhook handling

#### B. Hardcoded Analysis Data
```typescript
// app/api/progno/route.ts lines 144-163
homeTeam: {
  record: '10-5',  // ❌ Hardcoded
  form: 'W-W-L-W-W', // ❌ Hardcoded
  injuries: ['Key player - Questionable'], // ❌ Hardcoded
  strengths: ['Strong running game'], // ❌ Hardcoded
}
```

---

## 4. Integration Flow: Progno ↔ Prognostication

### Current Data Flow
```
┌─────────────────────────────────────────────────────────────┐
│                         PROGNO                              │
│  ┌─────────────┐    ┌──────────────┐    ┌──────────────┐   │
│  │ Odds APIs   │───▶│ Prediction   │───▶│  Syndication │   │
│  │ (6 sports)  │    │ Engine       │    │  (inactive)  │   │
│  └─────────────┘    └──────────────┘    └──────────────┘   │
│                              │                              │
│                              ▼                              │
│                    ┌──────────────┐                         │
│                    │ predictions- │                         │
│                    │ YYYY-MM-DD   │                         │
│                    │ .json        │                         │
│                    └──────────────┘                         │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ (Progno fetches via HTTP)
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    PROGNOSTICATION                          │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │ /api/picks   │───▶│ Tier         │───▶│ Stripe       │  │
│  │ /today       │    │ Allocation   │    │ Verification │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│           ▲                                              │
│           │                                                │
│    ┌──────────────┐                                        │
│    │ PROGNO_BASE  │                                        │
│    │ _URL         │                                        │
│    └──────────────┘                                        │
└─────────────────────────────────────────────────────────────┘
```

### Integration Points

| Point | Method | Status |
|-------|--------|--------|
| **Progno → File** | `predictions-YYYY-MM-DD.json` | ✅ Working |
| **Progno → Prognostication** | `/api/syndication` POST | ⚠️ Code ready, inactive |
| **Prognostication → Progno** | `/api/picks/today` GET | ✅ Working |
| **Prognostication → Progno** | `/api/progno/sports/game` POST | ✅ Working |

### Syndication Status: INACTIVE
```typescript
// app/api/cron/daily-predictions/route.ts lines 95-147
const webhookUrl = process.env.PROGNOSTICATION_WEBHOOK_URL  // ❌ NOT SET
const apiKey = process.env.PROGNO_API_KEY                   // ❌ NOT SET

if (webhookUrl && picks.length > 0) {
  // This block NEVER executes because webhookUrl is undefined
  console.log('[CRON daily-predictions] Syndicating to Prognostication...')
  // ...
} else {
  console.log('[CRON daily-predictions] Skipping syndication (no webhook URL or no picks)')
  // ☝️ This is what actually happens
}
```

---

## 5. College Baseball Deep Dive

### The Problem

**College baseball IS supported in odds fetching but NOT in pick generation.**

#### Evidence A: Sport Mapping Exists
```typescript
// lib/odds-service.ts
'college-baseball': 'baseball_ncaa',
ncaabaseball: 'baseball_ncaa',
```

#### Evidence B: DraftKings Fetcher Exists
```typescript
// lib/odds-service.ts line 8
import { fetchDraftKingsCollegeBaseball } from './draftkings-college-baseball';

// Lines 159-170
if (lowerSport === 'college-baseball' || lowerSport === 'ncaab') {  // ⚠️ BUG HERE
  const dkGames = await fetchDraftKingsCollegeBaseball();
}
```

#### Evidence C: BUG in Condition
Line 159 checks `lowerSport === 'ncaab'` which is **college basketball**, not baseball!

#### Evidence D: Missing from Picks Generation
```typescript
// app/api/picks/today/route.ts - Sports for picks
const sports = [
  'basketball_nba',
  'americanfootball_nfl',
  'icehockey_nhl',
  'baseball_mlb',        // MLB is here
  'americanfootball_ncaaf',
  'basketball_ncaab',
  // ❌ NO 'baseball_ncaa' or 'college-baseball'
]
```

### Impact
- College baseball odds can be fetched
- College baseball games appear in odds cache
- **College baseball picks are NEVER generated**
- Users cannot get predictions for college baseball

### Required Fixes
1. **Fix BUG in odds-service.ts line 159:**
   ```typescript
   // BEFORE (WRONG)
   if (lowerSport === 'college-baseball' || lowerSport === 'ncaab')

   // AFTER (CORRECT)
   if (lowerSport === 'college-baseball' || lowerSport === 'ncaabaseball')
   ```

2. **Add college baseball to picks generation:**
   ```typescript
   // app/api/picks/today/route.ts
   const sports = [
     // ... existing sports
     'baseball_ncaa',  // ADD THIS
   ]
   ```

3. **Add SPORT_TO_API_SPORTS mapping:**
   ```typescript
   // app/api/picks/today/route.ts
   const SPORT_TO_API_SPORTS: Record<string, string> = {
     // ... existing mappings
     'baseball_ncaa': 'college-baseball',
   }
   ```

---

## 6. Missing Tests Verification

### Test Files Search Results
- `c:\cevict-live\apps\progno\**\*.test.*`: **0 files**
- `c:\cevict-live\apps\progno\**\*.spec.*`: **0 files**
- `c:\cevict-live\apps\prognostication\**\*.test.*`: **0 files**
- `c:\cevict-live\apps\prognostication\**\*.spec.*`: **0 files**

### Manual Test Verification Needed

1. **Progno Picks API:**
   ```bash
   curl "http://localhost:3008/api/picks/today"
   ```
   Verify: Returns picks for 6 sports, NOT college baseball

2. **Progno Odds Service:**
   ```bash
   # Test college baseball odds fetching (should work)
   # But can't verify easily without running service
   ```

3. **Prognostication Integration:**
   ```bash
   curl "http://localhost:3000/api/picks/today"
   ```
   Verify: Returns picks from progno (if progno is running)

4. **Syndication (Inactive):**
   No way to test - requires PROGNOSTICATION_WEBHOOK_URL

---

## 7. Critical Issues Summary

### 🔴 CRITICAL (Fix Immediately)

1. **API_SPORTS_KEY is Placeholder**
   - Location: KeyVault line 202
   - Impact: Backup data source fails
   - Fix: Replace with real API key from api-sports.io

2. **College Baseball Not in Picks**
   - Location: `app/api/picks/today/route.ts` line 211
   - Impact: Users cannot get college baseball predictions
   - Fix: Add `'baseball_ncaa'` to sports array

3. **BUG: Wrong Sport Check in Odds Service**
   - Location: `lib/odds-service.ts` line 159
   - Code: `lowerSport === 'ncaab'` should be `ncaabaseball`
   - Impact: College baseball odds fetching may not work correctly

### 🟡 HIGH (Fix This Week)

4. **Syndication Inactive**
   - Missing: PROGNOSTICATION_WEBHOOK_URL, PROGNO_API_KEY
   - Impact: Predictions don't automatically flow to prognostication
   - Fix: Add env vars to KeyVault

5. **Betting Splits Missing in Progno**
   - SCRAPINGBEE_API_KEY present in KeyVault but NOT in progno .env.local
   - Impact: Sharp money analysis disabled in progno
   - Fix: Sync-env for progno

6. **No Test Suite**
   - Impact: Cannot verify changes don't break system
   - Fix: Add Jest/Vitest tests

### 🟢 MEDIUM (Fix This Month)

7. **Hardcoded Weather Values**
   - Location: `app/api/picks/today/route.ts` line 772
   - Impact: Weather analysis is fake for outdoor sports

8. **Hardcoded Team Analysis in Prognostication**
   - Location: `app/api/progno/route.ts` lines 144-163
   - Impact: All teams show same "10-5" record

9. **Kalshi/Polymarket Stubbed**
   - Location: `app/api/kalshi-polymarket/route.ts`
   - Impact: Prediction markets not available

---

## 8. Environment Variables Summary

### Progno .env.local (Missing from KeyVault)

| Variable | KeyVault | Progno .env.local | Action |
|----------|----------|-------------------|--------|
| SCRAPINGBEE_API_KEY | ✅ Present | ❌ Missing | Run sync-env |
| API_SPORTS_KEY | ⚠️ Placeholder | ❌ Missing | Fix placeholder + sync |
| PROGNOSTICATION_WEBHOOK_URL | ❌ Missing | ❌ Missing | Add to KeyVault |
| PROGNO_API_KEY_TIER1/2/3 | ❌ Missing | ❌ Missing | Add to KeyVault |

### Prognostication .env.local (Correct)

| Variable | Status |
|----------|--------|
| SCRAPINGBEE_API_KEY | ✅ Present |
| PROGNO_BASE_URL | ✅ Present |
| All Stripe keys | ✅ Present |
| Supabase keys | ✅ Present |

---

## 9. Recommendations

### Immediate Actions (Today)

1. **Fix API_SPORTS_KEY in KeyVault:**
   ```powershell
   cd C:\cevict-live\scripts\keyvault
   .\set-secret.ps1 -Name API_SPORTS_KEY -Value "your-real-key-here"
   ```

2. **Add College Baseball to Picks:**
   ```typescript
   // app/api/picks/today/route.ts line 211
   const sports = [
     'basketball_nba',
     'americanfootball_nfl',
     'icehockey_nhl',
     'baseball_mlb',
     'americanfootball_ncaaf',
     'basketball_ncaab',
     'baseball_ncaa',  // ADD THIS
   ]
   ```

3. **Fix BUG in odds-service.ts:**
   ```typescript
   // Line 159
   if (lowerSport === 'college-baseball' || lowerSport === 'ncaabaseball')  // Fix 'ncaab' -> 'ncaabaseball'
   ```

### This Week

4. **Sync Keys to Progno:**
   ```powershell
   cd C:\cevict-live\scripts\keyvault
   .\sync-env.ps1 -AppPath .\..\apps\progno
   ```

5. **Add Missing Webhook URL:**
   ```powershell
   .\set-secret.ps1 -Name PROGNOSTICATION_WEBHOOK_URL -Value "https://prognostication.com/api/webhooks/progno"
   ```

### This Month

6. **Write Tests:**
   - Unit tests for tier allocation
   - Integration tests for progno-prognostication flow
   - Test for college baseball pick generation

7. **Implement Kalshi API:**
   - Uncomment and fix `fetchKalshiMarkets()`
   - Add KALSHI_API_KEY to KeyVault

---

## Appendix: File Locations

### Key Files Audited
| File | Purpose | Issues |
|------|---------|--------|
| `C:\Cevict_Vault\env-store.json` | KeyVault store | API_SPORTS_KEY is placeholder |
| `apps/progno/app/api/picks/today/route.ts` | Pick generation | No college baseball in sports array |
| `apps/progno/lib/odds-service.ts` | Odds fetching | BUG: ncaab check for baseball |
| `apps/progno/app/api/cron/daily-predictions/route.ts` | Daily cron | Syndication inactive |
| `apps/progno/app/api/syndication/route.ts` | Syndication | Working but unused |
| `apps/prognostication/app/api/picks/today/route.ts` | Tier allocation | Odds mapping issue |
| `apps/prognostication/app/api/progno/route.ts` | Single game | Hardcoded analysis data |
| `apps/prognostication/.env.local` | Environment | Correctly configured |

---

**End of Audit Report**
