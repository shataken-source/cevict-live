const fs = require('fs');
const path = require('path');

const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'backtest-all-leagues-2024.json'), 'utf8'));

const LEAGUES = ['NFL', 'NBA', 'NHL', 'MLB', 'NCAAB', 'NCAAF'];

const LEAGUE_CONFIDENCE_FLOOR = { NCAAF: 62, NCAAB: 57, NBA: 57, NFL: 62, NHL: 57, MLB: 57 }; // Backtest-calibrated 2024
const LEAGUE_STAKE_MULT = { NCAAF: 0.5, NCAAB: 0.75, NBA: 1, NFL: 1, NHL: 1, MLB: 1 };

const SPORT_SEASONS = {
  NBA:   { start: 10, end: 6 },
  NFL:   { start: 9,  end: 2 },
  NHL:   { start: 10, end: 6 },
  MLB:   { start: 3,  end: 10 },
  NCAAF: { start: 8,  end: 1 },
  NCAAB: { start: 11, end: 4 },
};

function isSportInSeason(league, month) {
  const s = SPORT_SEASONS[league];
  if (!s) return true;
  if (s.start <= s.end) return month >= s.start && month <= s.end;
  return month >= s.start || month <= s.end;
}

function getEarlyDecay(daysAhead) {
  if (daysAhead <= 1) return 1.0;
  if (daysAhead <= 2) return 0.97;
  if (daysAhead <= 3) return 0.93;
  if (daysAhead <= 4) return 0.88;
  if (daysAhead <= 5) return 0.82;
  return 0.75;
}

function oddsToProb(odds) {
  if (odds > 0) return 100 / (odds + 100);
  return Math.abs(odds) / (Math.abs(odds) + 100);
}

function calcStake(odds, conf, leagueMult, streakMult) {
  const implied = oddsToProb(odds);
  const model = conf / 100;
  const edge = model - implied;
  if (edge <= 0) return 10 * leagueMult * streakMult;
  const kelly = edge / (1 - implied);
  return Math.min(Math.max(kelly * 0.25 * 100, 10), 50) * leagueMult * streakMult;
}

const STRATEGIES = {
  v1_baseline: {
    label: 'V1: Baseline (pre-enhancement)',
    minOdds: -10000, maxOdds: 10000, minConf: 0,
    homeBias: 0, awayPenalty: 0,
    leagueConfFloors: false, leagueStakeCaps: false, homeOnly: false,
    seasonAware: false, earlyDecay: false, streakMod: false,
  },
  v2_balanced: {
    label: 'V2: Balanced + Enhancements (previous)',
    minOdds: -150, maxOdds: 150, minConf: 75,
    homeBias: 5, awayPenalty: 5,
    leagueConfFloors: false, leagueStakeCaps: true, homeOnly: false,
    seasonAware: false, earlyDecay: false, streakMod: false,
  },
  v3_best_full: {
    label: 'V3: Best + All Enhancements (CURRENT)',
    minOdds: -130, maxOdds: 200, minConf: 80,
    homeBias: 5, awayPenalty: 5,
    leagueConfFloors: true, leagueStakeCaps: true, homeOnly: false,
    seasonAware: true, earlyDecay: true, streakMod: true,
  },
  v3_home_only: {
    label: 'V3: Best + All + Home Only',
    minOdds: -130, maxOdds: 200, minConf: 80,
    homeBias: 5, awayPenalty: 5,
    leagueConfFloors: true, leagueStakeCaps: true, homeOnly: true,
    seasonAware: true, earlyDecay: true, streakMod: true,
  },
  v4_calibrated: {
    label: 'V4: Backtest-Calibrated (-200/+500/57%) + Home Only',
    minOdds: -200, maxOdds: 500, minConf: 57,
    homeBias: 5, awayPenalty: 5,
    leagueConfFloors: true, leagueStakeCaps: true, homeOnly: true,
    seasonAware: true, earlyDecay: true, streakMod: true,
  },
  v4_both_sides: {
    label: 'V4: Backtest-Calibrated (-200/+500/57%) Both Sides',
    minOdds: -200, maxOdds: 500, minConf: 57,
    homeBias: 5, awayPenalty: 5,
    leagueConfFloors: true, leagueStakeCaps: true, homeOnly: false,
    seasonAware: true, earlyDecay: true, streakMod: true,
  },
};

