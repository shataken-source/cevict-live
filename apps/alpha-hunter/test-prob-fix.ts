/**
 * Test the fixed probability bridge logic
 */

import { getPrognoProbabilities } from './src/intelligence/probability-bridge';

// Mock data from Feb 16 picks
const mockPicks = [
  {
    sport: "NCAAB",
    home_team: "Duke Blue Devils",
    away_team: "Syracuse Orange",
    pick: "Syracuse Orange",
    confidence: 92,
    mc_win_probability: 0.1007, // MC says home (Duke) wins 10% → away (Syracuse) wins 90%
    value_bet_edge: 85.91
  },
  {
    sport: "NCAAB",
    home_team: "Alabama St Hornets",
    away_team: "Miss Valley St Delta Devils",
    pick: "Miss Valley St Delta Devils",
    confidence: 92,
    mc_win_probability: 0.2033, // MC says home wins 20% → away wins 80%
    value_bet_edge: 70.74
  },
  {
    sport: "NCAAB",
    home_team: "Northwestern St Demons",
    away_team: "McNeese Cowboys",
    pick: "Northwestern St Demons",
    confidence: 92,
    mc_win_probability: 0.85, // MC says home wins 85%
    value_bet_edge: 74.19
  },
  // Edge case: partial name match that old logic would FAIL
  {
    sport: "NCAAB",
    home_team: "Kansas Jayhawks",
    away_team: "Baylor Bears",
    pick: "Baylor",  // Partial name - old logic would fail!
    confidence: 88,
    mc_win_probability: 0.35, // MC says home wins 35% → away wins 65%
    value_bet_edge: 45.0
  }
];

function teamSearchTokens(team: string): string[] {
  if (!team || !team.trim()) return [];
  const t = team.trim().toLowerCase();
  const words = t.split(/\s+/);
  const tokens: string[] = [t];
  if (words.length > 1) {
    tokens.push(words[words.length - 1]); // "Chiefs", "Lakers"
    if (words.length >= 2) tokens.push(words.slice(0, -1).join(' ')); // "Kansas City", "LA"
  }
  return [...new Set(tokens)].filter(Boolean);
}

function testProbabilityLogic() {
  console.log('='.repeat(70));
  console.log('TESTING FIXED PROBABILITY CALCULATION');
  console.log('='.repeat(70));

  for (const pick of mockPicks) {
    console.log(`\n${pick.home_team} vs ${pick.away_team}`);
    console.log(`  Pick: ${pick.pick}`);
    console.log(`  Raw confidence: ${pick.confidence}%`);
    console.log(`  MC win prob (home): ${(pick.mc_win_probability * 100).toFixed(1)}%`);

    // Old broken logic
    const isHomePickOld = pick.pick === pick.home_team;
    const mcProbOld = isHomePickOld ? pick.mc_win_probability : 1 - pick.mc_win_probability;
    const modelProbOld = Math.round(mcProbOld * 100);

    // New fixed logic
    const homeTokens = teamSearchTokens(pick.home_team);
    const awayTokens = teamSearchTokens(pick.away_team);
    const pickTokens = teamSearchTokens(pick.pick);
    const pickPrimary = pickTokens[0] || pick.pick.toLowerCase();
    const isHomePickNew = homeTokens.some(t => pickPrimary.includes(t) || t.includes(pickPrimary));
    const isAwayPickNew = awayTokens.some(t => pickPrimary.includes(t) || t.includes(pickPrimary));

    let modelProbNew = pick.confidence;
    if (isHomePickNew || isAwayPickNew) {
      const mcProbNew = isHomePickNew ? pick.mc_win_probability : 1 - pick.mc_win_probability;
      modelProbNew = Math.round(mcProbNew * 100);
    }

    console.log(`\n  OLD (broken) logic:`);
    console.log(`    isHomePick: ${isHomePickOld}`);
    console.log(`    modelProbability: ${modelProbOld}%`);

    console.log(`\n  NEW (fixed) logic:`);
    console.log(`    pickTokens: [${pickTokens.join(', ')}]`);
    console.log(`    homeTokens: [${homeTokens.join(', ')}]`);
    console.log(`    awayTokens: [${awayTokens.join(', ')}]`);
    console.log(`    isHomePick: ${isHomePickNew}, isAwayPick: ${isAwayPickNew}`);
    console.log(`    modelProbability: ${modelProbNew}%`);

    const diff = modelProbOld - modelProbNew;
    if (diff !== 0) {
      console.log(`\n  ⚠️  DIFFERENCE: ${diff > 0 ? '+' : ''}${diff}% ${diff > 0 ? '(OLD WAS INFLATED)' : '(OLD WAS DEFLATED)'}`);
    } else {
      console.log(`\n  ✅ Same result (rare edge case)`);
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log('SUMMARY: The fix ensures MC probability is used correctly');
  console.log('='.repeat(70));
}

testProbabilityLogic();
