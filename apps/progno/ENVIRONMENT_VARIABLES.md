# Progno Environment Variables Guide

Complete guide to all tunable parameters that control pick generation, filtering, and strategy.

## 📋 Table of Contents
- [Quick Start](#quick-start)
- [Strategy Selection](#strategy-selection)
- [Odds Filtering](#odds-filtering)
- [Confidence Thresholds](#confidence-thresholds)
- [Home/Away Bias](#homeaway-bias)
- [Early Lines Decay](#early-lines-decay)
- [League-Specific Floors](#league-specific-floors)
- [Streak Multipliers](#streak-multipliers)
- [Risk Profiles](#risk-profiles)

---

## Quick Start

### Where to Set Variables

**Local Development:**
Create/edit `c:\cevict-live\apps\progno\.env.local`

**Production (Vercel):**
Vercel Dashboard → Your Project → Settings → Environment Variables

**Format:**
```bash
VARIABLE_NAME=value
```

### Current Defaults (Backtest-Calibrated)

All defaults are optimized from **11,107 games** in 2024 full-season backtest:
- **NFL**: 62% floor → +20.4% ROI
- **Home picks**: +117.1% ROI vs Away picks -18.2% ROI
- **"Best" strategy**: Targets pick-em to slight-fav range where alpha lives

---

## Strategy Selection

### `FILTER_STRATEGY`
**What it does:** Selects the overall filtering strategy preset  
**Options:** `baseline` | `best` | `balanced`  
**Default:** `best`

```bash
FILTER_STRATEGY=best
```

**Strategies Explained:**

| Strategy | Min Odds | Max Odds | Min Confidence | Use Case |
|----------|----------|----------|----------------|----------|
| `baseline` | No limit | No limit | 0% | Testing only - generates all picks |
| `best` | -200 | +500 | 57% | **Recommended** - backtest-optimized |
| `balanced` | -150 | +300 | 60% | Conservative - tighter range |

**When to change:**
- Use `baseline` for testing/debugging only
- Use `balanced` if you want fewer, safer picks
- Stick with `best` for optimal performance

---

## Odds Filtering

### `PROGNO_MIN_ODDS`
**What it does:** Minimum acceptable odds (most negative)  
**Default:** `-200`  
**Format:** Negative number (American odds)

```bash
PROGNO_MIN_ODDS=-200
```

**Explanation:**
- `-200` means "don't bet favorites worse than -200"
- Heavy favorites (like -300, -400) have low value
- Lower (more negative) = allows heavier favorites
- Higher (less negative) = more conservative

**Examples:**
```bash
PROGNO_MIN_ODDS=-150   # More conservative - no heavy favorites
PROGNO_MIN_ODDS=-300   # More aggressive - allows bigger favorites
```

---

### `PROGNO_MAX_ODDS`
**What it does:** Maximum acceptable odds (most positive)  
**Default:** `+500`  
**Format:** Positive number (American odds)

```bash
PROGNO_MAX_ODDS=500
```

**Explanation:**
- `+500` means "don't bet underdogs longer than +500"
- Huge underdogs are volatile and risky
- Higher = allows bigger underdogs
- Lower = more conservative

**Examples:**
```bash
PROGNO_MAX_ODDS=300    # Conservative - only slight underdogs
PROGNO_MAX_ODDS=800    # Aggressive - big underdog plays
```

---

## Confidence Thresholds

### `PROGNO_MIN_CONFIDENCE`
**What it does:** Minimum confidence % required to generate a pick  
**Default:** `57`  
**Format:** Number (percentage without % symbol)

```bash
PROGNO_MIN_CONFIDENCE=57
```

**Explanation:**
- `57%` is calibrated to Shin-devig output range
- Shin-devig favorites rarely exceed 65%
- Setting too high (like 80%) produces zero picks
- Setting too low includes low-quality picks

**Examples:**
```bash
PROGNO_MIN_CONFIDENCE=50   # More picks, lower quality
PROGNO_MIN_CONFIDENCE=65   # Fewer picks, higher quality
PROGNO_MIN_CONFIDENCE=80   # Likely ZERO picks (too strict)
```

**⚠️ Warning:** Values above 70% will drastically reduce pick volume

---

## Home/Away Bias

### `HOME_ONLY_MODE`
**What it does:** Only generate picks for home teams  
**Default:** `1` (enabled)  
**Format:** `1` (on) or `0` (off)

```bash
HOME_ONLY_MODE=1
```

**Backtest Results:**
- **Home picks**: +117.1% ROI
- **Away picks**: -18.2% ROI

**Explanation:**
- Home teams have massive historical edge
- Disabling this will include away picks (not recommended)

**Examples:**
```bash
HOME_ONLY_MODE=1    # Recommended - home picks only
HOME_ONLY_MODE=0    # Include away picks (lower ROI)
```

---

### `PROGNO_HOME_BIAS_BOOST`
**What it does:** Add confidence % to home team picks  
**Default:** `5`  
**Format:** Number (percentage points)

```bash
PROGNO_HOME_BIAS_BOOST=5
```

**Explanation:**
- Adds 5% to confidence when picking home team
- Accounts for home-court/field advantage
- Stacks with other adjustments

**Examples:**
```bash
PROGNO_HOME_BIAS_BOOST=3    # Smaller boost
PROGNO_HOME_BIAS_BOOST=8    # Larger boost
```

---

### `PROGNO_AWAY_BIAS_PENALTY`
**What it does:** Subtract confidence % from away team picks  
**Default:** `5`  
**Format:** Number (percentage points)

```bash
PROGNO_AWAY_BIAS_PENALTY=5
```

**Explanation:**
- Subtracts 5% from confidence when picking away team
- Penalizes road teams
- Only applies if `HOME_ONLY_MODE=0`

---

## Early Lines Decay

Early lines (games 2-5 days ahead) get confidence penalties because odds change.

### `PROGNO_EARLY_DECAY_2D`
**What it does:** Confidence multiplier for games 2 days ahead  
**Default:** `0.97` (97% of original confidence)

```bash
PROGNO_EARLY_DECAY_2D=0.97
```

**Example:**
- Original confidence: 80%
- 2 days ahead: 80% × 0.97 = 77.6%

---

### `PROGNO_EARLY_DECAY_3D`
**Default:** `0.93` (93% of confidence)

```bash
PROGNO_EARLY_DECAY_3D=0.93
```

---

### `PROGNO_EARLY_DECAY_4D`
**Default:** `0.88` (88% of confidence)

```bash
PROGNO_EARLY_DECAY_4D=0.88
```

---

### `PROGNO_EARLY_DECAY_5D`
**Default:** `0.82` (82% of confidence)

```bash
PROGNO_EARLY_DECAY_5D=0.82
```

---

### `PROGNO_EARLY_DECAY_5DPLUS`
**Default:** `0.75` (75% of confidence)

```bash
PROGNO_EARLY_DECAY_5DPLUS=0.75
```

**When to adjust:**
- Lower values = more conservative on early lines
- Higher values = trust early lines more

---

## League-Specific Floors

Each league has a minimum confidence threshold based on backtest performance.

### `PROGNO_FLOOR_NCAAF`
**What it does:** Minimum confidence for college football picks  
**Default:** `62`

```bash
PROGNO_FLOOR_NCAAF=62
```

**Why 62%:** NFL/NCAAF backtest showed 62% threshold → +20.4% ROI

---

### `PROGNO_FLOOR_NCAAB`
**What it does:** Minimum confidence for college basketball picks  
**Default:** `57`

```bash
PROGNO_FLOOR_NCAAB=57
```

---

### `PROGNO_FLOOR_NBA`
**Default:** `57`

```bash
PROGNO_FLOOR_NBA=57
```

---

### `PROGNO_FLOOR_NFL`
**Default:** `62`

```bash
PROGNO_FLOOR_NFL=62
```

---

### `PROGNO_FLOOR_NHL`
**Default:** `57`

```bash
PROGNO_FLOOR_NHL=57
```

---

### `PROGNO_FLOOR_MLB`
**Default:** `57`

```bash
PROGNO_FLOOR_MLB=57
```

**Note:** These override `PROGNO_MIN_CONFIDENCE` for specific leagues.

---

## Streak Multipliers

Adjust confidence based on team win/loss streaks.

### Win Streaks

#### `PROGNO_STREAK_WIN_MULT_3`
**What it does:** Confidence multiplier for 3-game win streak  
**Default:** `1.1` (110% of confidence)

```bash
PROGNO_STREAK_WIN_MULT_3=1.1
```

**Example:**
- Team on 3-game win streak
- Original confidence: 70%
- Adjusted: 70% × 1.1 = 77%

---

#### `PROGNO_STREAK_WIN_MULT_5`
**Default:** `1.25` (125% of confidence)

```bash
PROGNO_STREAK_WIN_MULT_5=1.25
```

---

### Loss Streaks

#### `PROGNO_STREAK_LOSS_MULT_3`
**What it does:** Confidence multiplier for 3-game loss streak  
**Default:** `0.75` (75% of confidence)

```bash
PROGNO_STREAK_LOSS_MULT_3=0.75
```

**Example:**
- Team on 3-game loss streak
- Original confidence: 70%
- Adjusted: 70% × 0.75 = 52.5%

---

#### `PROGNO_STREAK_LOSS_MULT_5`
**Default:** `0.50` (50% of confidence)

```bash
PROGNO_STREAK_LOSS_MULT_5=0.50
```

---

## Risk Profiles

Pre-configured sets of variables for different betting styles.

### 🛡️ Conservative (Fewer, Safer Picks)

```bash
FILTER_STRATEGY=balanced
PROGNO_MIN_ODDS=-150
PROGNO_MAX_ODDS=300
PROGNO_MIN_CONFIDENCE=65
HOME_ONLY_MODE=1
PROGNO_FLOOR_NCAAF=70
PROGNO_FLOOR_NFL=70
```

**Expected:** 3-5 picks/day, 70%+ confidence avg

---

### ⚖️ Balanced (Default - Recommended)

```bash
FILTER_STRATEGY=best
PROGNO_MIN_ODDS=-200
PROGNO_MAX_ODDS=500
PROGNO_MIN_CONFIDENCE=57
HOME_ONLY_MODE=1
# Use all default league floors
```

**Expected:** 8-12 picks/day, 85%+ confidence avg

---

### 🎲 Aggressive (More Picks, Higher Variance)

```bash
FILTER_STRATEGY=best
PROGNO_MIN_ODDS=-300
PROGNO_MAX_ODDS=800
PROGNO_MIN_CONFIDENCE=50
HOME_ONLY_MODE=0
PROGNO_FLOOR_NCAAF=50
PROGNO_FLOOR_NCAAB=50
PROGNO_FLOOR_NBA=50
PROGNO_FLOOR_NFL=55
```

**Expected:** 15-25 picks/day, 75%+ confidence avg

---

### 🔬 Testing/Debug (All Picks)

```bash
FILTER_STRATEGY=baseline
HOME_ONLY_MODE=0
```

**Expected:** 50+ picks/day, wide confidence range

**⚠️ DO NOT USE FOR REAL BETTING**

---

## How Variables Stack

Variables apply in this order:

1. **Strategy filter** (`FILTER_STRATEGY`) - sets base odds/confidence range
2. **League floor** (`PROGNO_FLOOR_*`) - overrides min confidence per league
3. **Home/Away bias** (`PROGNO_HOME_BIAS_BOOST`, `PROGNO_AWAY_BIAS_PENALTY`)
4. **Streak multipliers** (`PROGNO_STREAK_*`)
5. **Early decay** (`PROGNO_EARLY_DECAY_*`) - if game is 2+ days ahead
6. **Final filters** - odds range and confidence minimum

**Example Calculation:**

```
Base confidence: 70%
+ Home bias boost: +5% = 75%
× Win streak (3 games): ×1.1 = 82.5%
× Early decay (3 days): ×0.93 = 76.7%
Final confidence: 77% (rounded)

Check against filters:
✓ Above PROGNO_MIN_CONFIDENCE (57%)
✓ Above PROGNO_FLOOR_NBA (57%)
✓ Odds within range (-200 to +500)
→ PICK GENERATED
```

---

## Testing Your Changes

### Local Testing

1. Edit `.env.local`
2. Restart dev server: `npm run dev`
3. Go to `/progno/admin` → PICKS tab
4. Click "▶ RUN PREDICTIONS (BOTH)"
5. Review picks generated

### Production Testing

1. Add variables in Vercel Dashboard
2. Redeploy or wait for next cron run
3. Check `/progno/admin` for new picks

### Monitoring

Watch the admin panel "STRATEGY SETTINGS" section to see active values:
- Current strategy
- Odds range
- Confidence floor
- Home-only mode status

---

## Common Scenarios

### "I'm getting too many picks"

```bash
PROGNO_MIN_CONFIDENCE=65    # Raise threshold
PROGNO_MAX_ODDS=300         # Tighten underdog range
```

---

### "I'm getting too few picks"

```bash
PROGNO_MIN_CONFIDENCE=50    # Lower threshold
PROGNO_MAX_ODDS=800         # Allow bigger underdogs
HOME_ONLY_MODE=0            # Include away picks (not recommended)
```

---

### "I only want heavy favorites"

```bash
PROGNO_MIN_ODDS=-500        # Allow big favorites
PROGNO_MAX_ODDS=100         # No underdogs
```

---

### "I want to test without filters"

```bash
FILTER_STRATEGY=baseline
```

**⚠️ This will generate 50+ picks/day - testing only!**

---

## Best Practices

1. **Start with defaults** - they're backtest-optimized
2. **Change one variable at a time** - easier to measure impact
3. **Track results** - use the grading system to validate changes
4. **Don't over-optimize** - avoid curve-fitting to small samples
5. **Respect league floors** - they're calibrated per sport
6. **Trust home-only mode** - +117% ROI speaks for itself

---

## Support

If you change variables and see unexpected behavior:

1. Check admin panel "STRATEGY SETTINGS" to confirm values
2. Review pick generation logs for filter messages
3. Reset to defaults and test incrementally
4. Remember: higher confidence = fewer picks (by design)

---

**Last Updated:** Feb 21, 2026  
**Backtest Data:** 2024 full season, 11,107 games  
**Default Strategy:** `best` (optimized for ROI)
