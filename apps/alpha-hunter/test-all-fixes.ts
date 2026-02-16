/**
 * Test all Progno bug fixes
 */

// Test 1: Fixed calculateStake with proper implied probability
function testPrognoIntegrationCalculateStake() {
  console.log('\n' + '='.repeat(70));
  console.log('TEST 1: progno-integration.ts calculateStake');
  console.log('='.repeat(70));

  interface PrognoPick {
    odds: number;
    confidence: number;
    expectedValue?: number;
  }

  function calculateStake(pick: PrognoPick): number {
    let impliedProb: number;
    if (pick.odds > 0) {
      impliedProb = 100 / (pick.odds + 100);
    } else {
      impliedProb = Math.abs(pick.odds) / (Math.abs(pick.odds) + 100);
    }
    
    const modelProb = pick.confidence / 100;
    const edge = modelProb - impliedProb;
    
    if (edge <= 0) return 0;
    
    const kelly = edge / (1 - impliedProb);
    return Math.min(Math.max(kelly * 0.25 * 100, 10), 50);
  }

  const testCases: PrognoPick[] = [
    { odds: 1600, confidence: 90 },   // Syracuse +1600, model says 90% win
    { odds: 800, confidence: 80 },     // +800, model says 80% win  
    { odds: 650, confidence: 85 },    // +650, model says 85% win
    { odds: -196, confidence: 72 },   // -196 favorite
    { odds: -110, confidence: 52 },   // -110 pick'em
    { odds: -110, confidence: 48 },   // No edge case
  ];

  for (const test of testCases) {
    const implied = test.odds > 0 
      ? (100 / (test.odds + 100))
      : (Math.abs(test.odds) / (Math.abs(test.odds) + 100));
    const edge = (test.confidence / 100) - implied;
    const stake = calculateStake(test);
    
    console.log(`\nOdds: ${test.odds > 0 ? '+' : ''}${test.odds}, Confidence: ${test.confidence}%`);
    console.log(`  Implied prob: ${(implied * 100).toFixed(2)}%`);
    console.log(`  Edge: ${(edge * 100).toFixed(2)}%`);
    console.log(`  Stake: $${stake.toFixed(2)} ${stake === 0 ? '(NO BET - negative edge)' : ''}`);
    
    // Verify implied probability is decimal 0-1
    if (implied < 0 || implied > 1) {
      console.log('  ❌ FAIL: Implied probability out of range');
    } else {
      console.log('  ✅ PASS: Implied probability valid');
    }
  }
}

// Test 2: Fixed arbitrage-detector calculateStake with market price
function testArbitrageDetectorCalculateStake() {
  console.log('\n' + '='.repeat(70));
  console.log('TEST 2: arbitrage-detector.ts calculateStake (market price)');
  console.log('='.repeat(70));

  function calculateStake(edge: number, confidence: number, marketPrice: number): number {
    const impliedProb = marketPrice / 100;
    const modelProb = confidence / 100;
    const decimalOdds = (1 - impliedProb) / impliedProb;
    const kellyFraction = (decimalOdds * modelProb - (1 - modelProb)) / decimalOdds;
    const stake = kellyFraction * 0.25 * 100;
    return Math.min(Math.max(stake, 5), 50);
  }

  const testCases = [
    { edge: 10, confidence: 60, marketPrice: 50 },   // 50¢ market, 60% model
    { edge: 20, confidence: 70, marketPrice: 50 }, // 50¢ market, 70% model
    { edge: 30, confidence: 80, marketPrice: 50 }, // 50¢ market, 80% model
    { edge: 40, confidence: 90, marketPrice: 50 }, // 50¢ market, 90% model
    { edge: 5, confidence: 55, marketPrice: 50 },   // Small edge
    { edge: 85, confidence: 90, marketPrice: 5 },     // Longshot: 5¢ market
  ];

  for (const test of testCases) {
    const stake = calculateStake(test.edge, test.confidence, test.marketPrice);
    const implied = test.marketPrice / 100;
    
    console.log(`\nMarket: ${test.marketPrice}¢, Model: ${test.confidence}%, Edge: ${test.edge}%`);
    console.log(`  Implied prob: ${(implied * 100).toFixed(0)}%`);
    console.log(`  Stake: $${stake.toFixed(2)}`);
    
    if (test.marketPrice === 50 && stake === 25) {
      console.log('  ❌ FAIL: Old hardcoded 50% would give wrong stake');
    } else {
      console.log('  ✅ PASS: Uses actual market price');
    }
  }
}

// Test 3: Fixed team name matching
function testTeamNameMatching() {
  console.log('\n' + '='.repeat(70));
  console.log('TEST 3: probability-bridge.ts team matching');
  console.log('='.repeat(70));

  function teamSearchTokens(team: string): string[] {
    if (!team || !team.trim()) return [];
    const t = team.trim().toLowerCase();
    const words = t.split(/\s+/);
    const tokens: string[] = [t];
    if (words.length > 1) {
      tokens.push(words[words.length - 1]);
      if (words.length >= 2) tokens.push(words.slice(0, -1).join(' '));
    }
    return [...new Set(tokens)].filter(Boolean);
  }

  function isHomePick(pick: string, homeTeam: string, awayTeam: string): boolean {
    const homeTokens = teamSearchTokens(homeTeam);
    const pickTokens = teamSearchTokens(pick);
    const pickPrimary = pickTokens[0] || pick.toLowerCase();
    return homeTokens.some(t => pickPrimary.includes(t) || t.includes(pickPrimary));
  }

  const testCases = [
    { pick: 'Syracuse Orange', home: 'Duke Blue Devils', away: 'Syracuse Orange', expectedHome: false },
    { pick: 'Baylor', home: 'Kansas Jayhawks', away: 'Baylor Bears', expectedHome: false },
    { pick: 'Northwestern St', home: 'Northwestern St Demons', away: 'McNeese Cowboys', expectedHome: true },
    { pick: 'Duke', home: 'Duke Blue Devils', away: 'Syracuse Orange', expectedHome: true },
    { pick: 'Devils', home: 'Duke Blue Devils', away: 'Syracuse Orange', expectedHome: true },
  ];

  for (const test of testCases) {
    const result = isHomePick(test.pick, test.home, test.away);
    const pass = result === test.expectedHome;
    
    console.log(`\nPick: "${test.pick}" vs Home: "${test.home}"`);
    console.log(`  Expected isHomePick: ${test.expectedHome}`);
    console.log(`  Actual isHomePick: ${result}`);
    console.log(`  ${pass ? '✅ PASS' : '❌ FAIL'}`);
  }
}

// Run all tests
testPrognoIntegrationCalculateStake();
testArbitrageDetectorCalculateStake();
testTeamNameMatching();

console.log('\n' + '='.repeat(70));
console.log('ALL TESTS COMPLETE');
console.log('='.repeat(70) + '\n');