function simulate(strat) {
  const res = { overall: null, byLeague: {}, homeVsAway: {}, byOddsBand: {}, byConfBand: {}, byMonth: {} };
  let total = 0, filtered = 0, correct = 0, wagered = 0, profit = 0;
  let hPicks = 0, hCorrect = 0, hWagered = 0, hProfit = 0;
  let aPicks = 0, aCorrect = 0, aWagered = 0, aProfit = 0;
  let peak = 0, bal = 0, maxDD = 0, streak = 0, maxWin = 0, maxLoss = 0;
  let wins = 0, losses = 0;

  for (const league of LEAGUES) {
    const ld = data[league];
    if (!ld || !ld.races) continue;
    let lP = 0, lF = 0, lC = 0, lW = 0, lPr = 0;
    let lhP = 0, lhC = 0, lhW = 0, lhPr = 0;
    let laP = 0, laC = 0, laW = 0, laPr = 0;
    let lBal = 0, lPeak = 0, lDD = 0;

    for (const pick of ld.races) {
      const isHome = pick.predictedWinner === pick.homeTeam;
      const month = pick.date ? parseInt(pick.date.substring(5, 7)) : 1;

      if (strat.seasonAware && !isSportInSeason(league, month)) { lF++; filtered++; continue; }
      if (strat.homeOnly && !isHome) { lF++; filtered++; continue; }
      if (pick.odds < strat.minOdds || pick.odds > strat.maxOdds) { lF++; filtered++; continue; }

      let conf = pick.confidence;
      if (isHome) conf += strat.homeBias;
      else conf -= strat.awayPenalty;

      if (strat.earlyDecay && pick.date && pick.predictedDate) {
        const gDate = new Date(pick.predictedDate);
        const pDate = new Date(pick.date);
        const days = Math.max(0, (gDate.getTime() - pDate.getTime()) / 86400000);
        conf = Math.round(conf * getEarlyDecay(days));
      }

      conf = Math.max(30, Math.min(95, conf));

      if (conf < strat.minConf) { lF++; filtered++; continue; }
      if (strat.leagueConfFloors) {
        const floor = LEAGUE_CONFIDENCE_FLOOR[league] || 70;
        if (conf < floor) { lF++; filtered++; continue; }
      }

      const lMult = strat.leagueStakeCaps ? (LEAGUE_STAKE_MULT[league] || 1) : 1;
      let sMult = 1;
      if (strat.streakMod) {
        if (wins >= 5) sMult = 1.25;
        else if (wins >= 3) sMult = 1.1;
        else if (losses >= 5) sMult = 0.5;
        else if (losses >= 3) sMult = 0.75;
      }

      const stake = calcStake(pick.odds, conf, lMult, sMult);
      const pnl = pick.correct
        ? (pick.odds > 0 ? stake * (pick.odds / 100) : stake * (100 / Math.abs(pick.odds)))
        : -stake;

      if (pick.correct) { wins++; losses = 0; } else { losses++; wins = 0; }

      lP++; total++; lW += stake; wagered += stake; lPr += pnl; profit += pnl;
      if (pick.correct) { lC++; correct++; }

      if (isHome) { lhP++; hPicks++; lhW += stake; hWagered += stake; lhPr += pnl; hProfit += pnl; if (pick.correct) { lhC++; hCorrect++; } }
      else { laP++; aPicks++; laW += stake; aWagered += stake; laPr += pnl; aProfit += pnl; if (pick.correct) { laC++; aCorrect++; } }

      bal += pnl; lBal += pnl;
      if (bal > peak) peak = bal;
      if (lBal > lPeak) lPeak = lBal;
      if (peak - bal > maxDD) maxDD = peak - bal;
      if (lPeak - lBal > lDD) lDD = lPeak - lBal;

      if (pick.correct) { streak = streak > 0 ? streak + 1 : 1; if (streak > maxWin) maxWin = streak; }
      else { streak = streak < 0 ? streak - 1 : -1; if (-streak > maxLoss) maxLoss = -streak; }

      const mo = pick.date ? pick.date.substring(0, 7) : 'unknown';
      if (!res.byMonth[mo]) res.byMonth[mo] = { picks: 0, correct: 0, wagered: 0, profit: 0 };
      res.byMonth[mo].picks++; res.byMonth[mo].wagered += stake; res.byMonth[mo].profit += pnl;
      if (pick.correct) res.byMonth[mo].correct++;

      let ob;
      if (pick.odds <= -300) ob = 'Heavy fav (<= -300)';
      else if (pick.odds <= -150) ob = 'Med fav (-300 to -150)';
      else if (pick.odds < -110) ob = 'Slight fav (-150 to -110)';
      else if (pick.odds <= 110) ob = 'Pick-em (-110 to +110)';
      else if (pick.odds <= 200) ob = 'Slight dog (+110 to +200)';
      else ob = 'Big dog (> +200)';
      if (!res.byOddsBand[ob]) res.byOddsBand[ob] = { picks: 0, correct: 0, wagered: 0, profit: 0 };
      res.byOddsBand[ob].picks++; res.byOddsBand[ob].wagered += stake; res.byOddsBand[ob].profit += pnl;
      if (pick.correct) res.byOddsBand[ob].correct++;

      let cb;
      if (conf >= 85) cb = 'Elite (85-95)';
      else if (conf >= 75) cb = 'High (75-84)';
      else if (conf >= 65) cb = 'Medium (65-74)';
      else if (conf >= 50) cb = 'Low (50-64)';
      else cb = 'Very Low (30-49)';
      if (!res.byConfBand[cb]) res.byConfBand[cb] = { picks: 0, correct: 0, wagered: 0, profit: 0 };
      res.byConfBand[cb].picks++; res.byConfBand[cb].wagered += stake; res.byConfBand[cb].profit += pnl;
      if (pick.correct) res.byConfBand[cb].correct++;
    }

    res.byLeague[league] = {
      picks: lP, filtered: lF, correct: lC, accuracy: lP > 0 ? lC / lP * 100 : 0,
      wagered: lW, profit: lPr, roi: lW > 0 ? lPr / lW * 100 : 0, maxDD: lDD,
      homePicks: lhP, homeCorrect: lhC, homeWagered: lhW, homeProfit: lhPr,
      awayPicks: laP, awayCorrect: laC, awayWagered: laW, awayProfit: laPr,
    };
  }

  res.overall = {
    picks: total, filtered, correct, accuracy: total > 0 ? correct / total * 100 : 0,
    wagered, profit, roi: wagered > 0 ? profit / wagered * 100 : 0,
    maxDD, maxWin, maxLoss,
  };
  res.homeVsAway = {
    home: { picks: hPicks, correct: hCorrect, accuracy: hPicks > 0 ? hCorrect / hPicks * 100 : 0, wagered: hWagered, profit: hProfit, roi: hWagered > 0 ? hProfit / hWagered * 100 : 0 },
    away: { picks: aPicks, correct: aCorrect, accuracy: aPicks > 0 ? aCorrect / aPicks * 100 : 0, wagered: aWagered, profit: aProfit, roi: aWagered > 0 ? aProfit / aWagered * 100 : 0 },
  };
  return res;
}

