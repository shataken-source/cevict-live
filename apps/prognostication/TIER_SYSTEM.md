# Prognostication Tier System

## Overview

The tier system allocates picks based on confidence and edge to provide value at each level while incentivizing upgrades.

## Tier Allocation Strategy

### Free Tier
- **Gets:** 1 decent pick
- **Confidence Range:** 60-70%
- **Purpose:** Give users a taste of the service with a solid pick
- **Value:** Good enough to be useful, but clearly not premium

### Pro Tier
- **Gets:** 3 great picks
- **Confidence Range:** 70-85%
- **Purpose:** Provide excellent value with multiple high-quality picks
- **Value:** Great picks that are clearly better than free, but different from Elite
- **No Overlap:** Pro picks are different from Elite picks (no duplication)

### Elite Tier
- **Gets:** ALL remaining picks (everything else)
- **Confidence Range:** All picks (including 85%+ and everything else)
- **Purpose:** Maximum value - get every pick available
- **Value:** Access to all picks including the absolute best ones
- **Includes:** All picks not allocated to Free or Pro tiers

## Allocation Logic

1. **Sort all picks** by quality score: `(edge * 2.5) + confidence`
   - Edge is weighted more heavily because it represents value
   - Higher score = better pick

2. **Allocate Free:**
   - Find best pick in 60-70% confidence range
   - If none, give mid-range pick (not the absolute best)

3. **Allocate Pro:**
   - Find top 3 picks in 70-85% confidence range
   - Exclude the Free pick
   - Sort by quality score, take top 3

4. **Allocate Elite:**
   - Get ALL remaining picks (everything not in Free or Pro)
   - This includes all 85%+ picks and everything else
   - Sorted by quality score (best first)

## Key Features

- **No Overlap:** Free, Pro, and Elite get different picks
- **Value Progression:** Each tier clearly better than the previous
- **Elite Gets Everything:** Elite subscribers get maximum value
- **Quality-Based:** Allocation based on confidence + edge, not just quantity

## Example

If PROGNO generates 15 picks:
- **Free:** Gets 1 pick (60-70% confidence)
- **Pro:** Gets 3 picks (70-85% confidence, different from Elite)
- **Elite:** Gets remaining 11 picks (all other picks including best ones)

## Security

- Free users only see Free picks (API returns empty arrays for pro/elite)
- Pro users only see Free + Pro picks (API returns empty array for elite)
- Elite users see Free + Pro + Elite picks (everything)
- Server-side verification ensures users can't access picks they haven't paid for

