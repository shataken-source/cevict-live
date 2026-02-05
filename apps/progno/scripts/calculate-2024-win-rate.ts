/**
 * Complete 2024 Win Rate Calculator
 *
 * This script:
 * 1. Fetches 2024 NFL games with odds from The Odds API
 * 2. Makes predictions for those games
 * 3. Gets actual results from completed games
 * 4. Calculates win rates by week
 */

import fs from 'fs';
import path from 'path';
import { getPrimaryKey } from '../app/keys-store';
import { predictionEngine } from '../app/lib/prediction-engine';

interface GameWithOdds {
  id: string;
  homeTeam: string;
  awayTeam: string;
  date: string;
  odds?: {
    home: number;
    away: number;
    spread?: number;
    total?: number;
  };
  completed: boolean;
  actualScore?: {
    home: number;
    away: number;
  };
  actualWinner?: string;
}

interface PredictionResult {
  gameId: string;
  homeTeam: string;
  awayTeam: string;
  date: string;
  predictedWinner: string;
  confidence: number;
  actualWinner?: string;
  correct?: boolean;
  week: number;
}

/**
 * Get NFL week number from date
 */
function getNFLWeek(date: Date): number {
  // NFL 2024 season started September 5, 2024 (Week 1)
  const seasonStart = new Date('2024-09-05');
  const diffTime = date.getTime() - seasonStart.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return 0; // Before season

  const week = Math.floor(diffDays / 7) + 1;
  return Math.min(week, 18); // Cap at 18 weeks
}

/**
 * Normalize team name for matching
 */
function normalizeTeamName(name: string): string {
  if (!name) return '';
  // Simple normalization - just lowercase and remove special chars
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ');
}

/**
 * Fetch 2024 NFL games with odds from The Odds API
 */
