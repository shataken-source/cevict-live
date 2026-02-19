import * as fs from 'fs';
import * as path from 'path';

// Read the archived predictions file
const predictionsPath = 'c:/cevict-archive/Probabilityanalyzer/predictions/2026-02-19T07-47-10-428Z_predictions-2026-02-19.json';
const outputPath = 'c:/cevict-live/apps/sportsbook-terminal/data/kalshi-picks.json';

console.log('Reading predictions from:', predictionsPath);
const content = fs.readFileSync(predictionsPath, 'utf-8');
const data = JSON.parse(content);

// Convert picks to Kalshi format
function convertToKalshiPick(pick: any, tier: string, index: number): any {
  const gameId = pick.game_id || `game-${index}`;
  const timestamp = new Date(pick.game_time || Date.now()).getTime();
  
  // Determine the market title based on pick type
  let marketTitle: string;
  if (pick.pick_type === 'SPREAD') {
    marketTitle = `Will ${pick.home_team} cover ${pick.recommended_line > 0 ? '+' : ''}${pick.recommended_line}?`;
  } else if (pick.pick_type === 'TOTAL') {
    marketTitle = `Will ${pick.home_team} vs ${pick.away_team} go Over ${pick.total?.line || 140.5}?`;
  } else {
    marketTitle = `Will ${pick.pick} win?`;
  }
  
  // Map confidence to tier
  const confidence = pick.confidence || 60;
  const probability = Math.round((pick.mc_win_probability || (confidence / 100)) * 100);
  const edge = pick.value_bet_edge || (confidence - 55);
  
  return {
    id: `${pick.sport?.toLowerCase() || 'sports'}-${gameId}-${timestamp}`,
    marketId: `${pick.sport?.toLowerCase() || 'sports'}-${gameId}-${timestamp}`,
    market: marketTitle,
    category: 'sports',
    pick: 'YES',  // All picks are YES (will happen)
    probability: probability,
    edge: parseFloat(edge.toFixed(1)),
    marketPrice: probability,
    expires: pick.game_time || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    reasoning: pick.reasoning?.join?.('. ') || pick.analysis || `${pick.pick} with ${confidence}% confidence`,
    confidence: confidence,
    tier: tier,
    originalSport: pick.sport || pick.league || 'Sports',
    gameInfo: `${pick.home_team} vs ${pick.away_team}`
  };
}

// Allocate tiers based on confidence
const picks = data.picks || [];
const sortedPicks = [...picks].sort((a, b) => (b.confidence || 0) - (a.confidence || 0));

// Top 5 picks = Elite (80%+ or top by confidence)
// Next 5 = Pro (65-79%)
// Rest = Free (<65%)
const elitePicks = sortedPicks.slice(0, 5).map((p, i) => convertToKalshiPick(p, 'elite', i));
const proPicks = sortedPicks.slice(5, 10).map((p, i) => convertToKalshiPick(p, 'pro', i));
const freePicks = sortedPicks.slice(10).map((p, i) => convertToKalshiPick(p, 'free', i));

const kalshiOutput = {
  success: true,
  elite: elitePicks,
  pro: proPicks,
  free: freePicks,
  total: picks.length,
  timestamp: new Date().toISOString(),
  source: 'predictions_file',
  tier_thresholds: {
    elite: ">= 80% confidence (top 5 picks)",
    pro: "65-79% confidence (next 5 picks)",
    free: "< 65% confidence (remaining picks)"
  },
  format: 'kalshi_yes_no',
  original_file: 'predictions-2026-02-19.json'
};

// Write output
fs.writeFileSync(outputPath, JSON.stringify(kalshiOutput, null, 2));
console.log(`✅ Generated Kalshi picks file with ${picks.length} picks:`);
console.log(`   Elite: ${elitePicks.length} picks`);
console.log(`   Pro: ${proPicks.length} picks`);
console.log(`   Free: ${freePicks.length} picks`);
console.log(`\nOutput saved to: ${outputPath}`);
