# The Odds API Historical Data Limitation

## Issue

The Odds API `/v4/sports/{sport}/scores/` endpoint does **not support** the `daysFrom` parameter for fetching historical scores. The API returns a `422 Invalid daysFrom` error for any value.

## What This Means

- ❌ Cannot fetch 2024 historical game data via The Odds API scores endpoint
- ✅ The API may only support recent scores (last few days)
- ✅ The API works fine for current/upcoming games via the `/odds/` endpoint

## Alternative Solutions

### Option 1: Use Existing Data Sources

You already have NFL data in `data/2024-games.json`. You can:

1. **Manually add other leagues** to that file
2. **Use existing scripts** that fetch from other sources
3. **Check if you have other data files** with historical results

### Option 2: Use Different APIs

Consider these APIs that provide historical sports data:

- **SportsDataIO** - Comprehensive historical data (paid)
- **RapidAPI Sports APIs** - Various providers with historical data
- **ESPN API** (unofficial) - May have historical scores
- **Sports Reference** - Free historical data (may require scraping)

### Option 3: Manual Data Entry

For training purposes, you can manually create the JSON file:

1. Create `apps/progno/.progno/2024-results-all-sports.json`
2. Use the format from `FETCH-HISTORICAL-DATA.md`
3. Add games for each league manually or via scripts

### Option 4: Use Current Season Data

Instead of 2024 data, you could:

1. **Train on 2025 data** as games complete
2. **Use the existing NFL 2024 data** you already have
3. **Focus on improving predictions** with current data

## Recommendation

Since you already have **286 NFL games from 2024**, I recommend:

1. ✅ **Keep using the NFL data** you have - it's already training the bot
2. ✅ **Train on 2025 games** as they complete (automatic via Tuesday updates)
3. ✅ **Manually add other leagues** if you have access to their historical data
4. ✅ **Focus on improving the bot** with the data you have

The bot is already learning from NFL games and will continue to improve as more games complete in 2025.

## Next Steps

1. The bot is already trained on 286 NFL games ✅
2. Continue training as 2025 games complete ✅
3. If you get access to other league historical data, add it to the JSON file
4. The bot will automatically learn from completed games going forward

---

**Status**: The Odds API doesn't support historical score fetching. Use existing NFL data or alternative sources.