async function fetch2024NFLGames(apiKey: string): Promise<GameWithOdds[]> {
  console.log('📡 Fetching 2024 NFL games from The Odds API...');

  const games: GameWithOdds[] = [];
  const sportKey = 'americanfootball_nfl';

  // Fetch upcoming games (with odds)
  try {
    const oddsUrl = `https://api.the-odds-api.com/v4/sports/${sportKey}/odds/?apiKey=${apiKey}&regions=us&markets=h2h,spreads,totals&oddsFormat=american&dateFormat=iso`;
    const oddsRes = await fetch(oddsUrl);

    if (oddsRes.ok) {
      const oddsData = await oddsRes.json();
      for (const game of oddsData || []) {
        const bookmaker = game.bookmakers?.[0];
        const h2h = bookmaker?.markets?.find((m: any) => m.key === 'h2h');
        const spreads = bookmaker?.markets?.find((m: any) => m.key === 'spreads');
        const totals = bookmaker?.markets?.find((m: any) => m.key === 'totals');

        const homeOutcome = h2h?.outcomes?.find((o: any) => o.name === game.home_team);
        const awayOutcome = h2h?.outcomes?.find((o: any) => o.name === game.away_team);
        const spreadOutcome = spreads?.outcomes?.find((o: any) => o.name === game.home_team);
        const totalOutcome = totals?.outcomes?.[0];

        games.push({
          id: game.id,
          homeTeam: game.home_team,
          awayTeam: game.away_team,
          date: game.commence_time,
          odds: {
            home: homeOutcome?.price || -110,
            away: awayOutcome?.price || -110,
            spread: spreadOutcome?.point,
            total: totalOutcome?.point
          },
          completed: false
        });
      }
      console.log(`  ✅ Found ${games.length} upcoming games with odds`);
    }
  } catch (error) {
    console.warn('  ⚠️  Failed to fetch odds:', error);
  }

  // Fetch completed games (with results)
  try {
    // Try to get games from last 180 days (covers most of 2024 season)
    for (let daysBack = 30; daysBack <= 180; daysBack += 30) {
      const scoresUrl = `https://api.the-odds-api.com/v4/sports/${sportKey}/scores/?daysFrom=${daysBack}&apiKey=${apiKey}`;
      const scoresRes = await fetch(scoresUrl);

      if (scoresRes.ok) {
        const scoresData = await scoresRes.json();
        for (const game of scoresData || []) {
          if (!game.completed || !game.scores) continue;

          const gameDate = new Date(game.commence_time);
          if (gameDate < new Date('2024-01-01') || gameDate > new Date('2024-12-31')) continue;

          // Find scores by matching team names (case-insensitive, flexible matching)
          const homeScoreEntry = game.scores.find((s: any) => {
            const scoreName = normalizeTeamName(s.name || '');
            const homeName = normalizeTeamName(game.home_team || '');
            return scoreName.includes(homeName) || homeName.includes(scoreName);
          });
          const awayScoreEntry = game.scores.find((s: any) => {
            const scoreName = normalizeTeamName(s.name || '');
            const awayName = normalizeTeamName(game.away_team || '');
            return scoreName.includes(awayName) || awayName.includes(scoreName);
          });

          const homeScore = Number(homeScoreEntry?.score || homeScoreEntry?.points || 0);
          const awayScore = Number(awayScoreEntry?.score || awayScoreEntry?.points || 0);

          if (homeScore === 0 && awayScore === 0) continue;

          const actualWinner = homeScore > awayScore ? game.home_team : game.away_team;

          // Check if we already have this game
          const existingIndex = games.findIndex(g => g.id === game.id);
          if (existingIndex >= 0) {
            // Update with results
            games[existingIndex].completed = true;
            games[existingIndex].actualScore = { home: homeScore, away: awayScore };
            games[existingIndex].actualWinner = actualWinner;
          } else {
            // Add new completed game
            games.push({
              id: game.id,
              homeTeam: game.home_team,
              awayTeam: game.away_team,
              date: game.commence_time,
              completed: true,
              actualScore: { home: homeScore, away: awayScore },
              actualWinner: actualWinner
            });
          }
        }
        console.log(`  ✅ Found completed games from ${daysBack} days back`);
      }

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  } catch (error) {
    console.warn('  ⚠️  Failed to fetch scores:', error);
  }

  // Filter to only 2024 games
  const filteredGames = games.filter(g => {
    const gameDate = new Date(g.date);
    return gameDate >= new Date('2024-01-01') && gameDate <= new Date('2024-12-31');
  });

  console.log(`\n📊 Total 2024 games found: ${filteredGames.length}`);
  console.log(`   Completed: ${filteredGames.filter(g => g.completed).length}`);
  console.log(`   Upcoming: ${filteredGames.filter(g => !g.completed).length}`);

  return filteredGames;
}

/**
 * Make predictions for games
 */
async function makePredictions(games: GameWithOdds[]): Promise<PredictionResult[]> {
  console.log('\n🔮 Making predictions for games...');

  const predictions: PredictionResult[] = [];

  for (const game of games) {
    try {
      // Skip if no odds available (can't make good prediction)
      if (!game.odds) {
        console.log(`  ⚠️  Skipping ${game.homeTeam} vs ${game.awayTeam} (no odds)`);
        continue;
      }

      const gameDate = new Date(game.date);
      const week = getNFLWeek(gameDate);

      // Convert to GameData format for prediction engine
      const gameData = {
        homeTeam: game.homeTeam,
        awayTeam: game.awayTeam,
        league: 'NFL',
        sport: 'NFL',
        date: game.date,
        odds: {
          home: game.odds.home,
          away: game.odds.away,
          spread: game.odds.spread,
          total: game.odds.total
        }
      };

      const prediction = await predictionEngine.predict(gameData);

      predictions.push({
        gameId: game.id,
        homeTeam: game.homeTeam,
        awayTeam: game.awayTeam,
        date: game.date,
        predictedWinner: prediction.predictedWinner,
        confidence: prediction.confidence,
        actualWinner: game.actualWinner,
        correct: game.actualWinner ? prediction.predictedWinner === game.actualWinner : undefined,
        week
      });

      if (predictions.length % 10 === 0) {
        console.log(`  ✅ Processed ${predictions.length} predictions...`);
      }
    } catch (error) {
      console.warn(`  ⚠️  Failed to predict ${game.homeTeam} vs ${game.awayTeam}:`, error);
    }
  }

  console.log(`\n✅ Made ${predictions.length} predictions`);
  return predictions;
}

/**
 * Calculate win rates by week
 */
function calculateWinRates(predictions: PredictionResult[]): void {
  console.log('\n📊 Calculating Win Rates by Week...\n');

  const weekResults = new Map<number, { correct: number; total: number }>();

  // Group by week
  for (const pred of predictions) {
    if (pred.correct === undefined) continue; // Skip games without results

    const week = pred.week;
    const stats = weekResults.get(week) || { correct: 0, total: 0 };
    stats.total++;
    if (pred.correct) stats.correct++;
    weekResults.set(week, stats);
  }

  // Calculate and display
  const weeks = Array.from(weekResults.keys()).sort((a, b) => a - b);

  for (const week of weeks) {
    const stats = weekResults.get(week)!;
    const winRate = stats.total > 0 ? (stats.correct / stats.total) * 100 : 0;
    console.log(`📅 Week ${week}: ${stats.correct}/${stats.total} correct (${winRate.toFixed(2)}% win rate)`);
  }

  // Overall stats
  const totalCorrect = Array.from(weekResults.values()).reduce((sum, s) => sum + s.correct, 0);
  const totalGames = Array.from(weekResults.values()).reduce((sum, s) => sum + s.total, 0);
  const overallWinRate = totalGames > 0 ? (totalCorrect / totalGames) * 100 : 0;

  console.log(`\n${'='.repeat(60)}`);
  console.log(`📈 Overall: ${totalCorrect}/${totalGames} correct (${overallWinRate.toFixed(2)}% win rate)`);
  console.log(`${'='.repeat(60)}\n`);

  // Save results
  const resultsDir = path.join(process.cwd(), '.progno');
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }

  const resultsFile = path.join(resultsDir, '2024-win-rate-results.json');
  fs.writeFileSync(resultsFile, JSON.stringify({
    overall: {
      correct: totalCorrect,
      total: totalGames,
      winRate: overallWinRate
    },
    byWeek: Object.fromEntries(
      Array.from(weekResults.entries()).map(([week, stats]) => [
        week,
        {
          correct: stats.correct,
          total: stats.total,
          winRate: (stats.correct / stats.total) * 100
        }
      ])
    ),
    predictions: predictions
  }, null, 2));

  console.log(`💾 Results saved to: ${resultsFile}`);
}

/**
 * Main execution
 */
async function main() {
  // Load environment variables from .env.local if it exists
  const envPath = path.join(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const lines = envContent.split('\n');
    for (const line of lines) {
      // Skip comments and empty lines
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      // Match ODDS_API_KEY=value (with or without quotes)
      const match = trimmed.match(/^ODDS_API_KEY=(.+)$/);
      if (match) {
        let value = match[1].trim();
        // Remove quotes if present
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        process.env.ODDS_API_KEY = value;
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

  try {
    // Step 1: Fetch 2024 games with odds and results
    const games = await fetch2024NFLGames(apiKey);

    if (games.length === 0) {
      console.error('❌ No games found. Check your API key and try again.');
      process.exit(1);
    }

    // Step 2: Make predictions
    const predictions = await makePredictions(games);

    // Step 3: Calculate win rates
    calculateWinRates(predictions);

    console.log('\n✅ Win rate calculation complete!');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export { calculateWinRates, fetch2024NFLGames, makePredictions };

