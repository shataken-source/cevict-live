# Prognostication NCAAF/NCAAB Audit Report

## Audit Date: February 14, 2026

## Summary

The prognostication app has **partial NCAAF support** but **NCAAB is missing** from several key locations. The app is primarily designed for NFL focus but has fallback displays that should include both NCAAF and NCAAB for college sports coverage.

---

## Issues Found

### 1. **MISSING: NCAAB in Accuracy Page Fallback** ⚠️
**File:** `app/accuracy/page.tsx` (line 101)

**Current Code:**
```tsx
['NFL', 'NBA', 'NHL', 'MLB', 'NCAAF'].map((sport) => (
```

**Issue:** NCAAB is missing from the fallback sports list. When stats are not loaded, the page displays placeholders for NFL, NBA, NHL, MLB, and NCAAF but NOT NCAAB.

**Fix Required:**
```tsx
['NFL', 'NBA', 'NHL', 'MLB', 'NCAAF', 'NCAAB'].map((sport) => (
```

---

### 2. **ISSUE: Hardcoded Football Emoji for All Sports** ⚠️
**File:** `app/api/sms/notify-pick/route.ts` (line 56)

**Current Code:**
```tsx
message += `🏈 ${sport || league || 'NFL'}\n\n`;
```

**Issue:** Uses 🏈 (football) emoji for all sports regardless of actual sport type. NCAAF and NCAAB picks will display football emoji instead of appropriate icons.

**Fix Required:** Add sport-specific emoji mapping:
```tsx
const sportEmoji: Record<string, string> = {
  'NFL': '🏈',
  'NCAAF': '🏈',
  'NBA': '🏀',
  'NCAAB': '🏀',
  'NHL': '🏒',
  'MLB': '⚾'
};
message += `${sportEmoji[sport] || '🏈'} ${sport || league || 'NFL'}\n\n`;
```

---

### 3. **ISSUE: Hardcoded Football Emoji in Daily Picks SMS** ⚠️
**File:** `lib/sms.ts` (line 92)

**Current Code:**
```tsx
let message = `🏈 ${tierLabel} Daily Picks:\n\n`;
```

**Issue:** Uses 🏈 for all daily picks regardless of sport. If NCAAF or NCAAB games are included, they still show football emoji.

**Fix Required:** Pass sport type to function or use generic sports emoji (⚽ or 🎯)

---

### 4. **NOTE: Default Sport Set to NFL**
**File:** `app/api/sms/send-daily-best-bet/route.ts` (line 53)

**Current Code:**
```tsx
sport: pred.sport || 'NFL',
```

**Issue:** Default sport is 'NFL' when sport is missing. This could mislabel NCAAF/NCAAB games if the sport field is not populated from the Progno API.

**Recommendation:** Ensure Progno API properly populates sport field for college games.

---

### 5. **NOTE: SMS Message in notify-pick Uses Default NFL**
**File:** `app/api/sms/notify-pick/route.ts` (line 56)

**Current Code:**
```tsx
message += `🏈 ${sport || league || 'NFL'}\n\n`;
```

**Issue:** Falls back to 'NFL' if sport/league is missing. Should handle NCAAF/NCAAB properly.

---

## Verification of NCAAF/NCAAB Support

### ✅ Properly Supported Areas:

1. **Kalshi Integration** (`lib/kalshi-integration.ts`)
   - Category mapping handles sports via generic 'sports' category
   - No hardcoded sport list - uses database values

2. **Picks Page** (`app/picks/page.tsx`)
   - Uses 'sports' category which includes all sports
   - No hardcoded sport list

3. **Progno API Integration** (`app/api/progno/route.ts`)
   - Accepts `league` and `sport` parameters generically
   - Passes values through to Progno backend

4. **Elite Simulation** (`app/api/elite/simulate/route.ts`)
   - Generic game data handling
   - No sport-specific hardcoding

5. **Daily Best Bet** (`app/api/sms/send-daily-best-bet/route.ts`)
   - Uses sport field from Progno API
   - Properly maps sport in EnginePick interface

---

## Required Fixes

### Priority 1 (Critical):

1. **Add NCAAB to accuracy page fallback display**
   - File: `app/accuracy/page.tsx`
   - Line: 101
   - Change: Add 'NCAAB' to the array

### Priority 2 (Enhancement):

2. **Add sport-specific emoji mapping for SMS notifications**
   - Files: 
     - `app/api/sms/notify-pick/route.ts`
     - `lib/sms.ts`
   - Add mapping for NCAAF (🏈) and NCAAB (🏀)

### Priority 3 (Data Integrity):

3. **Verify Progno API populates sport field correctly**
   - Ensure NCAAF games have `sport: 'NCAAF'`
   - Ensure NCAAB games have `sport: 'NCAAB'`
   - This prevents default 'NFL' fallback from triggering

---

## Files to Modify

| File | Line | Change Type | Description |
|------|------|---------------|-------------|
| `app/accuracy/page.tsx` | 101 | Add | Include 'NCAAB' in fallback sports array |
| `app/api/sms/notify-pick/route.ts` | 56 | Modify | Add sport emoji mapping |
| `lib/sms.ts` | 92 | Modify | Add sport emoji mapping |

---

## Testing Checklist

After implementing fixes, verify:

- [ ] Accuracy page displays NCAAB placeholder when stats unavailable
- [ ] NCAAF picks show 🏈 emoji in SMS notifications
- [ ] NCAAB picks show 🏀 emoji in SMS notifications
- [ ] NFL picks still show 🏈 emoji
- [ ] NBA picks show 🏀 emoji
- [ ] NHL picks show 🏒 emoji
- [ ] MLB picks show ⚾ emoji
- [ ] Progno API correctly identifies NCAAF games
- [ ] Progno API correctly identifies NCAAB games

---

## Additional Notes

1. **Progno Backend Dependency:** The prognostication frontend relies on the Progno backend (separate app at `apps/progno`) to provide accurate sport classifications. Ensure the backend properly categorizes college sports.

2. **Database Schema:** The `bot_predictions` and `predictions` tables store sport data. Verify these tables properly handle NCAAF/NCAAB values.

3. **SMS Character Limit:** Sport emojis use 2 bytes each. Ensure SMS messages stay under 160 characters for single-segment delivery.

4. **Future Expansion:** Consider adding MLS (⚽), Tennis (🎾), Golf (⛳), and Soccer (⚽) for international markets.

---

## Audit Conclusion

**Status:** Minor issues found - easily fixable

The prognostication app has good generic sport handling but needs:
1. NCAAB added to the accuracy page display
2. Sport-specific emoji mapping for SMS notifications

The architecture properly supports NCAAF/NCAAB through the generic sport/league parameters - the issues are cosmetic/display-related rather than functional.
