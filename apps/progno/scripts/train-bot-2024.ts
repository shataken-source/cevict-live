#!/usr/bin/env node
/**
 * Train Cursor Effect Bot on Entire 2024 Season
 * Loads all 2024 games for all 6 leagues and trains the bot
 */

import { cursorLearnFromFinals, getCursorStats } from '../app/cursor-effect';
import { loadHistoricalResults } from '../lib/data-sources/historical-results';
import { Game } from '../app/weekly-analyzer';
import fs from 'fs';
import path from 'path';

const ALL_LEAGUES = ['NFL', 'NBA', 'MLB', 'NHL', 'NCAAF', 'NCAAB'] as const;

interface HistoricalGame {
  id: string;
  homeTeam: string;
  awayTeam: string;
  league: string;
  date: string;
  odds?: {
    home: number;
    away: number;
    spread?: number;
    total?: number;
  };
  actualWinner: string;
  actualScore?: {
    home: number;
    away: number;
  };
  teamStats?: any;
  recentForm?: any;
}

// Map sport names to league codes
const SPORT_MAP: Record<string, typeof ALL_LEAGUES[number]> = {
  'NFL': 'NFL',
  'nfl': 'NFL',
  'americanfootball_nfl': 'NFL',
  'NBA': 'NBA',
  'nba': 'NBA',
  'basketball_nba': 'NBA',
  'MLB': 'MLB',
  'mlb': 'MLB',
  'baseball_mlb': 'MLB',
  'NHL': 'NHL',
  'nhl': 'NHL',
  'icehockey_nhl': 'NHL',
  'NCAAF': 'NCAAF',
  'ncaaf': 'NCAAF',
  'americanfootball_ncaaf': 'NCAAF',
  'collegefootball': 'NCAAF',
  'NCAAB': 'NCAAB',
  'ncaab': 'NCAAB',
  'basketball_ncaab': 'NCAAB',
  'collegebasketball': 'NCAAB',
};

console.log('\n🎓 TRAINING CURSOR EFFECT BOT ON 2024 SEASON\n');
console.log('Loading historical results...\n');

// Try multiple data sources
const prognoDir = path.join(process.cwd(), '.progno');
const dataDir = path.join(process.cwd(), 'data');
let allGames: HistoricalGame[] = [];

// Try data/2024-games.json first (has actual data)
const dataFile = path.join(dataDir, '2024-games.json');
if (fs.existsSync(dataFile)) {
  console.log(`✅ Found data file: ${dataFile}`);
  const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
  if (Array.isArray(data)) {
    allGames = data;
    console.log(`✅ Loaded ${allGames.length} games from data/2024-games.json\n`);
  }
}

// Fallback to historical results loader
if (allGames.length === 0) {
  const allResults = loadHistoricalResults();
  if (allResults && Object.keys(allResults).length > 0) {
    // Flatten all results into single array
    for (const [sport, games] of Object.entries(allResults)) {
      if (Array.isArray(games)) {
        allGames.push(...games.map(g => ({ 
          ...g, 
          league: sport,
          actualWinner: g.winner || (g.homeScore > g.awayScore ? g.homeTeam : g.awayTeam)
        })));
      }
    }
    console.log(`✅ Loaded ${allGames.length} games from historical results\n`);
  }
}

if (allGames.length === 0) {
  console.error('❌ No 2024 game data found!');
  console.error('   Expected files:');
  console.error('   - data/2024-games.json');
  console.error('   - .progno/2024-results-all-sports.json');
  process.exit(1);
}

// Get initial stats
const initialStats = getCursorStats();
console.log('📊 Initial Bot State:');
console.log(`   Samples: ${initialStats.samples}`);
console.log(`   Wins: ${initialStats.wins}`);
console.log(`   Accuracy: ${(initialStats.accuracy * 100).toFixed(1)}%`);
console.log(`   Weights:`, initialStats.weights);
console.log('\n');

