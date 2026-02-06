#!/usr/bin/env node
/**
 * Fetch 2025 Season Game Data from SportsBlaze API
 *
 * This script fetches completed games from SportsBlaze for all 6 leagues
 * and saves them in the format expected by the training script.
 *
 * Usage:
 *   node scripts/fetch-2024-sportsblaze.mjs
 *
 * Required env:
 *   SPORTSBLAZE_API_KEY - Your SportsBlaze API key
 *
 * Output:
 *   apps/progno/.progno/2025-results-all-sports.json
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SPORTSBLAZE_API_KEY = process.env.SPORTSBLAZE_API_KEY || 'sbfhgr1cnxqlmxab8eggxbt';

if (!SPORTSBLAZE_API_KEY) {
  console.error('❌ SPORTSBLAZE_API_KEY not found in environment variables');
  console.error('   Set it with: export SPORTSBLAZE_API_KEY=your_key_here');
  process.exit(1);
}

const ALL_LEAGUES = ['NFL', 'NBA', 'MLB', 'NHL', 'NCAAF', 'NCAAB'];

const SPORT_PATH_MAP = {
  'NFL': 'nfl',
  'NBA': 'nba',
  'MLB': 'mlb',
  'NHL': 'nhl',
  'NCAAF': 'ncaaf',
  'NCAAB': 'ncaab',
};

const OUTPUT_DIR = path.join(__dirname, '..', '.progno');
const OUTPUT_FILE = path.join(OUTPUT_DIR, '2025-results-all-sports.json');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Fetch boxscores for a specific date and league
 */
async function fetchDailyBoxscores(league, date) {
  const sportPath = SPORT_PATH_MAP[league];
  if (!sportPath) {
    console.warn(`⚠️  Unknown league: ${league}`);
    return [];
  }

  const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
  const url = `https://api.sportsblaze.com/${sportPath}/v1/boxscores/daily/${dateStr}.json?key=${SPORTSBLAZE_API_KEY}`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      if (response.status === 404) {
        // No games on this date - not an error
        return [];
      } else if (response.status === 401 || response.status === 403) {
        throw new Error(`Invalid API key. Check your SPORTSBLAZE_API_KEY.`);
      } else if (response.status === 429) {
        throw new Error(`Rate limit exceeded. Please wait and try again.`);
      } else {
        const errorText = await response.text().catch(() => '');
        throw new Error(`API error (${response.status}): ${errorText}`);
      }
    }

    const data = await response.json();

    // Handle different response formats
    if (Array.isArray(data)) {
      return data;
    } else if (data.games && Array.isArray(data.games)) {
      return data.games;
    } else if (data.boxscores && Array.isArray(data.boxscores)) {
      return data.boxscores;
    } else if (data.data && Array.isArray(data.data)) {
      return data.data;
    } else {
      console.warn(`   ⚠️  ${league} ${dateStr}: Unexpected response format`);
      return [];
    }
  } catch (error) {
    if (error.message.includes('404')) {
      return []; // No games on this date
    }
    console.error(`   ❌ ${league} ${dateStr}: Error:`, error.message);
    return [];
  }
}

/**
 * Convert SportsBlaze game format to our historical results format
 */