// Run all
const results = {};
for (const [k, s] of Object.entries(STRATEGIES)) results[k] = simulate(s);

// ── Format helpers ──
function $(n) { return n >= 0 ? `+$${Math.round(n).toLocaleString()}` : `-$${Math.round(Math.abs(n)).toLocaleString()}`; }
function pct(n) { return (n >= 0 ? '+' : '') + n.toFixed(1) + '%'; }
function pad(s, w, a) { s = String(s); return a === 'r' ? s.padStart(w) : s.padEnd(w); }
function tbl(hdrs, rows, als) {
  const ws = hdrs.map((h, i) => Math.max(h.length, ...rows.map(r => String(r[i]).length)) + 2);
  let o = hdrs.map((h, i) => pad(h, ws[i], als?.[i])).join('|') + '\n';
  o += ws.map(w => '-'.repeat(w)).join('+') + '\n';
  for (const r of rows) o += r.map((c, i) => pad(String(c), ws[i], als?.[i])).join('|') + '\n';
  return o;
}

// ── Build report ──
let R = '';
R += '='.repeat(110) + '\n';
R += '  PROGNO BACKTEST: V1 (Pre-Enhancement) vs V2 (Balanced) vs V3 (Best+All Enhancements)\n';
R += '  Generated: ' + new Date().toISOString().replace('T', ' ').substring(0, 19) + '\n';
R += '  Data: 2024 season, ' + LEAGUES.join(', ') + '\n';
R += '='.repeat(110) + '\n\n';