// Group games by league
const gamesByLeague: Record<string, HistoricalGame[]> = {};
for (const game of allGames) {
  const league = SPORT_MAP[game.league?.toLowerCase()] || game.league || 'NFL';
  if (!gamesByLeague[league]) {
    gamesByLeague[league] = [];
  }
  gamesByLeague[league].push(game);
}

// Process each league
let totalGames = 0;
let totalLearned = 0;
const leagueStats: Record<string, { games: number; learned: number }> = {};

for (const league of ALL_LEAGUES) {
  try {
    const leagueGames = gamesByLeague[league] || [];

    if (leagueGames.length === 0) {
      console.log(`⚠️  ${league}: No results found`);
      continue;
    }

    console.log(`📊 Processing ${league}...`);
    console.log(`   Found ${leagueGames.length} games`);

    // Convert historical games to Game format
    const games: Game[] = [];
    let learned = 0;

    for (const result of leagueGames) {
      // Skip if no scores
      if (!result.actualScore || result.actualScore.home === undefined || result.actualScore.away === undefined) {
        continue;
      }

      // Create Game object
      const game: Game = {
        id: result.id || `${result.homeTeam}-${result.awayTeam}-${result.date}`,
        homeTeam: result.homeTeam,
        awayTeam: result.awayTeam,
        sport: league,
        date: new Date(result.date),
        venue: 'TBD',
        odds: result.odds || {
          home: -110, // Default if not available
          away: 110,
        },
        liveScore: {
          home: result.actualScore.home,
          away: result.actualScore.away,
        },
        teamStats: result.teamStats,
      };

      games.push(game);
    }

    console.log(`   Converted ${games.length} games with scores`);

    // Train the bot on these games
    if (games.length > 0) {
      console.log(`   🎓 Training bot on ${games.length} games...`);
      await cursorLearnFromFinals(games);
      learned = games.length;
      totalLearned += learned;
      console.log(`   ✅ Learned from ${learned} games`);
    }

    totalGames += games.length;
    leagueStats[league] = { games: games.length, learned };

    console.log(`   ✅ ${league} complete\n`);

  } catch (error: any) {
    console.error(`   ❌ Error processing ${league}:`, error.message);
  }
}

// Get final stats
const finalStats = getCursorStats();
const newSamples = finalStats.samples - initialStats.samples;
const newWins = finalStats.wins - initialStats.wins;

console.log('\n' + '='.repeat(60));
console.log('🎓 TRAINING COMPLETE\n');
console.log('📊 Summary:');
console.log(`   Total games processed: ${totalGames}`);
console.log(`   Games learned from: ${totalLearned}`);
console.log(`   Leagues processed: ${Object.keys(leagueStats).length}\n`);

console.log('📈 League Breakdown:');
for (const [league, stats] of Object.entries(leagueStats)) {
  console.log(`   ${league}: ${stats.learned}/${stats.games} games learned`);
}

console.log('\n📊 Bot State After Training:');
console.log(`   Total samples: ${finalStats.samples} (was ${initialStats.samples}, +${newSamples})`);
console.log(`   Total wins: ${finalStats.wins} (was ${initialStats.wins}, +${newWins})`);
console.log(`   Accuracy: ${(finalStats.accuracy * 100).toFixed(1)}%`);
console.log(`   Bias: ${finalStats.bias.toFixed(4)}`);

console.log('\n🎯 Updated Weights:');
for (const [key, value] of Object.entries(finalStats.weights)) {
  const oldValue = (initialStats.weights as any)[key] || 0;
  const change = value - oldValue;
  const changeStr = change >= 0 ? `+${change.toFixed(4)}` : change.toFixed(4);
  console.log(`   ${key}: ${value.toFixed(4)} (${changeStr})`);
}

console.log('\n✅ Bot training complete! The bot has learned from the entire 2024 season.');
console.log('   State saved to: .progno/cursor-state.json\n');

