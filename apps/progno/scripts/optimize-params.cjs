/**
 * Progno Parameter Optimizer — Grid Search over 2024 real game data
 * Tests every combination of model variables and ranks by ROI + Sharpe
 *
 * Variables searched:
 *   - homeAdvWeight    : how much to boost home team win prob
 *   - formWeight       : weight of recent W/L form (last 5)
 *   - h2hWeight        : weight of head-to-head record
 *   - recordWeight     : weight of season win% differential
 *   - minEdge          : minimum model_prob - market_implied to bet
 *   - minConfidence    : minimum model win probability to bet
 *   - oddsMin / oddsMax: only bet within this American odds range
 *   - kellyFraction    : fractional Kelly multiplier
 */

'use strict';
const fs = require('fs');
const path = require('path');

// ── Load 2024 data ──────────────────────────────────────────────────────────
const DATA_PATH = path.join(__dirname, '..', 'data', '2024-games.json');
const games = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
console.log(`Loaded ${games.length} games from 2024-games.json\n`);

// ── Helpers ──────────────────────────────────────────────────────────────────
function americanToDecimal(odds) {
  return odds > 0 ? odds / 100 + 1 : 100 / Math.abs(odds) + 1;
}
function impliedProb(odds) {
  return 1 / americanToDecimal(odds);
}
function formScore(formArr) {
  // last 5 games W=1 L=0, weighted recent-first
  const weights = [0.35, 0.25, 0.2, 0.12, 0.08];
  return formArr.slice(0, 5).reduce((s, r, i) => s + (r === 'W' ? weights[i] : 0), 0);
}

// ── Model: compute win probability for home team given params ────────────────
function modelProb(game, params) {
  const { homeAdvWeight, formWeight, h2hWeight, recordWeight } = params;
  const ts = game.teamStats;
  const rf = game.recentForm;
  const h2h = game.headToHead;

  // Base: market implied home win prob (shin-devigged)
  const rawHome = impliedProb(game.odds.home);
  const rawAway = impliedProb(game.odds.away);
  const total = rawHome + rawAway;
  let base = rawHome / total; // remove vig

  // Signal 1: home advantage boost
  const homeAdv = homeAdvWeight * 0.05; // e.g. 1.0 → +5%

  // Signal 2: form differential
  const homeForm = formScore(rf.home || []);
  const awayForm = formScore(rf.away || []);
  const formDiff = (homeForm - awayForm) * formWeight; // range ~[-0.35, +0.35]

  // Signal 3: H2H
  const h2hTotal = (h2h.homeWins || 0) + (h2h.awayWins || 0);
  const h2hDiff = h2hTotal > 0
    ? ((h2h.homeWins / h2hTotal) - 0.5) * h2hWeight
    : 0;

  // Signal 4: season record differential
  const homeWinPct = ts.home.wins / Math.max(1, ts.home.wins + ts.home.losses);
  const awayWinPct = ts.away.wins / Math.max(1, ts.away.wins + ts.away.losses);
  const recordDiff = (homeWinPct - awayWinPct) * recordWeight;

  const prob = Math.max(0.05, Math.min(0.95, base + homeAdv + formDiff + h2hDiff + recordDiff));
  return prob;
}

// ── Simulate one set of params against all games ─────────────────────────────
function simulate(params) {
  const { minEdge, minConfidence, oddsMin, oddsMax, kellyFraction } = params;
  const BANKROLL_START = 1000;
  let bankroll = BANKROLL_START;
  let bets = 0, wins = 0;
  const pnls = [];

  for (const game of games) {
    if (!game.actualWinner || !game.odds) continue;

    const homeProb = modelProb(game, params);
    const awayProb = 1 - homeProb;

    // Decide which side to bet (if any)
    let betSide = null, betProb = 0, betOdds = 0;
    const homeEdge = homeProb - impliedProb(game.odds.home);
    const awayEdge = awayProb - impliedProb(game.odds.away);

    if (homeEdge >= minEdge && homeProb >= minConfidence) {
      betSide = game.homeTeam; betProb = homeProb; betOdds = game.odds.home;
    } else if (awayEdge >= minEdge && awayProb >= minConfidence) {
      betSide = game.awayTeam; betProb = awayProb; betOdds = game.odds.away;
    }

    if (!betSide) continue;

    // Odds filter
    if (betOdds < oddsMin || betOdds > oddsMax) continue;

    // Kelly stake
    const dec = americanToDecimal(betOdds);
    const b = dec - 1;
    const kelly = Math.max(0, (b * betProb - (1 - betProb)) / b);
    const stake = Math.min(bankroll * kelly * kellyFraction, bankroll * 0.10); // cap 10%
    if (stake < 1) continue;

    const won = game.actualWinner === betSide;
    const pnl = won ? stake * b : -stake;
    bankroll += pnl;
    pnls.push(pnl);
    bets++;
    if (won) wins++;
  }

  if (bets < 5) return null; // not enough bets to be meaningful

  const roi = ((bankroll - BANKROLL_START) / BANKROLL_START) * 100;
  const winRate = (wins / bets) * 100;
  const avgPnl = pnls.reduce((a, b) => a + b, 0) / pnls.length;
  const stdPnl = Math.sqrt(pnls.reduce((a, p) => a + (p - avgPnl) ** 2, 0) / pnls.length);
  const sharpe = stdPnl > 0 ? (avgPnl / stdPnl) * Math.sqrt(bets) : 0;

  return { roi, winRate, bets, wins, sharpe, finalBankroll: bankroll };
}

