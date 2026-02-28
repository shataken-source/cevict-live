/**
 * Historical Simulation v2: Compare original predictions vs v4 confidence formula
 * Uses actual MC data + signal traces already in prediction files.
 * No re-running MC needed - we apply the NEW formula to the OLD data.
 *
 * Usage: node run-historical-sim.cjs
 */

const fs = require('fs');
const path = require('path');

const HOME_BIAS_BOOST = Number(process.env.PROGNO_HOME_BIAS_BOOST ?? 5);
const AWAY_BIAS_PENALTY = Number(process.env.PROGNO_AWAY_BIAS_PENALTY ?? 5);
const TIER_ELITE_MIN = Number(process.env.PROGNO_TIER_ELITE_MIN ?? 70);
const TIER_PREMIUM_MIN = Number(process.env.PROGNO_TIER_PREMIUM_MIN ?? 62);

function oddsToProb(odds) {
  if (odds > 0) return 100 / (odds + 100);
  return Math.abs(odds) / (Math.abs(odds) + 100);
}

function computeV4Confidence(pick) {
  const mcWin = pick.mc_win_probability;
  const pickOdds = pick.odds;
  const isHomePick = pick.is_home_pick || pick.pick === pick.home_team;
  const sport = (pick.sport || pick.league || 'NCAAB').toUpperCase();
  const impliedProb = oddsToProb(pickOdds);
  const favoriteProb = typeof mcWin === 'number' ? mcWin : impliedProb;
  const marketBaseConf = favoriteProb * 100;
  const mcPct = typeof mcWin === 'number' ? mcWin * 100 : marketBaseConf;
  const mcBlendedConf = marketBaseConf * 0.6 + mcPct * 0.4;
  let trueEdgeBoost = 0, chaosPenalty = 0;
  if (pick.signal_trace && pick.signal_trace['true-edge']) {
    const te = pick.signal_trace['true-edge'];
    trueEdgeBoost = (te.scores && te.scores.totalEdge || 0) * 80;
    chaosPenalty = (1 - (te.scores && te.scores.confidence || 0.5)) * 10;
  }
  let confidence = Math.round(mcBlendedConf + trueEdgeBoost - chaosPenalty);
  const league = sport.toLowerCase();
  if (isHomePick) confidence += HOME_BIAS_BOOST;
  else confidence -= (league === 'nba' ? AWAY_BIAS_PENALTY * 2 : AWAY_BIAS_PENALTY);
  const isBaseball = league === 'cbb' || league === 'mlb';
  const ceilingBonus = isBaseball ? 10 : 20;
  const marketCeiling = Math.round(favoriteProb * 100 + ceilingBonus);
  confidence = Math.min(confidence, marketCeiling);
  confidence = Math.max(30, Math.min(95, confidence));
  const edge = (favoriteProb - impliedProb) * 100;
  return { confidence, mcPct: Math.round(mcPct), marketCeiling, edge, favoriteProb };
}

const DATES = [];
for (let d = 20; d <= 28; d++) DATES.push('2026-02-' + String(d).padStart(2, '0'));

function readJSON(fp) {
  if (!fs.existsSync(fp)) return null;
  try {
    const raw = fs.readFileSync(fp, 'utf8');
    return JSON.parse(raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw);
  } catch (e) {
    console.warn('  [WARN] Failed to parse ' + path.basename(fp) + ': ' + e.message);
    return null;
  }
}

console.log('='.repeat(100));
console.log('PROGNO HISTORICAL SIMULATION v2');
console.log('='.repeat(100));

const allResults = [];
let totalGraded = 0, totalWon = 0;

for (const date of DATES) {
  const pData = readJSON(path.join(__dirname, 'predictions-' + date + '.json'));
  if (!pData) continue;
  const picks = pData.picks || pData;
  if (!Array.isArray(picks) || picks.length === 0) continue;
  const rData = readJSON(path.join(__dirname, 'results-' + date + '.json'));
  const outcomes = {};
  if (rData) {
    const games = rData.results || rData;
    if (Array.isArray(games)) {
      for (const g of games) {
        if (g.status === 'win' || g.status === 'lose') {
          const key = ((g.home_team||'') + '|' + (g.away_team||'')).toLowerCase();
          outcomes[key] = { status: g.status, winner: g.actualWinner || '' };
        }
      }
    }
  }
  console.log('\n' + '-'.repeat(100));
  console.log('DATE: ' + date + ' | ' + picks.length + ' picks | ' + Object.keys(outcomes).length + ' graded');
  console.log('-'.repeat(100));
  console.log(
    'GAME'.padEnd(48) +
    'ORIG'.padStart(5) + 'V4'.padStart(5) + 'DELTA'.padStart(6) +
    'MC%'.padStart(5) + 'CEIL'.padStart(5) + 'EDGE'.padStart(7) +
    'TYPE'.padStart(6) + 'ODDS'.padStart(6) + 'RESULT'.padStart(8)
  );
  for (const p of picks) {
    if (!p.home_team || !p.away_team) continue;
    const v4 = computeV4Confidence(p);
    const origConf = p.confidence || 0;
    const delta = v4.confidence - origConf;
    const key = (p.home_team + '|' + p.away_team).toLowerCase();
    const outcome = outcomes[key];
    let resultStr = '-';
    if (outcome) {
      resultStr = outcome.status === 'win' ? 'WIN' : 'LOSS';
      totalGraded++;
      if (outcome.status === 'win') totalWon++;
    }
    const isHome = p.is_home_pick ? 'H' : 'A';
    console.log(
      (isHome + ' ' + p.home_team + ' vs ' + p.away_team).substring(0, 47).padEnd(48) +
      String(origConf + '%').padStart(5) + String(v4.confidence + '%').padStart(5) +
      (delta >= 0 ? '+' + delta : String(delta)).padStart(6) +
      String(v4.mcPct + '%').padStart(5) + String(v4.marketCeiling + '%').padStart(5) +
      (v4.edge >= 0 ? '+' + v4.edge.toFixed(1) : v4.edge.toFixed(1)).padStart(7) +
      (p.pick_type || 'ML').substring(0, 5).padStart(6) +
      (p.odds > 0 ? '+' + p.odds : String(p.odds)).padStart(6) +
      resultStr.padStart(8)
    );
    allResults.push({
      date, home: p.home_team, away: p.away_team, pick: p.pick,
      sport: p.sport, origConf, newConf: v4.confidence, delta,
      mcPct: v4.mcPct, marketCeiling: v4.marketCeiling,
      edge: v4.edge, odds: p.odds, result: resultStr,
      isHomePick: p.is_home_pick, pickType: p.pick_type,
    });
  }
}

