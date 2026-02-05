/**
 * Run Progno Script for Specific Dates
 *
 * 1. Fetches lines/odds for specified dates
 * 2. Generates picks using Progno engine
 * 3. Adds results for those dates (if available)
 */

import fs from 'fs';
import path from 'path';
import { getPrimaryKey } from '../app/keys-store';
import { analyzeWeeklyGames, Game } from '../app/weekly-analyzer';
import { enrichGame } from '../lib/data-sources/game-enricher';
import type { GameResult as HistoricalGameResult } from '../lib/data-sources/historical-results';
import { getSportResults, loadHistoricalResults } from '../lib/data-sources/historical-results';

const SPORT_MAP: Record<string, string> = {
  'NFL': 'americanfootball_nfl',
  'NBA': 'basketball_nba',
  'MLB': 'baseball_mlb',
  'NHL': 'icehockey_nhl',
  'NCAAF': 'americanfootball_ncaaf',
  'NCAAB': 'basketball_ncaab'
};

interface GameResult {
  id: string;
  sport: string;
  homeTeam: string;
  awayTeam: string;
  date: string;
  homeScore: number;
  awayScore: number;
  spread?: number;
  total?: number;
  homeCovered?: boolean;
  overHit?: boolean;
  winner: string;
}

function normalizeName(name: string): string {
  return name?.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '') || '';
}

async function fetchOddsForDate(apiKey: string, sport: string, targetDate: Date): Promise<Game[]> {
  const sportKey = SPORT_MAP[sport];
  if (!sportKey) return [];

  const dateStr = targetDate.toISOString().split('T')[0];
  const url = `https://api.the-odds-api.com/v4/sports/${sportKey}/odds/?apiKey=${apiKey}&regions=us&markets=h2h,spreads,totals&oddsFormat=american&dateFormat=iso`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.warn(`  Failed to fetch odds for ${sport} on ${dateStr}: ${response.statusText}`);
      return [];
    }

    const data = await response.json();
    const games: Game[] = [];

    for (const game of data || []) {
      const gameDate = new Date(game.commence_time);
      const gameDateStr = gameDate.toISOString().split('T')[0];

      // Only include games for the target date
      if (gameDateStr !== dateStr) continue;

      const homeTeam = game.home_team;
      const awayTeam = game.away_team;
      if (!homeTeam || !awayTeam) continue;

      let moneylineHome: number | undefined;
      let moneylineAway: number | undefined;
      let spread: number | undefined;
      let total: number | undefined;

      const bookmaker = game.bookmakers?.[0];
      if (bookmaker?.markets) {
        for (const market of bookmaker.markets) {
          if (market.key === 'h2h' && Array.isArray(market.outcomes)) {
            const home = market.outcomes.find((o: any) => normalizeName(o.name) === normalizeName(homeTeam));
            const away = market.outcomes.find((o: any) => normalizeName(o.name) === normalizeName(awayTeam));
            moneylineHome = home?.price;
            moneylineAway = away?.price;
          }
          if (market.key === 'spreads' && Array.isArray(market.outcomes)) {
            const home = market.outcomes.find((o: any) => normalizeName(o.name) === normalizeName(homeTeam));
            spread = home?.point;
          }
          if (market.key === 'totals' && Array.isArray(market.outcomes)) {
            const over = market.outcomes.find((o: any) => o.name?.toLowerCase?.() === 'over');
            total = over?.point;
          }
        }
      }

      if (!moneylineHome || !moneylineAway) continue;

      const gameObj: Game = {
        id: game.id || `${sport}-${homeTeam}-${awayTeam}-${dateStr}`,
        homeTeam,
        awayTeam,
        sport,
        date: gameDate,
        odds: {
          home: moneylineHome,
          away: moneylineAway,
          spread,
          total,
        },
        venue: game.venue || 'Unknown',
      };

      games.push(gameObj);
    }

    return games;
  } catch (error: any) {
    console.warn(`  Error fetching odds for ${sport} on ${dateStr}:`, error.message);
    return [];
  }
}

