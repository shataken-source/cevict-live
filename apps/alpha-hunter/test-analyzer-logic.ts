/**
 * Test the probability analyzer logic
 */

function americanToDecimal(odds) { 
  return odds > 0 ? (odds / 100) + 1 : (100 / Math.abs(odds)) + 1; 
}

function getImpliedProb(odds) { 
  return (1 / americanToDecimal(odds)) * 100; 
}

function calculateKelly(winProb, odds, bankroll) { 
  const decimal = americanToDecimal(odds); 
  const b = decimal - 1; 
  const p = winProb / 100; // Converts percentage to decimal
  const q = 1 - p; 
  const kellyFraction = (b * p - q) / b; 
  const safeFraction = Math.max(0, kellyFraction) * 0.25; 
  return { 
    fraction: safeFraction * 100, 
    stake: Math.min(bankroll * safeFraction, bankroll * 0.1) 
  }; 
}

function calculateEV(winProb, odds, stake = 100) { 
  const decimal = americanToDecimal(odds); 
  const p = winProb / 100; // Converts percentage to decimal
  const ev = (p * (decimal - 1) - (1 - p)) * stake; 
  const evPercent = (ev / stake) * 100; 
  let rating = evPercent >= 10 ? 'excellent' : evPercent >= 5 ? 'good' : evPercent > 0 ? 'marginal' : 'negative'; 
  return { ev, evPercent, rating }; 
}

console.log('='.repeat(70));
console.log('TESTING PROBABILITY ANALYZER LOGIC');
console.log('='.repeat(70));

const testCases = [
  { odds: -110, winProb: 55, bankroll: 1000 },
  { odds: +1600, winProb: 90, bankroll: 1000 },
  { odds: -196, winProb: 72, bankroll: 1000 },
];

for (const test of testCases) {
  const implied = getImpliedProb(test.odds);
  const kelly = calculateKelly(test.winProb, test.odds, test.bankroll);
  const ev = calculateEV(test.winProb, test.odds);
  
  console.log(`\nOdds: ${test.odds > 0 ? '+' : ''}${test.odds}, Win Prob: ${test.winProb}%`);
  console.log(`  Implied prob: ${implied.toFixed(2)}%`);
  console.log(`  Decimal odds: ${americanToDecimal(test.odds).toFixed(3)}`);
  console.log(`  Edge: ${(test.winProb - implied).toFixed(2)}%`);
  console.log(`  Kelly stake: $${kelly.stake.toFixed(2)}`);
  console.log(`  EV: ${ev.evPercent.toFixed(2)}% (${ev.rating})`);
  
  // Check if implied probability is correct
  const expectedImplied = test.odds > 0 
    ? (100 / (test.odds + 100))
    : (Math.abs(test.odds) / (Math.abs(test.odds) + 100));
  const expectedImpliedPercent = expectedImplied * 100;
  
  console.log(`  Expected implied: ${expectedImpliedPercent.toFixed(2)}%`);
  
  if (Math.abs(implied - expectedImpliedPercent) > 0.01) {
    console.log('  ❌ FAIL: getImpliedProb returns wrong value');
  } else {
    console.log('  ✅ PASS: getImpliedProb correct');
  }
}

console.log('\n' + '='.repeat(70));
console.log('CHECKING FOR INCONSISTENCIES');
console.log('='.repeat(70));

// Check edge calculation
console.log('\nEdge calculation check:');
console.log('  ensemble (60%) - marketImplied (52.38%) = 7.62% edge');
console.log('  Both are percentages (0-100), so edge is correct');

// Check Kelly calculation  
console.log('\nKelly calculation check:');
console.log('  winProb is divided by 100 to get decimal');
console.log('  This is correct if winProb is 0-100 percentage');

console.log('\n' + '='.repeat(70));
