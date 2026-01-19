#!/usr/bin/env node
/**
 * Fetch 2024 Historical Game Data for All Leagues
 *
 * This script fetches completed games from The Odds API for all 6 leagues
 * and saves them in the format expected by the training script.
 *
 * Usage:
 *   node scripts/fetch-2024-historical-data.mjs
 *
 * Required env:
 *   ODDS_API_KEY - Your The Odds API key
 *
 * Output:
 *   apps/progno/.progno/2024-results-all-sports.json
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ODDS_API_KEY = process.env.ODDS_API_KEY || process.env.NEXT_PUBLIC_ODDS_API_KEY;

if (!ODDS_API_KEY) {
  console.error('❌ ODDS_API_KEY not found in environment variables');
  console.error('   Set it with: export ODDS_API_KEY=your_key_here');
  process.exit(1);
}

const ALL_LEAGUES = ['NFL', 'NBA', 'MLB', 'NHL', 'NCAAF', 'NCAAB'];

const SPORT_KEY_MAP = {
  'NFL': 'americanfootball_nfl',
  'NBA': 'basketball_nba',
  'MLB': 'baseball_mlb',
  'NHL': 'icehockey_nhl',
  'NCAAF': 'americanfootball_ncaaf',
  'NCAAB': 'basketball_ncaab',
};

const OUTPUT_DIR = path.join(__dirname, '..', '.progno');
const OUTPUT_FILE = path.join(OUTPUT_DIR, '2024-results-all-sports.json');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

/**
 * Fetch scores for a specific league from The Odds API
 * The API returns up to 1000 games, so we need to fetch by date ranges
 */
async function fetchLeagueScores(league, startDate, endDate) {
  const sportKey = SPORT_KEY_MAP[league];
  if (!sportKey) {
    console.warn(`⚠️  Unknown league: ${league}`);
    return [];
  }

  // The Odds API scores endpoint: /v4/sports/{sport}/scores/
  // Parameters: daysFrom (number of days back from today, max is typically 30-90 days)
  // We'll fetch in batches to get all 2024 data

  const today = new Date();
  const start = new Date(startDate);
  const totalDays = Math.ceil((today - start) / (1000 * 60 * 60 * 24));

  if (totalDays < 0) {
    console.log(`   ⏭️  ${league}: Start date is in the future, skipping`);
    return [];
  }

  // API typically allows max 30-90 days, let's use 30 to be safe and fetch in batches
  const maxDaysPerRequest = 30;
  const allGames = [];

  // Fetch in batches of 30 days
  for (let offset = 0; offset < totalDays; offset += maxDaysPerRequest) {
    const daysFrom = Math.min(maxDaysPerRequest, totalDays - offset);

    const url = `https://api.the-odds-api.com/v4/sports/${sportKey}/scores/?daysFrom=${daysFrom}&apiKey=${ODDS_API_KEY}`;

    try {
      if (offset === 0) {
        console.log(`   📡 Fetching ${league} scores (${totalDays} days total, in batches of ${maxDaysPerRequest})...`);
      }

      const response = await fetch(url);

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        if (response.status === 401 || response.status === 403) {
          throw new Error(`Invalid API key. Check your ODDS_API_KEY.`);
        } else if (response.status === 429) {
          throw new Error(`Rate limit exceeded. Please wait and try again.`);
        } else {
          throw new Error(`API error (${response.status}): ${errorText}`);
        }
      }

      const data = await response.json();

      if (!Array.isArray(data)) {
        console.warn(`   ⚠️  ${league}: API returned non-array data for batch ${offset}-${offset + daysFrom}`);
        continue;
      }

      // Filter to 2024 games only and games with completed scores
      const filtered = data.filter(game => {
        if (!game.commence_time) return false;
        const gameDate = new Date(game.commence_time);
        const year = gameDate.getFullYear();

        // Only include 2024 games
        if (year !== 2024) return false;

        // Only include completed games with scores
        if (!game.scores || !Array.isArray(game.scores) || game.scores.length === 0) {
          return false;
        }

        // Check if game is completed (has final scores)
        const hasFinalScores = game.scores.some(score =>
          score.name === 'Final' ||
          score.name === 'FT' ||
          (score.name && score.name.includes('Final'))
        );

        return hasFinalScores;
      });

      allGames.push(...filtered);

      // Rate limiting: wait 1 second between batches
      if (offset + maxDaysPerRequest < totalDays) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error(`   ❌ ${league}: Error fetching batch ${offset}-${offset + daysFrom}:`, error.message);
      // Continue with next batch instead of failing completely
    }
  }

  console.log(`   ✅ ${league}: Found ${allGames.length} completed 2024 games`);
  return allGames;
}

/**
 * Convert The Odds API game format to our historical results format
 */