// S1: HEAD-TO-HEAD
R += '━'.repeat(110) + '\n  1. HEAD-TO-HEAD COMPARISON\n' + '━'.repeat(110) + '\n\n';
const sKeys = Object.keys(STRATEGIES);
const h1 = ['Strategy', 'Picks', 'Filtered', 'Accuracy', 'Wagered', 'Profit', 'ROI', 'Max DD', 'Profit/DD', 'Win Str', 'Loss Str'];
const a1 = ['l', 'r', 'r', 'r', 'r', 'r', 'r', 'r', 'r', 'r', 'r'];
const r1 = sKeys.map(k => {
  const o = results[k].overall;
  const ratio = o.maxDD > 0 ? (o.profit / o.maxDD).toFixed(2) : '∞';
  return [STRATEGIES[k].label, o.picks, o.filtered, pct(o.accuracy), '$' + Math.round(o.wagered).toLocaleString(), $(o.profit), pct(o.roi), '-$' + Math.round(o.maxDD).toLocaleString(), ratio, o.maxWin, o.maxLoss];
});
R += tbl(h1, r1, a1) + '\n';

// Delta callout
const v1 = results.v1_baseline.overall;
const v3 = results.v3_best_full.overall;
const v4h = results.v4_calibrated.overall;
const v4b = results.v4_both_sides.overall;
R += '  V1 → V3 IMPROVEMENT:\n';
R += `    Picks:       ${v1.picks} → ${v3.picks} (${((v1.picks - v3.picks) / v1.picks * 100).toFixed(0)}% reduction)\n`;
R += `    Accuracy:    ${v1.accuracy.toFixed(1)}% → ${v3.accuracy.toFixed(1)}% (${pct(v3.accuracy - v1.accuracy)})\n`;
R += `    ROI:         ${pct(v1.roi)} → ${pct(v3.roi)} (${pct(v3.roi - v1.roi)})\n`;
R += `    Profit:      ${$(v1.profit)} → ${$(v3.profit)}\n`;
R += `    Max DD:      $${Math.round(v1.maxDD)} → $${Math.round(v3.maxDD)} (${((v1.maxDD - v3.maxDD) / v1.maxDD * 100).toFixed(0)}% reduction)\n`;
R += `    Profit/DD:   ${v1.maxDD > 0 ? (v1.profit / v1.maxDD).toFixed(2) : '∞'} → ${v3.maxDD > 0 ? (v3.profit / v3.maxDD).toFixed(2) : '∞'}\n\n`;

R += '  V3 → V4 IMPROVEMENT (new calibrated filters + home-only):\n';
R += `    Picks:       ${v3.picks} → ${v4h.picks} (${v4h.picks > v3.picks ? '+' : ''}${((v4h.picks - v3.picks) / Math.max(v3.picks, 1) * 100).toFixed(0)}%)\n`;
R += `    Accuracy:    ${v3.accuracy.toFixed(1)}% → ${v4h.accuracy.toFixed(1)}%\n`;
R += `    ROI:         ${pct(v3.roi)} → ${pct(v4h.roi)}\n`;
R += `    Profit:      ${$(v3.profit)} → ${$(v4h.profit)}\n`;
R += `    Max DD:      $${Math.round(v3.maxDD)} → $${Math.round(v4h.maxDD)}\n`;
R += `    V4 Both Sides ROI: ${pct(v4b.roi)} | Picks: ${v4b.picks}\n\n`;

