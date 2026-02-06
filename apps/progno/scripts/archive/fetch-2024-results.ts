/**
 * Fetch 2024 Game Results for All Sports
 * Uses The Odds API to get historical game results for fine-tuning
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

async function fetchSportResults(apiKey: string, sport: string, startDate: Date, endDate: Date): Promise<GameResult[]> {
  const sportKey = SPORT_MAP[sport];
  if (!sportKey) {
    console.warn(`Unknown sport: ${sport}`);
    return [];
  }

  const results: GameResult[] = [];
  const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  
  // The Odds API scores endpoint can fetch up to 30 days at a time
  const chunkSize = 30;
  let currentDate = new Date(startDate);

  console.log(`Fetching ${sport} results from ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}...`);

  while (currentDate < endDate) {
    const chunkEnd = new Date(currentDate);
    chunkEnd.setDate(chunkEnd.getDate() + chunkSize);
    if (chunkEnd > endDate) chunkEnd.setTime(endDate.getTime());

    const daysFrom = Math.ceil((Date.now() - currentDate.getTime()) / (1000 * 60 * 60 * 24));
    
    try {
      const url = `https://api.the-odds-api.com/v4/sports/${sportKey}/scores/?daysFrom=${daysFrom}&apiKey=${apiKey}`;
      const res = await fetch(url);

      if (!res.ok) {
        console.error(`Failed to fetch ${sport}: ${res.status}`);
        currentDate = chunkEnd;
        continue;
      }

      const data = await res.json();
      if (!Array.isArray(data)) {
        console.warn(`Unexpected data format for ${sport}`);
        currentDate = chunkEnd;
        continue;
      }

      for (const game of data) {
        if (!game.completed || !game.scores || !Array.isArray(game.scores)) continue;

        const gameDate = new Date(game.commence_time);
        if (gameDate < startDate || gameDate > endDate) continue;

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

        // Try to get spread/total from bookmakers if available
        let spread: number | undefined;
        let total: number | undefined;
        if (game.bookmakers && game.bookmakers.length > 0) {
          const bookmaker = game.bookmakers[0];
          if (bookmaker.markets) {
            for (const market of bookmaker.markets) {
              if (market.key === 'spreads' && market.outcomes) {
                const homeOutcome = market.outcomes.find((o: any) => 
                  normalizeName(o.name) === normalizeName(homeTeam)
                );
                spread = homeOutcome?.point;
              }
              if (market.key === 'totals' && market.outcomes) {
                const overOutcome = market.outcomes.find((o: any) => 
                  o.name?.toLowerCase() === 'over'
                );
                total = overOutcome?.point;
              }
            }
          }
        }

        const winner = homeScore > awayScore ? homeTeam : awayTeam;
        const homeCovered = spread !== undefined ? (homeScore + spread) > awayScore : undefined;
        const overHit = total !== undefined ? (homeScore + awayScore) > total : undefined;

        results.push({
          id: game.id,
          sport,
          homeTeam,
          awayTeam,
          date: gameDate.toISOString(),
          homeScore,
          awayScore,
          spread,
          total,
          homeCovered,
          overHit,
          winner
        });
      }

      console.log(`  Found ${data.filter((g: any) => g.completed).length} completed games in chunk`);
    } catch (error) {
      console.error(`Error fetching ${sport} chunk:`, error);
    }

    currentDate = chunkEnd;
    
    // Rate limiting - wait a bit between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  return results;
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

  // 2024 date range
  const startDate = new Date('2024-01-01');
  const endDate = new Date('2024-12-31');

  const allResults: Record<string, GameResult[]> = {};

  const sports: string[] = ['NFL', 'NBA', 'NHL', 'NCAAF', 'NCAAB'];

  for (const sport of sports) {
    console.log(`\n=== Fetching ${sport} 2024 Results ===`);
    const results = await fetchSportResults(apiKey, sport, startDate, endDate);
    allResults[sport] = results;
    console.log(`✅ ${sport}: ${results.length} games found`);

    // Save per sport
    const sportFile = path.join(prognoDir, `2024-results-${sport}.json`);
    fs.writeFileSync(sportFile, JSON.stringify(results, null, 2), 'utf8');
    console.log(`   Saved to ${sportFile}`);
  }

  // Save combined
  const combinedFile = path.join(prognoDir, '2024-results-all-sports.json');
  fs.writeFileSync(combinedFile, JSON.stringify(allResults, null, 2), 'utf8');

  const totalGames = Object.values(allResults).reduce((sum, arr) => sum + arr.length, 0);
  console.log(`\n=== Summary ===`);
  console.log(`Total games: ${totalGames}`);
  for (const [sport, results] of Object.entries(allResults)) {
    console.log(`  ${sport}: ${results.length} games`);
  }
  console.log(`\n✅ All results saved to ${combinedFile}`);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