function convertGameToHistoricalFormat(game, league, date) {
  // Extract scores - SportsBlaze format may vary
  let homeScore = null;
  let awayScore = null;
  let homeTeam = null;
  let awayTeam = null;

  // Try different field names for scores
  if (game.home_score !== undefined && game.away_score !== undefined) {
    homeScore = parseInt(game.home_score, 10);
    awayScore = parseInt(game.away_score, 10);
    homeTeam = game.home_team || game.homeTeam || game.home;
    awayTeam = game.away_team || game.awayTeam || game.away;
  } else if (game.score) {
    // Try parsing from score string
    const scoreMatch = game.score.match(/(\d+)[:\s-]+(\d+)/);
    if (scoreMatch) {
      homeScore = parseInt(scoreMatch[1], 10);
      awayScore = parseInt(scoreMatch[2], 10);
    }
    homeTeam = game.home_team || game.homeTeam || game.home;
    awayTeam = game.away_team || game.awayTeam || game.away;
  } else if (game.scores) {
    // Try scores object
    homeScore = parseInt(game.scores.home || game.scores.homeScore, 10);
    awayScore = parseInt(game.scores.away || game.scores.awayScore, 10);
    homeTeam = game.home_team || game.homeTeam || game.home;
    awayTeam = game.away_team || game.awayTeam || game.away;
  }

  // Skip if we don't have valid scores
  if (homeScore === null || awayScore === null || isNaN(homeScore) || isNaN(awayScore)) {
    return null;
  }

  if (!homeTeam || !awayTeam) {
    return null;
  }

  // Determine winner
  const winner = homeScore > awayScore ? homeTeam : awayTeam;

  // Extract odds if available
  let odds = {
    home: -110,
    away: 110,
  };

  if (game.odds) {
    if (game.odds.home !== undefined) {
      odds.home = game.odds.home;
    }
    if (game.odds.away !== undefined) {
      odds.away = game.odds.away;
    }
    if (game.odds.spread !== undefined) {
      odds.spread = game.odds.spread;
    }
    if (game.odds.total !== undefined) {
      odds.total = game.odds.total;
    }
  }

  return {
    id: game.id || game.game_id || `${homeTeam}-${awayTeam}-${date.toISOString()}`,
    homeTeam: homeTeam,
    awayTeam: awayTeam,
    league: league,
    date: date.toISOString(),
    actualWinner: winner,
    actualScore: {
      home: homeScore,
      away: awayScore,
    },
    odds: odds,
  };
}


/**
 * Get all dates in 2025
 */
function getDatesIn2025() {
  const dates = [];
  const start = new Date('2025-01-01');
  const end = new Date('2025-12-31');

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    dates.push(new Date(d));
  }

  return dates;
}

/**
 * Draw a progress bar
 */
function drawProgressBar(current, total, width = 40) {
  const percentage = Math.min(100, Math.round((current / total) * 100));
  const filled = Math.round((current / total) * width);
  const empty = width - filled;
  const bar = '█'.repeat(filled) + '░'.repeat(empty);
  return `[${bar}] ${percentage}%`;
}

/**
 * Format elapsed time
 */