// S2: PER-LEAGUE
R += '━'.repeat(110) + '\n  2. PER-LEAGUE: V1 BASELINE vs V3 BEST+ALL\n' + '━'.repeat(110) + '\n\n';
const h2 = ['League', 'Version', 'Picks', 'Accuracy', 'Wagered', 'Profit', 'ROI', 'Max DD'];
const a2 = ['l', 'l', 'r', 'r', 'r', 'r', 'r', 'r'];
const r2 = [];
for (const lg of LEAGUES) {
  const b = results.v1_baseline.byLeague[lg];
  const e = results.v3_best_full.byLeague[lg];
  if (b) r2.push([lg, 'V1', b.picks, pct(b.accuracy), '$' + Math.round(b.wagered), $(b.profit), pct(b.roi), '-$' + Math.round(b.maxDD)]);
  if (e) r2.push(['', 'V3', e.picks, pct(e.accuracy), '$' + Math.round(e.wagered), $(e.profit), pct(e.roi), '-$' + Math.round(e.maxDD)]);
  if (b && e) r2.push(['', '  Δ', e.picks - b.picks, pct(e.accuracy - b.accuracy), '', $(e.profit - b.profit), pct(e.roi - b.roi), '']);
  r2.push(['', '', '', '', '', '', '', '']);
}
R += tbl(h2, r2.slice(0, -1), a2) + '\n';

// S3: HOME vs AWAY
R += '━'.repeat(110) + '\n  3. HOME vs AWAY (all strategies)\n' + '━'.repeat(110) + '\n\n';
const h3 = ['Strategy', 'Side', 'Picks', 'Accuracy', 'Wagered', 'Profit', 'ROI'];
const a3 = ['l', 'l', 'r', 'r', 'r', 'r', 'r'];
const r3 = [];
for (const k of sKeys) {
  const h = results[k].homeVsAway.home;
  const a = results[k].homeVsAway.away;
  r3.push([STRATEGIES[k].label, 'Home', h.picks, pct(h.accuracy), '$' + Math.round(h.wagered), $(h.profit), pct(h.roi)]);
  r3.push(['', 'Away', a.picks, pct(a.accuracy), '$' + Math.round(a.wagered), $(a.profit), pct(a.roi)]);
  r3.push(['', '', '', '', '', '', '']);
}
R += tbl(h3, r3.slice(0, -1), a3) + '\n';

// S4: HOME/AWAY PER LEAGUE (V3)
R += '━'.repeat(110) + '\n  4. HOME vs AWAY BY LEAGUE (V3: Best+All)\n' + '━'.repeat(110) + '\n\n';
const h4 = ['League', 'H Picks', 'H Acc', 'H ROI', 'A Picks', 'A Acc', 'A ROI', 'Gap'];
const a4 = ['l', 'r', 'r', 'r', 'r', 'r', 'r', 'r'];
const r4 = LEAGUES.map(lg => {
  const l = results.v3_best_full.byLeague[lg];
  if (!l) return [lg, 0, '—', '—', 0, '—', '—', '—'];
  const hA = l.homePicks > 0 ? l.homeCorrect / l.homePicks * 100 : 0;
  const aA = l.awayPicks > 0 ? l.awayCorrect / l.awayPicks * 100 : 0;
  const hR = l.homeWagered > 0 ? l.homeProfit / l.homeWagered * 100 : 0;
  const aR = l.awayWagered > 0 ? l.awayProfit / l.awayWagered * 100 : 0;
  return [lg, l.homePicks, pct(hA), pct(hR), l.awayPicks, pct(aA), pct(aR), pct(hR - aR)];
});
R += tbl(h4, r4, a4) + '\n';