async function fetchResultsForDate(apiKey: string, sport: string, targetDate: Date): Promise<GameResult[]> {
  const dateStr = targetDate.toISOString().split('T')[0];
  const results: GameResult[] = [];

  // Strategy 1: Use historical results data source (from local file)
  try {
    const historicalResults = getSportResults(sport);
    const dateResults = historicalResults.filter((result: HistoricalGameResult) => {
      const resultDate = new Date(result.date).toISOString().split('T')[0];
      return resultDate === dateStr;
    });

    for (const result of dateResults) {
      results.push({
        id: result.id,
        sport: result.sport,
        homeTeam: result.homeTeam,
        awayTeam: result.awayTeam,
        date: result.date,
        homeScore: result.homeScore,
        awayScore: result.awayScore,
        spread: result.spread,
        total: result.total,
        homeCovered: result.homeCovered,
        overHit: result.overHit,
        winner: result.winner,
      });
    }

    if (results.length > 0) {
      console.log(`    Found ${results.length} results from historical data`);
      return results;
    }
  } catch (error: any) {
    console.warn(`  Error loading historical results:`, error.message);
  }

  // Strategy 2: Try API-Football (for NBA, NFL, etc.)
  try {
    const apiFootballModule = require('../enhancements/api-football');
    if (apiFootballModule && apiFootballModule.getFixtures) {
      // API-Football league mappings
      const leagueMap: Record<string, number> = {
        'NBA': 12,
        'NFL': 1,
        'NHL': 4,
        'NCAAF': 1, // May need different mapping
        'NCAAB': 12, // May need different mapping
      };

      const leagueId = leagueMap[sport];
      if (leagueId) {
        const fixtures = await apiFootballModule.getFixtures({
          date: dateStr,
          league: leagueId,
          status: 'FT', // Finished games only
        });

        for (const fixture of fixtures || []) {
          if (fixture.goals?.home !== undefined && fixture.goals?.away !== undefined) {
            const homeScore = fixture.goals.home;
            const awayScore = fixture.goals.away;

            if (homeScore >= 0 && awayScore >= 0) {
              const winner = homeScore > awayScore ? fixture.teams.home.name : fixture.teams.away.name;

              results.push({
                id: fixture.fixture.id.toString(),
                sport,
                homeTeam: fixture.teams.home.name,
                awayTeam: fixture.teams.away.name,
                date: fixture.fixture.date,
                homeScore,
                awayScore,
                winner,
              });
            }
          }
        }

        if (results.length > 0) {
          console.log(`    Found ${results.length} results from API-Football`);
          return results;
        }
      }
    }
  } catch (error: any) {
    // API-Football not available or error - continue to next strategy
    console.warn(`  API-Football not available:`, error.message);
  }

  // Strategy 3: Try The Odds API available results (like fetch-available-results.ts)
  const sportKey = SPORT_MAP[sport];
  if (sportKey) {
    try {
      const today = new Date();
      const daysDiff = Math.floor((today.getTime() - targetDate.getTime()) / (1000 * 60 * 60 * 24));

      // Try different day ranges to see what's available (like fetch-available-results does)
      const dayRanges = [Math.max(1, daysDiff), daysDiff + 7, daysDiff + 14, 30, 60, 90].filter(d => d >= 1);

      for (const daysFrom of dayRanges) {
        try {
          const url = `https://api.the-odds-api.com/v4/sports/${sportKey}/scores/?apiKey=${apiKey}&daysFrom=${daysFrom}&dateFormat=iso`;
          const response = await fetch(url);

          if (!response.ok) {
            if (response.status === 422) {
              // This range not supported, try next
              continue;
            }
            continue;
          }

          const data = await response.json();
          if (!Array.isArray(data)) continue;

          for (const game of data) {
            if (!game.completed || !game.scores) continue;

            const gameDate = new Date(game.commence_time);
            const gameDateStr = gameDate.toISOString().split('T')[0];

            // Only include games for the target date
            if (gameDateStr !== dateStr) continue;

            const homeTeam = game.home_team;
            const awayTeam = game.away_team;
            const homeScoreEntry = game.scores.find((s: any) =>
              normalizeName(s.name) === normalizeName(homeTeam)
            );
            const awayScoreEntry = game.scores.find((s: any) =>
              normalizeName(s.name) === normalizeName(awayTeam)
            );

            if (!homeScoreEntry || !awayScoreEntry) continue;

            const homeScore = Number(homeScoreEntry.score ?? homeScoreEntry.points ?? 0);
            const awayScore = Number(awayScoreEntry.score ?? awayScoreEntry.points ?? 0);

            if (homeScore === 0 && awayScore === 0) continue;

            // Check if we already have this result
            if (results.some(r => r.id === game.id)) continue;

            const winner = homeScore > awayScore ? homeTeam : awayTeam;

            results.push({
              id: game.id,
              sport,
              homeTeam,
              awayTeam,
              date: gameDate.toISOString(),
              homeScore,
              awayScore,
              winner,
            });
          }

          // If we found results for this date, break
          if (results.length > 0) {
            console.log(`    Found ${results.length} results from The Odds API`);
            break;
          }

          // Rate limiting
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error: any) {
          // Continue to next range
          continue;
        }
      }
    } catch (error: any) {
      console.warn(`  Error fetching from The Odds API:`, error.message);
    }
  }

  return results;
}