const n = allResults.length;
const avgOrig = allResults.reduce((s, r) => s + r.origConf, 0) / n;
const avgNew = allResults.reduce((s, r) => s + r.newConf, 0) / n;
const avgDelta = allResults.reduce((s, r) => s + r.delta, 0) / n;
const avgEdge = allResults.reduce((s, r) => s + r.edge, 0) / n;

console.log('\n' + '='.repeat(100));
console.log('AGGREGATE');
console.log('='.repeat(100));
console.log('Total: ' + n + ' | Graded: ' + totalGraded + ' | WR: ' + (totalGraded > 0 ? (totalWon / totalGraded * 100).toFixed(1) + '%' : 'N/A'));
console.log('AVG ORIG conf: ' + avgOrig.toFixed(1) + '%');
console.log('AVG V4 conf:   ' + avgNew.toFixed(1) + '%');
console.log('AVG delta:     ' + (avgDelta >= 0 ? '+' : '') + avgDelta.toFixed(1) + '%');
console.log('AVG edge:      ' + (avgEdge >= 0 ? '+' : '') + avgEdge.toFixed(1) + '%');

console.log('\nCONFIDENCE DISTRIBUTION');
const buckets = ['30-49', '50-59', '60-69', '70-79', '80-89', '90-95'];
const oB = {}, nB = {};
buckets.forEach(b => { oB[b] = 0; nB[b] = 0; });
for (const r of allResults) {
  const ob = r.origConf >= 90 ? '90-95' : r.origConf >= 80 ? '80-89' : r.origConf >= 70 ? '70-79' : r.origConf >= 60 ? '60-69' : r.origConf >= 50 ? '50-59' : '30-49';
  const nb = r.newConf >= 90 ? '90-95' : r.newConf >= 80 ? '80-89' : r.newConf >= 70 ? '70-79' : r.newConf >= 60 ? '60-69' : r.newConf >= 50 ? '50-59' : '30-49';
  oB[ob]++; nB[nb]++;
}
console.log('Bucket     ORIG   V4');
for (const b of buckets) console.log((b + '%').padEnd(10) + String(oB[b]).padStart(4) + String(nB[b]).padStart(6));

console.log('\nTIER DISTRIBUTION (elite>=' + TIER_ELITE_MIN + '%, premium>=' + TIER_PREMIUM_MIN + '%)');
const ot = { e: 0, p: 0, f: 0 }, nt2 = { e: 0, p: 0, f: 0 };
for (const r of allResults) {
  ot[r.origConf >= TIER_ELITE_MIN ? 'e' : r.origConf >= TIER_PREMIUM_MIN ? 'p' : 'f']++;
  nt2[r.newConf >= TIER_ELITE_MIN ? 'e' : r.newConf >= TIER_PREMIUM_MIN ? 'p' : 'f']++;
}
console.log('Elite:   ORIG=' + ot.e + '  V4=' + nt2.e);
console.log('Premium: ORIG=' + ot.p + '  V4=' + nt2.p);
console.log('Free:    ORIG=' + ot.f + '  V4=' + nt2.f);

console.log('\nPER-SPORT');
const bySport = {};
for (const r of allResults) {
  const s = r.sport || 'UNK';
  if (!bySport[s]) bySport[s] = { n: 0, os: 0, ns: 0, g: 0, w: 0 };
  bySport[s].n++; bySport[s].os += r.origConf; bySport[s].ns += r.newConf;
  if (r.result === 'WIN') { bySport[s].g++; bySport[s].w++; }
  else if (r.result === 'LOSS') bySport[s].g++;
}
for (const [sp, s] of Object.entries(bySport).sort((a, b) => b[1].n - a[1].n)) {
  console.log(sp.padEnd(8) + ' n=' + s.n + ' origAvg=' + (s.os / s.n).toFixed(0) + '% v4Avg=' + (s.ns / s.n).toFixed(0) + '% graded=' + s.g + ' wr=' + (s.g > 0 ? (s.w / s.g * 100).toFixed(0) + '%' : 'N/A'));
}

const outputPath = path.join(__dirname, 'historical-sim-results.json');
fs.writeFileSync(outputPath, JSON.stringify({ runAt: new Date().toISOString(), summary: { n, totalGraded, totalWon, avgOrig, avgNew, avgDelta, avgEdge }, results: allResults }, null, 2));
console.log('\nWritten to: ' + outputPath);