// S5: ODDS BANDS
R += '━'.repeat(110) + '\n  5. ODDS BAND BREAKDOWN: V1 vs V3\n' + '━'.repeat(110) + '\n\n';
const bands = ['Heavy fav (<= -300)', 'Med fav (-300 to -150)', 'Slight fav (-150 to -110)', 'Pick-em (-110 to +110)', 'Slight dog (+110 to +200)', 'Big dog (> +200)'];
const h5 = ['Odds Band', 'Ver', 'Picks', 'Accuracy', 'Profit', 'ROI'];
const a5 = ['l', 'l', 'r', 'r', 'r', 'r'];
const r5 = [];
for (const b of bands) {
  for (const [lbl, k] of [['V1', 'v1_baseline'], ['V3', 'v3_best_full']]) {
    const d = results[k].byOddsBand[b];
    if (d && d.picks > 0) r5.push([b === r5[r5.length-1]?.[0] ? '' : b, lbl, d.picks, pct(d.correct / d.picks * 100), $(d.profit), pct(d.wagered > 0 ? d.profit / d.wagered * 100 : 0)]);
    else r5.push([b === r5[r5.length-1]?.[0] ? '' : b, lbl, 0, '—', '$0', '—']);
  }
  r5.push(['', '', '', '', '', '']);
}
R += tbl(h5, r5.slice(0, -1), a5) + '\n';

// S6: CONFIDENCE BANDS
R += '━'.repeat(110) + '\n  6. CONFIDENCE BAND BREAKDOWN: V1 vs V3\n' + '━'.repeat(110) + '\n\n';
const cBands = ['Elite (85-95)', 'High (75-84)', 'Medium (65-74)', 'Low (50-64)', 'Very Low (30-49)'];
const r6 = [];
for (const b of cBands) {
  for (const [lbl, k] of [['V1', 'v1_baseline'], ['V3', 'v3_best_full']]) {
    const d = results[k].byConfBand[b];
    if (d && d.picks > 0) r6.push([b === r6[r6.length-1]?.[0] ? '' : b, lbl, d.picks, pct(d.correct / d.picks * 100), $(d.profit), pct(d.wagered > 0 ? d.profit / d.wagered * 100 : 0)]);
    else r6.push([b === r6[r6.length-1]?.[0] ? '' : b, lbl, 0, '—', '$0', '—']);
  }
  r6.push(['', '', '', '', '', '']);
}
R += tbl(h5, r6.slice(0, -1), a5) + '\n';

// S7: MONTHLY (V3)
R += '━'.repeat(110) + '\n  7. MONTHLY PERFORMANCE (V3: Best+All)\n' + '━'.repeat(110) + '\n\n';
const months = Object.keys(results.v3_best_full.byMonth).sort();
const h7 = ['Month', 'Picks', 'Correct', 'Accuracy', 'Wagered', 'Profit', 'ROI', 'Cumulative'];
const a7 = ['l', 'r', 'r', 'r', 'r', 'r', 'r', 'r'];
let cum = 0;
const r7 = months.map(m => {
  const d = results.v3_best_full.byMonth[m];
  cum += d.profit;
  return [m, d.picks, d.correct, pct(d.picks > 0 ? d.correct / d.picks * 100 : 0), '$' + Math.round(d.wagered), $(d.profit), pct(d.wagered > 0 ? d.profit / d.wagered * 100 : 0), $(cum)];
});
R += tbl(h7, r7, a7) + '\n';

// S8: RISK/REWARD
R += '━'.repeat(110) + '\n  8. RISK / REWARD SUMMARY\n' + '━'.repeat(110) + '\n\n';
const h8 = ['Strategy', 'Profit', 'Max DD', 'Profit/DD', 'Picks/Day', 'Avg P/L per Pick'];
const a8 = ['l', 'r', 'r', 'r', 'r', 'r'];
const r8 = sKeys.map(k => {
  const o = results[k].overall;
  return [STRATEGIES[k].label, $(o.profit), '-$' + Math.round(o.maxDD), o.maxDD > 0 ? (o.profit / o.maxDD).toFixed(2) : '∞', (o.picks / 365).toFixed(1), o.picks > 0 ? $(o.profit / o.picks) : '$0'];
});
R += tbl(h8, r8, a8) + '\n';

// S9: VERDICT
R += '━'.repeat(110) + '\n  9. VERDICT & REMAINING SUGGESTIONS\n' + '━'.repeat(110) + '\n\n';

let bestK = sKeys[0], bestROI = -Infinity;
for (const k of sKeys) { if (results[k].overall.roi > bestROI) { bestROI = results[k].overall.roi; bestK = k; } }
const bst = results[bestK];
R += `  BEST OVERALL: ${STRATEGIES[bestK].label}\n`;
R += `    ROI: ${pct(bst.overall.roi)} | Profit: ${$(bst.overall.profit)} | Accuracy: ${pct(bst.overall.accuracy)} | Profit/DD: ${bst.overall.maxDD > 0 ? (bst.overall.profit / bst.overall.maxDD).toFixed(2) : '∞'}\n\n`;

