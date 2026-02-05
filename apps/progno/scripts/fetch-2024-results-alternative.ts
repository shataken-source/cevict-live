/**
 * Fetch 2024 Game Results - Alternative Approach
 * Uses multiple strategies to get historical game results
 */

import fs from 'fs';
import path from 'path';
import { getPrimaryKey } from '../app/keys-store';

const SPORT_MAP: Record<string, string> = {
  'NFL': 'americanfootball_nfl',
  'NBA': 'basketball_nba',
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

/**
 * Strategy 1: Fetch recent completed games from The Odds API
 * (Can get last 30-90 days of completed games)
 */
async function fetchRecentCompletedGames(apiKey: string, sport: string, daysBack: number = 90): Promise<GameResult[]> {
  const sportKey = SPORT_MAP[sport];
  if (!sportKey) return [];

  try {
    const url = `https://api.the-odds-api.com/v4/sports/${sportKey}/scores/?daysFrom=${daysBack}&apiKey=${apiKey}`;
    const res = await fetch(url);

    if (!res.ok) {
      if (res.status === 422) {
        console.warn(`  The Odds API doesn't support ${daysBack} days back for ${sport}`);
        return [];
      }
      console.error(`  Failed: ${res.status}`);
      return [];
    }

    const data = await res.json();
    if (!Array.isArray(data)) return [];

    const results: GameResult[] = [];
    const cutoffDate = new Date('2024-01-01');

    for (const game of data) {
      if (!game.completed || !game.scores) continue;

      const gameDate = new Date(game.commence_time);
      if (gameDate < cutoffDate) continue; // Only 2024 games

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

      const winner = homeScore > awayScore ? homeTeam : awayTeam;

      results.push({
        id: game.id,
        sport,
        homeTeam,
        awayTeam,
        date: gameDate.toISOString(),
        homeScore,
        awayScore,
        winner
      });
    }

    return results;
  } catch (error) {
    console.error(`  Error fetching ${sport}:`, error);
    return [];
  }
}

/**
 * Strategy 2: Use ESPN scraping for historical data
 * (Fallback if API doesn't work)
 */
async function fetchFromESPN(sport: string): Promise<GameResult[]> {
  // TODO: Implement ESPN scraping for historical scores
  // This would require web scraping which is more complex
  console.warn(`  ESPN scraping not implemented for ${sport}`);
  return [];
}

/**
 * Strategy 3: Use SportsReference or similar free sources
 */
async function fetchFromFreeSource(sport: string): Promise<GameResult[]> {
  // TODO: Implement free source scraping
  // Options: SportsReference.com, team websites, etc.
  console.warn(`  Free source scraping not implemented for ${sport}`);
  return [];
}

function normalizeName(name: string): string {
  return name?.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '') || '';
}

async function main() {
  const apiKey = getPrimaryKey();
  if (!apiKey) {
    console.error('ODDS_API_KEY not found');
    process.exit(1);
  }

  const prognoDir = path.join(process.cwd(), '.progno');
  if (!fs.existsSync(prognoDir)) {
    fs.mkdirSync(prognoDir, { recursive: true });
  }

  const allResults: Record<string, GameResult[]> = {};
  const sports: string[] = ['NFL', 'NBA', 'NHL', 'NCAAF', 'NCAAB'];

  console.log('=== Fetching 2024 Game Results ===\n');
  console.log('Note: The Odds API has limited historical data.');
  console.log('Attempting to fetch recent completed games (last 90 days)...\n');

  for (const sport of sports) {
    console.log(`Fetching ${sport}...`);
    
    // Try The Odds API first (recent games)
    let results = await fetchRecentCompletedGames(apiKey, sport, 90);
    
    // If we got some results, try to get more by going back further in smaller chunks
    if (results.length > 0) {
      console.log(`  Found ${results.length} games from recent period`);
      
      // Try to get more by fetching in smaller chunks
      for (let days = 90; days <= 180; days += 30) {
        const chunkResults = await fetchRecentCompletedGames(apiKey, sport, days);
        // Merge new results
        const existingIds = new Set(results.map(r => r.id));
        const newResults = chunkResults.filter(r => !existingIds.has(r.id));
        results.push(...newResults);
        if (newResults.length > 0) {
          console.log(`  Added ${newResults.length} more games from ${days} days back`);
        }
        await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limit
      }
    } else {
      console.log(`  No games found from The Odds API`);
      console.log(`  Trying alternative sources...`);
      
      // Try ESPN (would need implementation)
      const espnResults = await fetchFromESPN(sport);
      if (espnResults.length > 0) {
        results = espnResults;
        console.log(`  Found ${results.length} games from ESPN`);
      }
    }

    // Filter to only 2024 games
    const start2024 = new Date('2024-01-01');
    const end2024 = new Date('2024-12-31');
    results = results.filter(r => {
      const date = new Date(r.date);
      return date >= start2024 && date <= end2024;
    });

    allResults[sport] = results;
    console.log(`✅ ${sport}: ${results.length} games from 2024\n`);

    // Save per sport
    const sportFile = path.join(prognoDir, `2024-results-${sport}.json`);
    fs.writeFileSync(sportFile, JSON.stringify(results, null, 2), 'utf8');
  }

  // Save combined
  const combinedFile = path.join(prognoDir, '2024-results-all-sports.json');
  fs.writeFileSync(combinedFile, JSON.stringify(allResults, null, 2), 'utf8');

  const totalGames = Object.values(allResults).reduce((sum, arr) => sum + arr.length, 0);
  console.log(`=== Summary ===`);
  console.log(`Total 2024 games: ${totalGames}`);
  for (const [sport, results] of Object.entries(allResults)) {
    console.log(`  ${sport}: ${results.length} games`);
  }
  console.log(`\n✅ Results saved to ${combinedFile}`);
  
  if (totalGames === 0) {
    console.log(`\n⚠️  WARNING: No games found.`);
    console.log(`The Odds API may not have historical data that far back.`);
    console.log(`Consider:`);
    console.log(`  1. Using a paid historical data API (SportsDataIO, etc.)`);
    console.log(`  2. Scraping ESPN or team websites`);
    console.log(`  3. Using the fine-tune script with whatever recent data is available`);
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

