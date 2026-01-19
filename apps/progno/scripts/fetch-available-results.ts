/**
 * Fetch Available Game Results
 * Gets whatever historical data is available from The Odds API
 * Then can be supplemented with manual data imports
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

function normalizeName(name: string): string {
  return name?.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '') || '';
}

async function fetchAvailableGames(apiKey: string, sport: string, maxDays: number = 30): Promise<GameResult[]> {
  const sportKey = SPORT_MAP[sport];
  if (!sportKey) return [];

  const results: GameResult[] = [];
  
  // Try different day ranges to see what's available
  const dayRanges = [3, 7, 14, 30, 60, 90];
  
  for (const days of dayRanges) {
    if (days > maxDays) break;
    
    try {
      const url = `https://api.the-odds-api.com/v4/sports/${sportKey}/scores/?daysFrom=${days}&apiKey=${apiKey}`;
      const res = await fetch(url);

      if (!res.ok) {
        if (res.status === 422) {
          // This range not supported, try next
          continue;
        }
        console.warn(`  ${days} days: HTTP ${res.status}`);
        continue;
      }

      const data = await res.json();
      if (!Array.isArray(data)) continue;

      for (const game of data) {
        if (!game.completed || !game.scores) continue;

        const gameDate = new Date(game.commence_time);
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

        // Check if we already have this game
        const exists = results.some(r => r.id === game.id);
        if (exists) continue;

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

      console.log(`  ${days} days back: ${data.filter((g: any) => g.completed).length} completed games`);
      
      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.warn(`  ${days} days: Error - ${error}`);
    }
  }

  return results;
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

  // Load existing results if any
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

  const allResults: Record<string, GameResult[]> = { ...existingResults };
  const sports: string[] = ['NFL', 'NBA', 'NHL', 'NCAAF', 'NCAAB'];

  console.log('=== Fetching Available Game Results ===\n');
  console.log('Getting whatever historical data The Odds API provides...\n');

  for (const sport of sports) {
    console.log(`Fetching ${sport}...`);
    
    const results = await fetchAvailableGames(apiKey, sport, 90);
    
    if (results.length > 0) {
      // Merge with existing
      const existing = allResults[sport] || [];
      const existingIds = new Set(existing.map(r => r.id));
      const newResults = results.filter(r => !existingIds.has(r.id));
      
      allResults[sport] = [...existing, ...newResults];
      console.log(`✅ ${sport}: ${allResults[sport].length} total games (${newResults.length} new)`);
    } else {
      console.log(`⚠️  ${sport}: No games found from API`);
      if (!allResults[sport]) {
        allResults[sport] = [];
      }
    }
    console.log('');
  }

  // Save combined
  const combinedFile = path.join(prognoDir, '2024-results-all-sports.json');
  fs.writeFileSync(combinedFile, JSON.stringify(allResults, null, 2), 'utf8');

  const totalGames = Object.values(allResults).reduce((sum, arr) => sum + arr.length, 0);
  console.log(`=== Summary ===`);
  console.log(`Total games collected: ${totalGames}`);
  for (const [sport, results] of Object.entries(allResults)) {
    const dateRange = results.length > 0 ? {
      earliest: new Date(Math.min(...results.map(r => new Date(r.date).getTime()))).toISOString().split('T')[0],
      latest: new Date(Math.max(...results.map(r => new Date(r.date).getTime()))).toISOString().split('T')[0]
    } : null;
    console.log(`  ${sport}: ${results.length} games${dateRange ? ` (${dateRange.earliest} to ${dateRange.latest})` : ''}`);
  }
  console.log(`\n✅ Results saved to ${combinedFile}`);
  
  if (totalGames === 0) {
    console.log(`\n⚠️  No games found from The Odds API.`);
    console.log(`\nTo get 2024 data, you can:`);
    console.log(`  1. Manually import data using import-results.ts`);
    console.log(`  2. Use a paid API like SportsDataIO`);
    console.log(`  3. Scrape ESPN or team websites`);
  } else {
    console.log(`\n💡 Tip: You can supplement this data by:`);
    console.log(`  - Running this script periodically to collect more recent games`);
    console.log(`  - Using import-results.ts to add manually collected data`);
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