R += '  WHAT CHANGED V2 → V3 (all new enhancements):\n';
const v2 = results.v2_balanced.overall;
R += `    • Per-league confidence floors:       Filters low-conf picks in volatile leagues\n`;
R += `    • Sport-season awareness:             Skips out-of-season API calls & noise\n`;
R += `    • Early-line confidence decay:         Reduces confidence for 2+ day-out lines\n`;
R += `    • Hot-streak stake modifier:           1.1-1.25x on win runs, 0.5-0.75x on loss runs\n`;
R += `    • Default strategy switched to "best": Tighter odds (-130 to +200), higher min conf (80%)\n\n`;

R += `  V2 → V3 DELTA:\n`;
R += `    ROI:       ${pct(v2.roi)} → ${pct(v3.roi)} (${pct(v3.roi - v2.roi)})\n`;
R += `    Profit:    ${$(v2.profit)} → ${$(v3.profit)}\n`;
R += `    Max DD:    $${Math.round(v2.maxDD)} → $${Math.round(v3.maxDD)}\n`;
R += `    Accuracy:  ${v2.accuracy.toFixed(1)}% → ${v3.accuracy.toFixed(1)}%\n\n`;

const ho = results.v3_home_only.overall;
R += `  HOME-ONLY MODE (for reference):\n`;
R += `    ROI: ${pct(ho.roi)} | Profit: ${$(ho.profit)} | Picks: ${ho.picks}\n`;
if (ho.roi > v3.roi + 5) {
  R += `    → Home-only is SIGNIFICANTLY better (+${(ho.roi - v3.roi).toFixed(1)}% ROI). Consider enabling HOME_ONLY_MODE=1.\n\n`;
} else {
  R += `    → Comparable to V3 with both sides. Keep HOME_ONLY_MODE off for more volume.\n\n`;
}

R += '  REMAINING SUGGESTIONS:\n\n';
R += '  [1] CLOSING LINE VALUE (CLV) TRACKING\n';
R += '      Track whether our picks beat the closing number. This is the gold standard\n';
R += '      metric for sharp bettors. Add a post-game comparison of our pick odds vs\n';
R += '      closing odds to validate the model is finding real edges, not just noise.\n\n';

R += '  [2] DYNAMIC LEAGUE EXCLUSION\n';
for (const lg of LEAGUES) {
  const l = results.v3_best_full.byLeague[lg];
  if (l && l.roi < 0) {
    R += `      ${lg} is still negative (ROI: ${pct(l.roi)}). Consider excluding or tightening further.\n`;
  }
}
R += '\n';

R += '  [3] BOOKMAKER CONSENSUS TIGHTNESS\n';
R += '      When bookmaker lines are tight (< 5 cent spread), confidence should increase.\n';
R += '      Wide consensus (> 20 cent spread) suggests market uncertainty — reduce sizing.\n\n';

R += '  [4] LIVE BANKROLL INTEGRATION\n';
R += '      Connect actual bankroll tracking to the streak modifier. Current streak state\n';
R += '      resets on server restart. Persist to Supabase for continuity.\n\n';

R += '  [5] BACK-TO-BACK GAME DETECTION\n';
R += '      NBA/NHL teams on back-to-backs historically underperform. Add a rest-day\n';
R += '      lookup that penalizes confidence when a team played the previous day.\n\n';

R += '='.repeat(110) + '\n  END OF REPORT\n' + '='.repeat(110) + '\n';

fs.writeFileSync(path.join(__dirname, 'backtest-v1-vs-v3-report.txt'), R, 'utf8');
fs.writeFileSync(path.join(__dirname, 'backtest-v1-vs-v3-data.json'), JSON.stringify(results, null, 2), 'utf8');
console.log('Report written to backtest-v1-vs-v3-report.txt');
console.log('JSON data written to backtest-v1-vs-v3-data.json');
console.log(`Report: ${R.length} chars, ${R.split('\n').length} lines`);