// ── Grid definition ──────────────────────────────────────────────────────────
const GRID = {
  homeAdvWeight:  [0.0, 0.5, 1.0, 1.5, 2.0],
  formWeight:     [0.0, 0.2, 0.4, 0.6, 1.0],
  h2hWeight:      [0.0, 0.1, 0.2, 0.4],
  recordWeight:   [0.0, 0.1, 0.2, 0.4, 0.6],
  minEdge:        [0.01, 0.03, 0.05, 0.07, 0.10],
  minConfidence:  [0.50, 0.53, 0.55, 0.57, 0.60],
  oddsMin:        [-200, -150, -130, -110],
  oddsMax:        [150, 200, 300, 500],
  kellyFraction:  [0.10, 0.15, 0.20, 0.25],
};

// ── Run grid search ──────────────────────────────────────────────────────────
console.log('Running grid search...');
const start = Date.now();

const results = [];
let total = 1;
for (const v of Object.values(GRID)) total *= v.length;
console.log(`Total combinations: ${total.toLocaleString()}\n`);

let done = 0;
for (const homeAdvWeight of GRID.homeAdvWeight)
for (const formWeight of GRID.formWeight)
for (const h2hWeight of GRID.h2hWeight)
for (const recordWeight of GRID.recordWeight)
for (const minEdge of GRID.minEdge)
for (const minConfidence of GRID.minConfidence)
for (const oddsMin of GRID.oddsMin)
for (const oddsMax of GRID.oddsMax)
for (const kellyFraction of GRID.kellyFraction) {
  done++;
  if (done % 50000 === 0) {
    const pct = ((done / total) * 100).toFixed(1);
    process.stdout.write(`\r  ${pct}% (${done.toLocaleString()}/${total.toLocaleString()})  `);
  }

  const params = { homeAdvWeight, formWeight, h2hWeight, recordWeight,
                   minEdge, minConfidence, oddsMin, oddsMax, kellyFraction };
  const r = simulate(params);
  if (r && r.roi > 0 && r.bets >= 10) {
    results.push({ params, ...r });
  }
}

console.log(`\n\nDone in ${((Date.now() - start) / 1000).toFixed(1)}s`);
console.log(`Profitable combos: ${results.length.toLocaleString()} / ${total.toLocaleString()}`);

// ── Sort & report ────────────────────────────────────────────────────────────
results.sort((a, b) => b.roi - a.roi);

const TOP = 20;
console.log(`\n${'═'.repeat(110)}`);
console.log(`  TOP ${TOP} PARAMETER SETS BY ROI`);
console.log(`${'═'.repeat(110)}`);
console.log(
  'Rank  ROI%    WinRate  Bets  Sharpe  hAdv  form  h2h  rec  minEdge  minConf  oddsMin  oddsMax  kelly'
);
console.log('─'.repeat(110));

results.slice(0, TOP).forEach((r, i) => {
  const p = r.params;
  console.log(
    `#${String(i+1).padStart(2)}  ` +
    `${r.roi.toFixed(1).padStart(6)}%  ` +
    `${r.winRate.toFixed(1).padStart(6)}%  ` +
    `${String(r.bets).padStart(4)}  ` +
    `${r.sharpe.toFixed(2).padStart(6)}  ` +
    `${p.homeAdvWeight.toFixed(1).padStart(4)}  ` +
    `${p.formWeight.toFixed(1).padStart(4)}  ` +
    `${p.h2hWeight.toFixed(1).padStart(3)}  ` +
    `${p.recordWeight.toFixed(1).padStart(3)}  ` +
    `${(p.minEdge*100).toFixed(0).padStart(6)}%  ` +
    `${(p.minConfidence*100).toFixed(0).padStart(6)}%  ` +
    `${String(p.oddsMin).padStart(7)}  ` +
    `${String(p.oddsMax).padStart(7)}  ` +
    `${(p.kellyFraction*100).toFixed(0).padStart(4)}%`
  );
});

