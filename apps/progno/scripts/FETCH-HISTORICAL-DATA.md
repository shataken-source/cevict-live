# Fetch 2024 Historical Data for All Leagues

This guide explains how to fetch historical game data for all 6 leagues (NFL, NBA, MLB, NHL, NCAAF, NCAAB) to train the bots.

## Prerequisites

1. **The Odds API Key**: You need an API key from [The Odds API](https://the-odds-api.com/)
   - Sign up at https://the-odds-api.com/
   - Get your free API key (500 requests/month free tier)
   - Or use your existing key if you have one

2. **Set Environment Variable**:
   ```bash
   # Windows PowerShell
   $env:ODDS_API_KEY="your_api_key_here"

   # Windows CMD
   set ODDS_API_KEY=your_api_key_here

   # Linux/Mac
   export ODDS_API_KEY=your_api_key_here
   ```

   Or add it to your `.env` file:
   ```
   ODDS_API_KEY=your_api_key_here
   ```

## Running the Script

### Option 1: Direct Node.js Execution

```bash
cd apps/progno
node scripts/fetch-2024-historical-data.mjs
```

### Option 2: Via npm/pnpm Script (if added to package.json)

```bash
pnpm fetch:historical
```

## What the Script Does

1. **Fetches Completed Games**: Uses The Odds API to fetch all completed games from 2024 for each league
2. **Filters to 2024 Only**: Only includes games from 2024
3. **Requires Final Scores**: Only includes games with completed/final scores
4. **Converts Format**: Converts The Odds API format to the format expected by the training script
5. **Saves Results**: Saves to `apps/progno/.progno/2024-results-all-sports.json`

## Output Format

The script creates a JSON file with this structure:

```json
{
  "NFL": [
    {
      "id": "game-id",
      "homeTeam": "Team A",
      "awayTeam": "Team B",
      "league": "NFL",
      "date": "2024-01-01T12:00:00Z",
      "actualWinner": "Team A",
      "actualScore": {
        "home": 24,
        "away": 17
      },
      "odds": {
        "home": -110,
        "away": 110,
        "spread": -3.5,
        "total": 45.5
      }
    }
  ],
  "NBA": [...],
  "MLB": [...],
  "NHL": [...],
  "NCAAF": [...],
  "NCAAB": [...]
}
```

## After Fetching Data

Once you've fetched the data, train the bots:

```bash
curl -X POST http://localhost:3008/api/train/2024
```

Or if running locally:

```bash
cd apps/progno
node scripts/train-bot-2024.ts
```

## Troubleshooting

### "ODDS_API_KEY not found"
- Make sure you've set the environment variable (see Prerequisites above)
- Check that the variable name is exactly `ODDS_API_KEY`

### "Invalid API key" or "Rate limit exceeded"
- Verify your API key is correct
- Check your API usage at https://the-odds-api.com/dashboard
- Free tier allows 500 requests/month
- Wait a bit if you've hit the rate limit

### "No games found for [league]"
- The API may not have historical data for that league
- Some leagues may have limited historical data
- Try fetching for a more recent date range

### Script takes a long time
- The script fetches data for all 6 leagues sequentially
- It includes a 1-second delay between leagues to avoid rate limits
- This is normal and expected

## Notes

- **API Limits**: The Odds API free tier allows 500 requests/month. This script makes 6 requests (one per league), so you can run it multiple times.
- **Historical Data**: The API may not have complete historical data for all leagues. Some leagues may have more data than others.
- **Date Range**: The script fetches all 2024 games. The API returns up to 365 days of historical data.
- **Score Parsing**: The script tries multiple methods to extract scores from the API response. If scores are missing, those games are skipped.

## Alternative: Manual Data Entry

If The Odds API doesn't have the data you need, you can manually create the JSON file:

1. Create `apps/progno/.progno/2024-results-all-sports.json`
2. Use the format shown above
3. Add games for each league
4. Run the training script

## Next Steps

After fetching and training:

1. ✅ Data is saved to `.progno/2024-results-all-sports.json`
2. ✅ Run training: `curl -X POST http://localhost:3008/api/train/2024`
3. ✅ Check bot stats: `cat apps/progno/.progno/cursor-state.json`
4. ✅ Verify accuracy improved

