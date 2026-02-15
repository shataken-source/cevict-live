// Diagnostic test for odds fetching
import { fetchApiSportsOdds } from '../lib/api-sports-client';
import { OddsService } from '../lib/odds-service';

async function diagnose() {
  console.log('=== DIAGNOSTIC: Odds Fetching ===\n');
  
  // Test 1: Check API-SPORTS config
  console.log('1. Checking API-SPORTS configuration...');
  const sports = ['nhl', 'nba', 'nfl', 'mlb', 'ncaab', 'ncaaf'];
  for (const sport of sports) {
    try {
      console.log(`   Testing ${sport.toUpperCase()}...`);
      const games = await fetchApiSportsOdds(sport);
      console.log(`   ✅ ${sport.toUpperCase()}: ${games.length} games`);
    } catch (error) {
      console.log(`   ❌ ${sport.toUpperCase()}:`, error);
    }
  }
  
  // Test 2: Check OddsService integration
  console.log('\n2. Checking OddsService integration...');
  try {
    const nhlGames = await OddsService.getGames({ sport: 'nhl' });
    console.log(`   ✅ OddsService NHL: ${nhlGames.length} games`);
  } catch (error) {
    console.log(`   ❌ OddsService failed:`, error);
  }
  
  console.log('\n=== DIAGNOSTIC COMPLETE ===');
}

diagnose();