// ── Best by Sharpe ───────────────────────────────────────────────────────────
results.sort((a, b) => b.sharpe - a.sharpe);
console.log(`\n${'═'.repeat(110)}`);
console.log(`  TOP ${TOP} PARAMETER SETS BY SHARPE RATIO (risk-adjusted)`);
console.log(`${'═'.repeat(110)}`);
console.log(
  'Rank  Sharpe  ROI%    WinRate  Bets  hAdv  form  h2h  rec  minEdge  minConf  oddsMin  oddsMax  kelly'
);
console.log('─'.repeat(110));

results.slice(0, TOP).forEach((r, i) => {
  const p = r.params;
  console.log(
    `#${String(i+1).padStart(2)}  ` +
    `${r.sharpe.toFixed(2).padStart(6)}  ` +
    `${r.roi.toFixed(1).padStart(6)}%  ` +
    `${r.winRate.toFixed(1).padStart(6)}%  ` +
    `${String(r.bets).padStart(4)}  ` +
    `${p.homeAdvWeight.toFixed(1).padStart(4)}  ` +
    `${p.formWeight.toFixed(1).padStart(4)}  ` +
    `${p.h2hWeight.toFixed(1).padStart(3)}  ` +
    `${p.recordWeight.toFixed(1).padStart(3)}  ` +
    `${(p.minEdge*100).toFixed(0).padStart(6)}%  ` +
    `${(p.minConfidence*100).toFixed(0).padStart(6)}%  ` +
    `${String(p.oddsMin).padStart(7)}  ` +
    `${String(p.oddsMax).padStart(7)}  ` +
    `${(p.kellyFraction*100).toFixed(0).padStart(4)}%`
  );
});

// ── Save best params ─────────────────────────────────────────────────────────
const bestRoi    = results.sort((a,b) => b.roi - a.roi)[0];
const bestSharpe = results.sort((a,b) => b.sharpe - a.sharpe)[0];

const output = {
  generatedAt: new Date().toISOString(),
  dataSource: '2024-games.json (286 NFL games)',
  totalCombinations: total,
  profitableCombinations: results.length,
  bestByRoi: bestRoi,
  bestBySharpe: bestSharpe,
  top20ByRoi: results.sort((a,b) => b.roi - a.roi).slice(0, 20),
  top20BySharpe: results.sort((a,b) => b.sharpe - a.sharpe).slice(0, 20),
};

const outPath = path.join(__dirname, '..', 'data', 'tuned-parameters', 'grid-search-results.json');
fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
console.log(`\n💾 Full results saved to: ${outPath}`);

console.log('\n' + '═'.repeat(60));
console.log('  RECOMMENDED PARAMS (best ROI)');
console.log('═'.repeat(60));
const bp = bestRoi.params;
console.log(`  homeAdvWeight : ${bp.homeAdvWeight}`);
console.log(`  formWeight    : ${bp.formWeight}`);
console.log(`  h2hWeight     : ${bp.h2hWeight}`);
console.log(`  recordWeight  : ${bp.recordWeight}`);
console.log(`  minEdge       : ${bp.minEdge} (${(bp.minEdge*100).toFixed(0)}%)`);
console.log(`  minConfidence : ${bp.minConfidence} (${(bp.minConfidence*100).toFixed(0)}%)`);
console.log(`  oddsMin       : ${bp.oddsMin}`);
console.log(`  oddsMax       : ${bp.oddsMax}`);
console.log(`  kellyFraction : ${bp.kellyFraction}`);
console.log(`  → ROI: ${bestRoi.roi.toFixed(1)}%  WinRate: ${bestRoi.winRate.toFixed(1)}%  Bets: ${bestRoi.bets}  Sharpe: ${bestRoi.sharpe.toFixed(2)}`);

// Also update tuned-parameters/backtest-tuned.json
const tuned = {
  minConfidence: bp.minConfidence,
  minEdge: bp.minEdge,
  homeAdvWeight: bp.homeAdvWeight,
  formWeight: bp.formWeight,
  h2hWeight: bp.h2hWeight,
  recordWeight: bp.recordWeight,
  oddsMin: bp.oddsMin,
  oddsMax: bp.oddsMax,
  kellyFraction: bp.kellyFraction,
  winRate: bestRoi.winRate / 100,
  roi: bestRoi.roi,
  gamesBet: bestRoi.bets,
  sharpe: bestRoi.sharpe,
  updatedAt: new Date().toISOString(),
};
const tunedPath = path.join(__dirname, '..', 'data', 'tuned-parameters', 'backtest-tuned.json');
fs.writeFileSync(tunedPath, JSON.stringify(tuned, null, 2));
console.log(`\n✅ Updated backtest-tuned.json with best params`);