function formatTime(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

async function main() {
  const startTime = Date.now();
  console.log('🚀 Fetching 2025 Season Game Data from SportsBlaze\n');
  console.log(`📁 Output file: ${OUTPUT_FILE}\n`);
  console.log(`⚠️  Rate limit: 10 requests/minute - will add delays between requests\n`);

  const allResults = {
    NFL: [],
    NBA: [],
    MLB: [],
    NHL: [],
    NCAAF: [],
    NCAAB: [],
  };

  // Get all dates in 2025
  const dates = getDatesIn2025();
  const today = new Date();
  // Only fetch dates up to today (don't fetch future dates)
  const datesToFetch = dates.filter(d => d <= today);
  const totalDates = datesToFetch.length;
  const totalLeagues = ALL_LEAGUES.length;
  const totalTasks = totalDates * totalLeagues;

  console.log(`📅 Processing ${totalDates} days × ${totalLeagues} leagues = ${totalTasks} total requests\n`);

  let totalRequests = 0;
  let completedTasks = 0;
  const requestsPerMinute = 10;
  const delayBetweenRequests = 6000; // 6 seconds = 10 requests per minute

  // Status update interval (every 60 seconds)
  let lastStatusUpdate = Date.now();
  const statusUpdateInterval = 60000; // 60 seconds

  // Process each league
  for (let leagueIndex = 0; leagueIndex < ALL_LEAGUES.length; leagueIndex++) {
    const league = ALL_LEAGUES[leagueIndex];
    console.log(`\n📊 [${leagueIndex + 1}/${totalLeagues}] Processing ${league}...`);

    const leagueGames = [];
    let gamesFound = 0;
    let datesWithGames = 0;
    const leagueStartTime = Date.now();

    // Fetch games for each date in 2025
    for (let dateIndex = 0; dateIndex < datesToFetch.length; dateIndex++) {
      const date = datesToFetch[dateIndex];

      // Rate limiting: wait if we've made too many requests
      if (totalRequests > 0 && totalRequests % requestsPerMinute === 0) {
        console.log(`   ⏳ Rate limit: Waiting 60 seconds...`);
        await sleep(60000); // Wait 1 minute
      }

      // Small delay between requests to stay under rate limit
      if (totalRequests > 0) {
        await sleep(delayBetweenRequests);
      }

      totalRequests++;
      completedTasks++;

      // Status update every 60 seconds
      const now = Date.now();
      if (now - lastStatusUpdate >= statusUpdateInterval) {
        const elapsed = now - startTime;
        const elapsedFormatted = formatTime(elapsed);
        const progressBar = drawProgressBar(completedTasks, totalTasks, 30);

        // Calculate ETA
        const avgTimePerTask = elapsed / completedTasks;
        const remainingTasks = totalTasks - completedTasks;
        const eta = remainingTasks * avgTimePerTask;
        const etaFormatted = formatTime(eta);

        console.log(`\n   ⏱️  STATUS UPDATE (${new Date().toLocaleTimeString()}):`);
        console.log(`   📊 Overall Progress: ${progressBar}`);
        console.log(`   ⏱️  Elapsed: ${elapsedFormatted} | ETA: ${etaFormatted}`);
        console.log(`   📈 Current: ${league} - Day ${dateIndex + 1}/${totalDates} (${date.toISOString().split('T')[0]})`);
        console.log(`   🎮 Games found so far: ${Object.values(allResults).reduce((sum, games) => sum + games.length, 0) + leagueGames.length} total`);
        console.log(`   📡 API Requests: ${totalRequests}/${totalTasks}`);
        console.log(`   🔄 Current League Progress: ${drawProgressBar(dateIndex + 1, totalDates, 20)}`);

        lastStatusUpdate = now;
      }

      const games = await fetchDailyBoxscores(league, date);

      if (games.length > 0) {
        datesWithGames++;
        gamesFound += games.length;

        // Convert games
        for (const game of games) {
          const converted = convertGameToHistoricalFormat(game, league, date);
          if (converted) {
            leagueGames.push(converted);
          }
        }
      }

      // Progress indicator every 10 days (more frequent)
      if ((dateIndex + 1) % 10 === 0 || dateIndex === datesToFetch.length - 1) {
        const leagueProgress = drawProgressBar(dateIndex + 1, totalDates, 20);
        const leagueElapsed = formatTime(Date.now() - leagueStartTime);
        console.log(`   📈 ${league}: ${leagueProgress} | ${leagueGames.length} games | ${leagueElapsed}`);
      }
    }

    allResults[league] = leagueGames;
    const leagueElapsed = formatTime(Date.now() - leagueStartTime);
    console.log(`   ✅ ${league}: Found ${leagueGames.length} games across ${datesWithGames} dates (${leagueElapsed})`);
  }

  // Save results
  console.log(`\n💾 Saving results to ${OUTPUT_FILE}...`);
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(allResults, null, 2), 'utf8');

  // Print summary
  const totalElapsed = formatTime(Date.now() - startTime);
  console.log('\n✅ Fetch Complete!\n');
  console.log('📊 Summary:');
  for (const league of ALL_LEAGUES) {
    const count = allResults[league].length;
    console.log(`   ${league}: ${count} games`);
  }
  const total = Object.values(allResults).reduce((sum, games) => sum + games.length, 0);
  console.log(`\n   Total: ${total} games across all leagues`);
  console.log(`   Total API requests: ${totalRequests}`);
  console.log(`   Total time: ${totalElapsed}`);
  console.log(`   Average: ${(totalRequests / (Date.now() - startTime) * 1000 * 60).toFixed(2)} requests/minute`);

  console.log(`\n🎯 Next step: Run training with:`);
  console.log(`   curl -X POST http://localhost:3008/api/train/2025\n`);
}

main().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});

