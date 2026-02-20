/**
 * Progno Fine-Grain Parameter Optimizer — Pass 2
 * Tight grid around best Sharpe values from pass 1:
 *   homeAdv ~1.0, h2h ~0.2, rec ~0.2, minEdge ~10%, kelly ~10%
 * Also tests pointsFor/pointsAgainst differential as a signal.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const DATA_PATH = path.join(__dirname, '..', 'data', '2024-games.json');
const games = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
console.log(`Loaded ${games.length} games\n`);

function americanToDecimal(o) { return o > 0 ? o/100+1 : 100/Math.abs(o)+1; }
function impliedProb(o) { return 1/americanToDecimal(o); }

function formScore(arr) {
  const w = [0.35,0.25,0.20,0.12,0.08];
  return (arr||[]).slice(0,5).reduce((s,r,i)=>s+(r==='W'?w[i]:0),0);
}

function modelProb(game, p) {
  const ts = game.teamStats, rf = game.recentForm, h2h = game.headToHead;
  const rawHome = impliedProb(game.odds.home);
  const rawAway = impliedProb(game.odds.away);
  let base = rawHome / (rawHome + rawAway);

  // Home advantage
  base += p.homeAdv * 0.05;

  // Form
  const fDiff = (formScore(rf&&rf.home) - formScore(rf&&rf.away)) * p.formW;
  base += fDiff;

  // H2H
  const h2hTotal = (h2h&&h2h.homeWins||0) + (h2h&&h2h.awayWins||0);
  const h2hDiff = h2hTotal > 0 ? ((h2h.homeWins/h2hTotal)-0.5)*p.h2hW : 0;
  base += h2hDiff;

  // Record differential
  const hWp = ts ? ts.home.wins/Math.max(1,ts.home.wins+ts.home.losses) : 0.5;
  const aWp = ts ? ts.away.wins/Math.max(1,ts.away.wins+ts.away.losses) : 0.5;
  base += (hWp - aWp) * p.recW;

  // Points differential (offensive - defensive efficiency)
  if (ts && p.ptsW > 0) {
    const hGames = Math.max(1, ts.home.wins+ts.home.losses);
    const aGames = Math.max(1, ts.away.wins+ts.away.losses);
    const hNetPPG = (ts.home.pointsFor - ts.home.pointsAgainst) / hGames;
    const aNetPPG = (ts.away.pointsFor - ts.away.pointsAgainst) / aGames;
    base += (hNetPPG - aNetPPG) * p.ptsW;
  }

  return Math.max(0.05, Math.min(0.95, base));
}

function simulate(params) {
  const { minEdge, minConf, oddsMin, oddsMax, kelly } = params;
  let bankroll = 1000, bets = 0, wins = 0;
  const pnls = [];

  for (const game of games) {
    if (!game.actualWinner || !game.odds) continue;
    const homeProb = modelProb(game, params);
    const awayProb = 1 - homeProb;
    const homeEdge = homeProb - impliedProb(game.odds.home);
    const awayEdge = awayProb - impliedProb(game.odds.away);

    let betSide = null, betProb = 0, betOdds = 0;
    if (homeEdge >= minEdge && homeProb >= minConf) {
      betSide = game.homeTeam; betProb = homeProb; betOdds = game.odds.home;
    } else if (awayEdge >= minEdge && awayProb >= minConf) {
      betSide = game.awayTeam; betProb = awayProb; betOdds = game.odds.away;
    }
    if (!betSide || betOdds < oddsMin || betOdds > oddsMax) continue;

    const dec = americanToDecimal(betOdds);
    const b = dec - 1;
    const kf = Math.max(0, (b*betProb-(1-betProb))/b);
    const stake = Math.min(bankroll * kf * kelly, bankroll * 0.10);
    if (stake < 1) continue;

    const won = game.actualWinner === betSide;
    const pnl = won ? stake*b : -stake;
    bankroll += pnl; pnls.push(pnl); bets++;
    if (won) wins++;
  }

  if (bets < 8) return null;
  const roi = ((bankroll-1000)/1000)*100;
  const winRate = (wins/bets)*100;
  const avg = pnls.reduce((a,b)=>a+b,0)/pnls.length;
  const std = Math.sqrt(pnls.reduce((a,p)=>a+(p-avg)**2,0)/pnls.length);
  const sharpe = std>0 ? (avg/std)*Math.sqrt(bets) : 0;
  return { roi, winRate, bets, wins, sharpe, finalBankroll: bankroll };
}

// Fine-grain grid — 9 variables, ~500k combos
const GRID = {
  homeAdv:  [0.6, 0.8, 1.0, 1.1, 1.2, 1.3, 1.5],
  formW:    [0.0, 0.05, 0.1],
  h2hW:     [0.1, 0.15, 0.2, 0.25, 0.3, 0.4],
  recW:     [0.1, 0.15, 0.2, 0.25, 0.3],
  ptsW:     [0.0, 0.005, 0.01, 0.02],
  minEdge:  [0.07, 0.08, 0.09, 0.10, 0.11, 0.12],
  minConf:  [0.50, 0.52, 0.53, 0.55, 0.57],
  oddsMin:  [-200, -150, -130, -110],
  oddsMax:  [150, 200, 250, 300],
  kelly:    [0.08, 0.10, 0.12, 0.15],
};

let total = 1;
for (const v of Object.values(GRID)) total *= v.length;
console.log(`Fine-grain combinations: ${total.toLocaleString()}`);

const results = [];
let done = 0;

for (const homeAdv of GRID.homeAdv)
for (const formW of GRID.formW)
for (const h2hW of GRID.h2hW)
for (const recW of GRID.recW)
for (const ptsW of GRID.ptsW)
for (const minEdge of GRID.minEdge)
for (const minConf of GRID.minConf)
for (const oddsMin of GRID.oddsMin)
for (const oddsMax of GRID.oddsMax)
for (const kelly of GRID.kelly) {
  done++;
  if (done % 100000 === 0) {
    process.stdout.write(`\r  ${((done/total)*100).toFixed(1)}% (${done.toLocaleString()}/${total.toLocaleString()})  `);
  }
  const params = { homeAdv, formW, h2hW, recW, ptsW, minEdge, minConf, oddsMin, oddsMax, kelly };
  const r = simulate(params);
  if (r && r.roi > 0 && r.bets >= 8) results.push({ params, ...r });
}

console.log(`\n\nDone. Profitable: ${results.length.toLocaleString()}/${total.toLocaleString()}`);

// ── Top by Sharpe ────────────────────────────────────────────────────────────
results.sort((a,b) => b.sharpe - a.sharpe);
const TOP = 25;

console.log(`\n${'═'.repeat(120)}`);
console.log(`  TOP ${TOP} BY SHARPE (risk-adjusted)`);
console.log(`${'═'.repeat(120)}`);
console.log('Rank  Sharpe  ROI%    Win%   Bets  hAdv  form   h2h   rec   pts    edge   conf   oMin  oMax  kelly');
console.log('─'.repeat(120));
results.slice(0,TOP).forEach((r,i) => {
  const p = r.params;
  console.log(
    `#${String(i+1).padStart(2)}  `+
    `${r.sharpe.toFixed(2).padStart(6)}  `+
    `${r.roi.toFixed(1).padStart(6)}%  `+
    `${r.winRate.toFixed(1).padStart(5)}%  `+
    `${String(r.bets).padStart(4)}  `+
    `${p.homeAdv.toFixed(1).padStart(4)}  `+
    `${p.formW.toFixed(2).padStart(5)}  `+
    `${p.h2hW.toFixed(2).padStart(5)}  `+
    `${p.recW.toFixed(2).padStart(5)}  `+
    `${p.ptsW.toFixed(3).padStart(5)}  `+
    `${(p.minEdge*100).toFixed(0).padStart(5)}%  `+
    `${(p.minConf*100).toFixed(0).padStart(5)}%  `+
    `${String(p.oddsMin).padStart(5)}  `+
    `${String(p.oddsMax).padStart(4)}  `+
    `${(p.kelly*100).toFixed(0).padStart(4)}%`
  );
});

// ── Top by ROI ───────────────────────────────────────────────────────────────
results.sort((a,b) => b.roi - a.roi);
console.log(`\n${'═'.repeat(120)}`);
console.log(`  TOP ${TOP} BY ROI`);
console.log(`${'═'.repeat(120)}`);
console.log('Rank  ROI%    Sharpe  Win%   Bets  hAdv  form   h2h   rec   pts    edge   conf   oMin  oMax  kelly');
console.log('─'.repeat(120));
results.slice(0,TOP).forEach((r,i) => {
  const p = r.params;
  console.log(
    `#${String(i+1).padStart(2)}  `+
    `${r.roi.toFixed(1).padStart(6)}%  `+
    `${r.sharpe.toFixed(2).padStart(6)}  `+
    `${r.winRate.toFixed(1).padStart(5)}%  `+
    `${String(r.bets).padStart(4)}  `+
    `${p.homeAdv.toFixed(1).padStart(4)}  `+
    `${p.formW.toFixed(2).padStart(5)}  `+
    `${p.h2hW.toFixed(2).padStart(5)}  `+
    `${p.recW.toFixed(2).padStart(5)}  `+
    `${p.ptsW.toFixed(3).padStart(5)}  `+
    `${(p.minEdge*100).toFixed(0).padStart(5)}%  `+
    `${(p.minConf*100).toFixed(0).padStart(5)}%  `+
    `${String(p.oddsMin).padStart(5)}  `+
    `${String(p.oddsMax).padStart(4)}  `+
    `${(p.kelly*100).toFixed(0).padStart(4)}%`
  );
});

// ── Save ─────────────────────────────────────────────────────────────────────
const best = results.sort((a,b)=>b.sharpe-a.sharpe)[0];
const outPath = path.join(__dirname,'..','data','tuned-parameters','fine-search-results.json');
fs.writeFileSync(outPath, JSON.stringify({
  generatedAt: new Date().toISOString(),
  pass: 2,
  totalCombinations: total,
  profitableCombinations: results.length,
  bestBySharpe: best,
  top25BySharpe: results.slice(0,25),
  top25ByRoi: results.sort((a,b)=>b.roi-a.roi).slice(0,25),
}, null, 2));
console.log(`\n💾 Saved to fine-search-results.json`);

// Update backtest-tuned.json
const bp = best.params;
const tunedPath = path.join(__dirname,'..','data','tuned-parameters','backtest-tuned.json');
fs.writeFileSync(tunedPath, JSON.stringify({
  minConfidence: bp.minConf,
  minEdge: bp.minEdge,
  homeAdvWeight: bp.homeAdv,
  formWeight: bp.formW,
  h2hWeight: bp.h2hW,
  recordWeight: bp.recW,
  pointsDiffWeight: bp.ptsW,
  oddsMin: bp.oddsMin,
  oddsMax: bp.oddsMax,
  kellyFraction: bp.kelly,
  winRate: best.winRate/100,
  roi: best.roi,
  sharpe: best.sharpe,
  gamesBet: best.bets,
  updatedAt: new Date().toISOString(),
  source: 'fine-grain-pass2-800k+500k-combos',
}, null, 2));

console.log(`\n${'═'.repeat(60)}`);
console.log('  FINAL RECOMMENDED PARAMS (best Sharpe, pass 2)');
console.log(`${'═'.repeat(60)}`);
console.log(`  homeAdvWeight  : ${bp.homeAdv}`);
console.log(`  formWeight     : ${bp.formW}`);
console.log(`  h2hWeight      : ${bp.h2hW}`);
console.log(`  recordWeight   : ${bp.recW}`);
console.log(`  pointsDiffW    : ${bp.ptsW}`);
console.log(`  minEdge        : ${bp.minEdge} (${(bp.minEdge*100).toFixed(0)}%)`);
console.log(`  minConfidence  : ${bp.minConf} (${(bp.minConf*100).toFixed(0)}%)`);
console.log(`  oddsMin/Max    : ${bp.oddsMin} / ${bp.oddsMax}`);
console.log(`  kellyFraction  : ${bp.kelly} (${(bp.kelly*100).toFixed(0)}%)`);
console.log(`  → ROI: ${best.roi.toFixed(1)}%  WinRate: ${best.winRate.toFixed(1)}%  Bets: ${best.bets}  Sharpe: ${best.sharpe.toFixed(2)}`);
console.log(`✅ backtest-tuned.json updated`);
