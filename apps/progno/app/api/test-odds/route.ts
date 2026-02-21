import { NextResponse } from 'next/server';
import { fetchApiSportsOdds } from '@/app/lib/api-sports-client';
import { OddsService } from '@/app/lib/odds-service';

export async function GET() {
  const results: Record<string, any> = {};
  
  // Test API-SPORTS directly
  try {
    const nhlGames = await fetchApiSportsOdds('nhl');
    results.apiSports = {
      nhl: nhlGames.length,
      sample: nhlGames[0] || null
    };
  } catch (error) {
    results.apiSports = { error: String(error) };
  }
  
  // Test OddsService
  try {
    const serviceGames = await OddsService.getGames({ sport: 'nhl' });
    results.oddsService = {
      count: serviceGames.length,
      sample: serviceGames[0] || null
    };
  } catch (error) {
    results.oddsService = { error: String(error) };
  }
  
  // Test other sports
  for (const sport of ['nba', 'nfl', 'mlb']) {
    try {
      const games = await fetchApiSportsOdds(sport);
      results[sport] = games.length;
    } catch (error) {
      results[sport] = { error: String(error) };
    }
  }
  
  return NextResponse.json({
    timestamp: new Date().toISOString(),
    results
  });
}