function convertGameToHistoricalFormat(game, league) {
  // Extract scores
  const scores = game.scores || [];
  let homeScore = null;
  let awayScore = null;

  // Find final scores
  for (const score of scores) {
    if (score.name === 'Final' || score.name === 'FT' || (score.name && score.name.includes('Final'))) {
      // Scores are typically in format: "Team Name: Score"
      // Or they might be in score.score format
      if (score.score) {
        const parts = score.score.toString().split(':');
        if (parts.length >= 2) {
          homeScore = parseInt(parts[0].trim(), 10);
          awayScore = parseInt(parts[1].trim(), 10);
        }
      }
    }
  }

  // If we couldn't parse from score.name, try score.score directly
  if (homeScore === null || awayScore === null) {
    // Look for scores array with team names
    const homeTeamScore = scores.find(s => s.name === game.home_team);
    const awayTeamScore = scores.find(s => s.name === game.away_team);

    if (homeTeamScore && homeTeamScore.score) {
      homeScore = parseInt(homeTeamScore.score, 10);
    }
    if (awayTeamScore && awayTeamScore.score) {
      awayScore = parseInt(awayTeamScore.score, 10);
    }
  }

  // If still no scores, try to extract from the last score entry
  if ((homeScore === null || awayScore === null) && scores.length > 0) {
    const lastScore = scores[scores.length - 1];
    if (lastScore.score) {
      const scoreStr = lastScore.score.toString();
      // Try various formats
      const match = scoreStr.match(/(\d+)[:\s-]+(\d+)/);
      if (match) {
        homeScore = parseInt(match[1], 10);
        awayScore = parseInt(match[2], 10);
      }
    }
  }

  // Skip if we still don't have scores
  if (homeScore === null || awayScore === null || isNaN(homeScore) || isNaN(awayScore)) {
    return null;
  }

  // Determine winner
  const winner = homeScore > awayScore ? game.home_team : game.away_team;

  return {
    id: game.id || `${game.home_team}-${game.away_team}-${game.commence_time}`,
    homeTeam: game.home_team,
    awayTeam: game.away_team,
    league: league,
    date: game.commence_time,
    actualWinner: winner,
    actualScore: {
      home: homeScore,
      away: awayScore,
    },
    odds: game.bookmakers && game.bookmakers.length > 0 ? {
      // Extract odds from first bookmaker
      home: game.bookmakers[0].markets?.find(m => m.key === 'h2h')?.outcomes?.find(o => o.name === game.home_team)?.price || -110,
      away: game.bookmakers[0].markets?.find(m => m.key === 'h2h')?.outcomes?.find(o => o.name === game.away_team)?.price || 110,
      spread: game.bookmakers[0].markets?.find(m => m.key === 'spreads')?.outcomes?.find(o => o.name === game.home_team)?.point || undefined,
      total: game.bookmakers[0].markets?.find(m => m.key === 'totals')?.outcomes?.[0]?.point || undefined,
    } : {
      home: -110,
      away: 110,
    },
  };
}

async function main() {
  console.log('🚀 Fetching 2024 Historical Game Data for All Leagues\n');
  console.log(`📁 Output file: ${OUTPUT_FILE}\n`);

  // 2024 date range
  const startDate = '2024-01-01';
  const endDate = '2024-12-31';

  const allResults = {
    NFL: [],
    NBA: [],
    MLB: [],
    NHL: [],
    NCAAF: [],
    NCAAB: [],
  };

  // Fetch data for each league
  for (const league of ALL_LEAGUES) {
    console.log(`\n📊 Processing ${league}...`);

    try {
      const games = await fetchLeagueScores(league, startDate, endDate);

      // Convert to historical format
      const converted = games
        .map(game => convertGameToHistoricalFormat(game, league))
        .filter(game => game !== null); // Remove games without valid scores

      allResults[league] = converted;
      console.log(`   ✅ ${league}: Converted ${converted.length} games with valid scores`);

      // Rate limiting: wait 1 second between leagues to avoid hitting API limits
      if (league !== ALL_LEAGUES[ALL_LEAGUES.length - 1]) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (error) {
      console.error(`   ❌ ${league}: Failed to process:`, error.message);
    }
  }

  // Save results
  console.log(`\n💾 Saving results to ${OUTPUT_FILE}...`);
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(allResults, null, 2), 'utf8');

  // Print summary
  console.log('\n✅ Fetch Complete!\n');
  console.log('📊 Summary:');
  for (const league of ALL_LEAGUES) {
    const count = allResults[league].length;
    console.log(`   ${league}: ${count} games`);
  }
  const total = Object.values(allResults).reduce((sum, games) => sum + games.length, 0);
  console.log(`\n   Total: ${total} games across all leagues`);

  console.log(`\n🎯 Next step: Run training with:`);
  console.log(`   curl -X POST http://localhost:3008/api/train/2024\n`);
}

main().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});

