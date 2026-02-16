/**
 * Test script to verify PROGNO -> Prognostication tier integration
 * 
 * This script tests that picks are correctly assigned tiers and
 * will be properly filtered when syndicated to Prognostication.
 */

import { TierAssignmentService, TIER_CONFIGS } from '../app/lib/tier-assignment-service';

// Mock picks with different confidence levels to test tier assignment
const testPicks = [
  {
    id: 'pick-1',
    sport: 'nhl',
    homeTeam: 'Rangers',
    awayTeam: 'Islanders',
    pick: 'Rangers',
    confidence: 85, // Should be ELITE
    edge: 4.5,
    keyFactors: ['Home advantage', 'Goaltending edge', 'Recent form'],
    pickType: 'moneyline' as const,
    gameTime: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  },
  {
    id: 'pick-2',
    sport: 'nba',
    homeTeam: 'Lakers',
    awayTeam: 'Celtics',
    pick: 'Lakers',
    confidence: 72, // Should be PREMIUM
    edge: 3.2,
    keyFactors: ['Star player matchup', 'Home court'],
    pickType: 'moneyline' as const,
    gameTime: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  },
  {
    id: 'pick-3',
    sport: 'nfl',
    homeTeam: 'Chiefs',
    awayTeam: 'Bills',
    pick: 'Chiefs',
    confidence: 58, // Should be FREE
    edge: 1.8,
    keyFactors: ['Weather conditions'],
    pickType: 'moneyline' as const,
    gameTime: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  },
  {
    id: 'pick-4',
    sport: 'mlb',
    homeTeam: 'Yankees',
    awayTeam: 'Red Sox',
    pick: 'Yankees',
    confidence: 91, // Should be ELITE
    edge: 5.5,
    keyFactors: ['Pitching matchup', 'Bullpen advantage', 'Park factors', 'Historical trends'],
    pickType: 'moneyline' as const,
    gameTime: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  },
  {
    id: 'pick-5',
    sport: 'nhl',
    homeTeam: 'Bruins',
    awayTeam: 'Panthers',
    pick: 'Bruins',
    confidence: 68, // Should be PREMIUM
    edge: 2.9,
    keyFactors: ['Defensive metrics', 'Special teams'],
    pickType: 'moneyline' as const,
    gameTime: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  },
  {
    id: 'pick-6',
    sport: 'nba',
    homeTeam: 'Warriors',
    awayTeam: 'Suns',
    pick: 'Warriors',
    confidence: 45, // Should be FREE (low confidence)
    edge: 0.5,
    keyFactors: [],
    pickType: 'moneyline' as const,
    gameTime: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  },
];

console.log('=====================================');
console.log('PROGNO -> PROGNOSTICATION TIER INTEGRATION TEST');
console.log('=====================================');
console.log();

// Test 1: Tier Assignment
console.log('Test 1: Tier Assignment');
console.log('-------------------------------------');
const assignedPicks = TierAssignmentService.assignTiers(testPicks);

assignedPicks.forEach(pick => {
  console.log(`${pick.id}: ${pick.homeTeam} vs ${pick.awayTeam}`);
  console.log(`  Confidence: ${pick.confidence}%`);
  console.log(`  Assigned Tier: ${pick.tier?.toUpperCase() || 'UNASSIGNED'}`);
  console.log(`  Expected Tier: ${
    pick.confidence >= 80 ? 'ELITE' : 
    pick.confidence >= 65 ? 'PREMIUM' : 'FREE'
  }`);
  console.log(`  ✓ ${pick.tier === (pick.confidence >= 80 ? 'elite' : pick.confidence >= 65 ? 'premium' : 'free') ? 'CORRECT' : 'INCORRECT'}`);
  console.log();
});

// Test 2: Tier Filtering (as done in syndication route)
console.log('Test 2: Tier Filtering for Syndication');
console.log('-------------------------------------');

const tiers = ['elite', 'premium', 'free'] as const;
tiers.forEach(tier => {
  const tierPicks = TierAssignmentService.filterByTier(assignedPicks, tier);
  console.log(`${tier.toUpperCase()} Tier:`);
  console.log(`  Count: ${tierPicks.length}`);
  console.log(`  Max Allowed: ${TIER_CONFIGS[tier].maxPicks || 'N/A'}`);
  tierPicks.forEach(pick => {
    console.log(`    - ${pick.homeTeam} (${pick.confidence}%)`);
  });
  console.log();
});

// Test 3: Tier Statistics
console.log('Test 3: Tier Statistics');
console.log('-------------------------------------');
const stats = TierAssignmentService.getTierStats(assignedPicks);
Object.entries(stats).forEach(([tier, stat]) => {
  console.log(`${tier.toUpperCase()}:`);
  console.log(`  Count: ${stat.count}`);
  console.log(`  Avg Confidence: ${stat.avgConfidence.toFixed(1)}%`);
  console.log(`  Avg Edge: ${stat.avgEdge.toFixed(1)}`);
  console.log();
});

// Test 4: Prognostication Syndication Simulation
console.log('Test 4: Prognostication Syndication Simulation');
console.log('-------------------------------------');

// This mimics what the syndication route does
function determinePickTierForPrognostication(pick: any): 'free' | 'premium' | 'elite' {
  const confidence = pick.confidence;
  const edge = pick.edge || 0;
  const compositeScore = confidence + (edge * 2) + (pick.keyFactors?.length || 0) * 2;
  
  if (compositeScore >= 80) return 'elite';
  if (compositeScore >= 65) return 'premium';
  return 'free';
}

// Verify tiers match between PROGNO and Prognostication
console.log('Verifying tier consistency between PROGNO and Prognostication:');
let allMatch = true;
assignedPicks.forEach(pick => {
  const prognoTier = pick.tier;
  const prognosticationTier = determinePickTierForPrognostication(pick);
  const match = prognoTier === prognosticationTier;
  if (!match) allMatch = false;
  
  console.log(`${pick.id}: PROGNO=${prognoTier} | Prognostication=${prognosticationTier} ${match ? '✓' : '✗'}`);
});

console.log();
console.log('=====================================');
console.log(allMatch ? '✓ ALL TIER ASSIGNMENTS MATCH' : '✗ TIER MISMATCHES FOUND');
console.log('=====================================');

// Summary
console.log();
console.log('Summary:');
console.log(`  Total Picks: ${testPicks.length}`);
console.log(`  Elite: ${stats.elite.count} (max ${TIER_CONFIGS.elite.maxPicks})`);
console.log(`  Premium: ${stats.premium.count} (max ${TIER_CONFIGS.premium.maxPicks})`);
console.log(`  Free: ${stats.free.count} (max ${TIER_CONFIGS.free.maxPicks})`);
console.log(`  Early: ${stats.early.count}`);
console.log(`  Arbitrage: ${stats.arbitrage.count}`);
console.log();
console.log('Tier thresholds for Prognostication:');
console.log('  Elite: Composite score ≥ 80 (confidence + edge*2 + keyFactors*2)');
console.log('  Premium: Composite score ≥ 65');
console.log('  Free: Composite score < 65');