async function main() {
  // Try to load from .env.local if it exists
  const envPath = path.join(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const lines = envContent.split('\n');
    for (const line of lines) {
      const match = line.match(/^ODDS_API_KEY=(.+)$/);
      if (match) {
        process.env.ODDS_API_KEY = match[1].trim();
        break;
      }
    }
  }

  const apiKey = getPrimaryKey();
  if (!apiKey) {
    console.error('❌ ODDS_API_KEY not found');
    console.error('   Please set ODDS_API_KEY or NEXT_PUBLIC_ODDS_API_KEY in environment variables');
    console.error('   Or add it to apps/progno/.env.local');
    process.exit(1);
  }

  // Target dates: Dec 23, 24, 25, 2024
  const dates = [
    new Date('2024-12-23'),
    new Date('2024-12-24'),
    new Date('2024-12-25'),
  ];

  const sports: string[] = ['NFL', 'NBA', 'NHL', 'NCAAF', 'NCAAB'];
  const prognoDir = path.join(process.cwd(), '.progno');

  if (!fs.existsSync(prognoDir)) {
    fs.mkdirSync(prognoDir, { recursive: true });
  }

  console.log('🚀 Running Progno Script for Dec 23, 24, 25\n');

  // Step 1: Fetch lines and generate picks
  console.log('=== STEP 1: Fetching Lines & Generating Picks ===\n');

  const allPicks: any[] = [];

  for (const date of dates) {
    const dateStr = date.toISOString().split('T')[0];
    console.log(`\n📅 Processing ${dateStr}...`);

    for (const sport of sports) {
      console.log(`  ${sport}...`);

      // Fetch odds for this date
      const games = await fetchOddsForDate(apiKey, sport, date);

      if (games.length === 0) {
        console.log(`    No games found`);
        continue;
      }

      console.log(`    Found ${games.length} games`);

      // Enrich and predict each game
      for (const game of games) {
        try {
          // Enrich game with all data sources
          const enrichedGame = await enrichGame(game);

          // Generate prediction
          const predictions = await analyzeWeeklyGames([enrichedGame]);

          if (predictions.predictions.length > 0) {
            const pred = predictions.predictions[0];

            allPicks.push({
              game: {
                id: enrichedGame.id,
                homeTeam: enrichedGame.homeTeam,
                awayTeam: enrichedGame.awayTeam,
                sport: enrichedGame.sport,
                date: enrichedGame.date.toISOString(),
              },
              pick: pred.pick,
              confidence: pred.confidence,
              edge: pred.edge,
              sport: enrichedGame.sport,
              keyFactors: pred.keyFactors,
              rationale: pred.rationale,
              simulationResults: pred.simulationResults,
              predictedScore: pred.predictedScore,
              riskLevel: pred.riskLevel,
              stake: pred.stake,
            });
          }
        } catch (error: any) {
          console.warn(`    Error processing game ${game.id}:`, error.message);
        }
      }

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  // Save picks
  const picksFile = path.join(prognoDir, 'picks-all-leagues-latest.json');
  fs.writeFileSync(picksFile, JSON.stringify(allPicks, null, 2), 'utf8');
  console.log(`\n✅ Saved ${allPicks.length} picks to ${picksFile}`);

  // Step 2: Fetch and add results
  console.log('\n=== STEP 2: Fetching & Adding Results ===\n');

  // Load existing results (2024)
  const existingFile = path.join(prognoDir, '2024-results-all-sports.json');
  let existingResults: Record<string, GameResult[]> = {};
  if (fs.existsSync(existingFile)) {
    try {
      const data = fs.readFileSync(existingFile, 'utf8');
      existingResults = JSON.parse(data);
      console.log('Loaded existing results...\n');
    } catch (error) {
      console.warn('Could not load existing results, starting fresh');
    }
  }

  // Also load historical results to ensure we have the data
  console.log('Loading historical results data...');
  loadHistoricalResults();

  const allResults: Record<string, GameResult[]> = { ...existingResults };

  for (const date of dates) {
    const dateStr = date.toISOString().split('T')[0];
    console.log(`\n📅 Fetching results for ${dateStr}...`);

    for (const sport of sports) {
      console.log(`  ${sport}...`);

      const results = await fetchResultsForDate(apiKey, sport, date);

      if (results.length > 0) {
        // Merge with existing
        const existing = allResults[sport] || [];
        const existingIds = new Set(existing.map(r => r.id));
        const newResults = results.filter(r => !existingIds.has(r.id));

        allResults[sport] = [...existing, ...newResults];
        console.log(`    ✅ ${sport}: ${allResults[sport].length} total games (${newResults.length} new)`);
      } else {
        console.log(`    ⚠️  ${sport}: No results found`);
        if (!allResults[sport]) {
          allResults[sport] = [];
        }
      }

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  // Save combined results
  fs.writeFileSync(existingFile, JSON.stringify(allResults, null, 2), 'utf8');
  console.log(`✅ Results saved to ${existingFile}`);

  const totalGames = Object.values(allResults).reduce((sum, arr) => sum + arr.length, 0);
  console.log(`\n✅ Saved ${totalGames} total game results`);

  console.log('\n🎉 Complete!');
  console.log(`   - Generated ${allPicks.length} picks`);
  console.log(`   - Added results for ${dates.length} dates`);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

