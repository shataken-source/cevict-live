/**
 * Test script to verify all odds APIs
 * Run with: npx ts-node scripts/test-api-status.ts
 */

import { DraftKingsPlugin } from '../lib/odds-sources/draftkings-plugin';
import { VegasInsiderPlugin } from '../lib/odds-sources/vegas-insider-plugin';
import { APISportsPlugin } from '../lib/odds-sources/api-sports-plugin';

async function testAPIs() {
  console.log('=== Testing Odds APIs ===\n');
  
  const sports = ['nhl', 'nba', 'nfl', 'mlb', 'ncaab'];
  
  // Test DraftKings
  console.log('--- DraftKings API ---');
  for (const sport of sports.slice(0, 2)) {
    try {
      const result = await DraftKingsPlugin.fetchOdds(sport);
      console.log(`✓ ${sport}: ${result.length} games`);
    } catch (error: any) {
      console.log(`✗ ${sport}: ${error.message}`);
    }
  }
  
  // Test VegasInsider
  console.log('\n--- VegasInsider API ---');
  for (const sport of sports.slice(0, 2)) {
    try {
      const result = await VegasInsiderPlugin.fetchOdds(sport);
      console.log(`✓ ${sport}: ${result.length} games`);
    } catch (error: any) {
      console.log(`✗ ${sport}: ${error.message}`);
    }
  }
  
  // Test API-SPORTS
  console.log('\n--- API-SPORTS API ---');
  for (const sport of sports) {
    try {
      const result = await APISportsPlugin.fetchOdds(sport);
      console.log(`✓ ${sport}: ${result.length} games`);
    } catch (error: any) {
      console.log(`✗ ${sport}: ${error.message}`);
    }
  }
  
  console.log('\n=== Test Complete ===');
}

testAPIs().catch(console.error);
