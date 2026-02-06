# 📊 INFORMATION ASYMMETRY INDEX (IAI) – SPEC

## Overview

**IAI** measures the gap between what the **moneyline** implies (public / casual bettors) and what the **spread** implies (sharp / market efficiency). When those disagree, we treat it as **information asymmetry** (sharp vs public) and feed it into the Claude Effect.

---

## What It Measures

| Source | Meaning |
|--------|--------|
| **Moneyline implied** | No-vig win probability from ML odds (e.g. home 55%, away 45%). |
| **Spread implied** | Win probability implied by the point spread (e.g. home -3.5 → “home ~57% to cover” → rough win% proxy). |

If **spread-implied win%** > **ML-implied win%**, the market is pricing the spread “sharper” than the ML (e.g. value on underdog ML or home cover). If **spread-implied** < **ML-implied**, the opposite. IAI quantifies that difference and caps it at ±6% impact.

---

## Formula (Implementation)

1. **No-vig home win probability**  
   `homeNoVigProb = homeImplied / (homeImplied + awayImplied)` (from moneyline).

2. **Spread → implied home win%**  
   Sport-specific “points to win%” (e.g. NFL ~2% per point, NBA ~1.5%):
   - `spreadImpliedHomeWin = 0.5 + spread × pctPerPoint`
   - Spread is from the book (e.g. home -3.5 → spread = 3.5 for home).

3. **IAI raw**  
   `diff = spreadImpliedHomeWin - homeNoVigProb`  
   Scaled and clamped: `IAI = clamp(diff * 2 + small_noise, -0.1, 0.1)` so it stays in the ±6% range when multiplied by the IAI weight (0.20).

4. **Into Claude Effect**  
   IAI is passed into the master formula as the third term: `w₃ × IAI`.

---

## Sport-Specific: Points to Win%

| Sport | Approx. % per point (spread) |
|-------|------------------------------|
| NFL | 2.0% |
| NCAAF | 1.8% |
| NBA | 1.5% |
| NCAAB | 1.6% |
| NHL | 2.5% |
| MLB | 2.0% |

(Exact values live in `app/api/picks/today/route.ts` in `detectSpreadVsMLSignal()`.)

---

## Code Location

- **File:** `app/api/picks/today/route.ts`
- **Function:** `detectSpreadVsMLSignal(homeNoVigProb, spread, sportKey, gameHash)`
- **Used in:** `calculate7DimensionalClaudeEffect(..., spread, sport)` → dimension `IAI`

---

## Status

✅ **Implemented.** IAI is computed in the picks pipeline and used in the 7D Claude Effect for the Vig-Aware Value strategy (top-10 picks, all 6 sports).
