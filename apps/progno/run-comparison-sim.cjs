const fs = require('fs');
const path = require('path');

const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'backtest-all-leagues-2024.json'), 'utf8'));

const LEAGUES = ['NFL', 'NBA', 'NHL', 'MLB', 'NCAAB', 'NCAAF'];

// ── Strategy Definitions ──
const STRATEGIES = {
  baseline: {
    name: 'Baseline (no filter)',
    minOdds: -10000, maxOdds: 10000, minConfidence: 0,
    homeBiasBoost: 0, awayBiasPenalty: 0,
    leagueMultipliers: { NFL: 1, NBA: 1, NHL: 1, MLB: 1, NCAAB: 1, NCAAF: 1 }
  },
  balanced_enhanced: {
    name: 'Balanced + Enhanced (NEW)',
    minOdds: -150, maxOdds: 150, minConfidence: 75,
    homeBiasBoost: 5, awayBiasPenalty: 5,
    leagueMultipliers: { NFL: 1, NBA: 1, NHL: 1, MLB: 1, NCAAB: 0.75, NCAAF: 0.5 }
  },
  best_enhanced: {
    name: 'Best + Enhanced',
    minOdds: -130, maxOdds: 200, minConfidence: 80,
    homeBiasBoost: 5, awayBiasPenalty: 5,
    leagueMultipliers: { NFL: 1, NBA: 1, NHL: 1, MLB: 1, NCAAB: 0.75, NCAAF: 0.5 }
  },
  balanced_no_bias: {
    name: 'Balanced (no home bias)',
    minOdds: -150, maxOdds: 150, minConfidence: 75,
    homeBiasBoost: 0, awayBiasPenalty: 0,
    leagueMultipliers: { NFL: 1, NBA: 1, NHL: 1, MLB: 1, NCAAB: 1, NCAAF: 1 }
  },
  home_only_balanced: {
    name: 'Balanced + Home Only',
    minOdds: -150, maxOdds: 150, minConfidence: 75,
    homeBiasBoost: 5, awayBiasPenalty: 5,
    leagueMultipliers: { NFL: 1, NBA: 1, NHL: 1, MLB: 1, NCAAB: 0.75, NCAAF: 0.5 },
    homeOnly: true
  },
};

function oddsToProb(odds) {
  if (odds > 0) return 100 / (odds + 100);
  return Math.abs(odds) / (Math.abs(odds) + 100);
}

function calculateStake(odds, confidence, leagueMultiplier) {
  const impliedProb = oddsToProb(odds);
  const modelProb = confidence / 100;
  const edge = modelProb - impliedProb;
  if (edge <= 0) return 10 * leagueMultiplier;
  const kelly = edge / (1 - impliedProb);
  const baseStake = Math.min(Math.max(kelly * 0.25 * 100, 10), 50);
  return Math.round(baseStake * leagueMultiplier * 100) / 100;
}

function simulateStrategy(stratKey, strat) {
  const results = { overall: null, byLeague: {}, byMonth: {}, byOddsBand: {}, byConfBand: {}, homeVsAway: {} };

  let totalPicks = 0, totalFiltered = 0, totalCorrect = 0;
  let totalWagered = 0, totalProfit = 0;
  let homePicks = 0, homeCorrect = 0, homeProfit = 0, homeWagered = 0;
  let awayPicks = 0, awayCorrect = 0, awayProfit = 0, awayWagered = 0;
  let maxDrawdown = 0, peakBalance = 0, currentBalance = 0;
  let streak = 0, maxWinStreak = 0, maxLossStreak = 0;

  for (const league of LEAGUES) {
    const ld = data[league];
    if (!ld || !ld.races) continue;

    let lPicks = 0, lFiltered = 0, lCorrect = 0, lWagered = 0, lProfit = 0;
    let lHomePicks = 0, lHomeCorrect = 0, lHomeProfit = 0, lHomeWagered = 0;
    let lAwayPicks = 0, lAwayCorrect = 0, lAwayProfit = 0, lAwayWagered = 0;
    let lBalance = 0, lPeak = 0, lMaxDD = 0;

    for (const pick of ld.races) {
      const isHomePick = pick.predictedWinner === pick.homeTeam;

      // Home-only filter
      if (strat.homeOnly && !isHomePick) { lFiltered++; totalFiltered++; continue; }

      // Odds filter
      if (pick.odds < strat.minOdds || pick.odds > strat.maxOdds) {
        lFiltered++; totalFiltered++; continue;
      }

      // Confidence filter (apply home/away bias first)
      let adjConf = pick.confidence;
      if (isHomePick) adjConf += strat.homeBiasBoost;
      else adjConf -= strat.awayBiasPenalty;
      adjConf = Math.max(30, Math.min(95, adjConf));

      if (adjConf < strat.minConfidence) {
        lFiltered++; totalFiltered++; continue;
      }

      const leagueMult = strat.leagueMultipliers[league] || 1;
      const stake = calculateStake(pick.odds, adjConf, leagueMult);
      const profit = pick.correct
        ? (pick.odds > 0 ? stake * (pick.odds / 100) : stake * (100 / Math.abs(pick.odds)))
        : -stake;

      lPicks++; totalPicks++;
      lWagered += stake; totalWagered += stake;
      lProfit += profit; totalProfit += profit;
      if (pick.correct) { lCorrect++; totalCorrect++; }

      // Home/away tracking
      if (isHomePick) {
        lHomePicks++; homePicks++;
        lHomeWagered += stake; homeWagered += stake;
        lHomeProfit += profit; homeProfit += profit;
        if (pick.correct) { lHomeCorrect++; homeCorrect++; }
      } else {
        lAwayPicks++; awayPicks++;
        lAwayWagered += stake; awayWagered += stake;
        lAwayProfit += profit; awayProfit += profit;
        if (pick.correct) { lAwayCorrect++; awayCorrect++; }
      }

      // Balance tracking
      currentBalance += profit;
      lBalance += profit;
      if (currentBalance > peakBalance) peakBalance = currentBalance;
      if (lBalance > lPeak) lPeak = lBalance;
      const dd = peakBalance - currentBalance;
      if (dd > maxDrawdown) maxDrawdown = dd;
      const ldd = lPeak - lBalance;
      if (ldd > lMaxDD) lMaxDD = ldd;

      // Streak tracking
      if (pick.correct) {
        streak = streak > 0 ? streak + 1 : 1;
        if (streak > maxWinStreak) maxWinStreak = streak;
      } else {
        streak = streak < 0 ? streak - 1 : -1;
        if (-streak > maxLossStreak) maxLossStreak = -streak;
      }

      // Monthly buckets
      const month = pick.date ? pick.date.substring(0, 7) : 'unknown';
      if (!results.byMonth[month]) results.byMonth[month] = { picks: 0, correct: 0, wagered: 0, profit: 0 };
      results.byMonth[month].picks++;
      results.byMonth[month].wagered += stake;
      results.byMonth[month].profit += profit;
      if (pick.correct) results.byMonth[month].correct++;

      // Odds band buckets
      let oddsBand;
      if (pick.odds <= -300) oddsBand = 'Heavy fav (<= -300)';
      else if (pick.odds <= -150) oddsBand = 'Med fav (-300 to -150)';
      else if (pick.odds < -110) oddsBand = 'Slight fav (-150 to -110)';
      else if (pick.odds <= 110) oddsBand = 'Pick-em (-110 to +110)';
      else if (pick.odds <= 200) oddsBand = 'Slight dog (+110 to +200)';
      else oddsBand = 'Big dog (> +200)';

      if (!results.byOddsBand[oddsBand]) results.byOddsBand[oddsBand] = { picks: 0, correct: 0, wagered: 0, profit: 0 };
      results.byOddsBand[oddsBand].picks++;
      results.byOddsBand[oddsBand].wagered += stake;
      results.byOddsBand[oddsBand].profit += profit;
      if (pick.correct) results.byOddsBand[oddsBand].correct++;

      // Confidence band buckets
      let confBand;
      if (adjConf >= 85) confBand = 'Elite (85-95)';
      else if (adjConf >= 75) confBand = 'High (75-84)';
      else if (adjConf >= 65) confBand = 'Medium (65-74)';
      else if (adjConf >= 50) confBand = 'Low (50-64)';
      else confBand = 'Very Low (30-49)';

      if (!results.byConfBand[confBand]) results.byConfBand[confBand] = { picks: 0, correct: 0, wagered: 0, profit: 0 };
      results.byConfBand[confBand].picks++;
      results.byConfBand[confBand].wagered += stake;
      results.byConfBand[confBand].profit += profit;
      if (pick.correct) results.byConfBand[confBand].correct++;
    }

    results.byLeague[league] = {
      picks: lPicks, filtered: lFiltered, correct: lCorrect,
      accuracy: lPicks > 0 ? (lCorrect / lPicks * 100) : 0,
      wagered: lWagered, profit: lProfit,
      roi: lWagered > 0 ? (lProfit / lWagered * 100) : 0,
      maxDrawdown: lMaxDD,
      homePicks: lHomePicks, homeCorrect: lHomeCorrect, homeProfit: lHomeProfit, homeWagered: lHomeWagered,
      awayPicks: lAwayPicks, awayCorrect: lAwayCorrect, awayProfit: lAwayProfit, awayWagered: lAwayWagered,
    };
  }

  results.overall = {
    picks: totalPicks, filtered: totalFiltered, correct: totalCorrect,
    accuracy: totalPicks > 0 ? (totalCorrect / totalPicks * 100) : 0,
    wagered: totalWagered, profit: totalProfit,
    roi: totalWagered > 0 ? (totalProfit / totalWagered * 100) : 0,
    maxDrawdown, maxWinStreak, maxLossStreak,
  };

  results.homeVsAway = {
    home: {
      picks: homePicks, correct: homeCorrect,
      accuracy: homePicks > 0 ? (homeCorrect / homePicks * 100) : 0,
      wagered: homeWagered, profit: homeProfit,
      roi: homeWagered > 0 ? (homeProfit / homeWagered * 100) : 0,
    },
    away: {
      picks: awayPicks, correct: awayCorrect,
      accuracy: awayPicks > 0 ? (awayCorrect / awayPicks * 100) : 0,
      wagered: awayWagered, profit: awayProfit,
      roi: awayWagered > 0 ? (awayProfit / awayWagered * 100) : 0,
    }
  };

  return results;
}

// ── Run all strategies ──
const allResults = {};
for (const [key, strat] of Object.entries(STRATEGIES)) {
  allResults[key] = simulateStrategy(key, strat);
}

// ── Format helpers ──
function $(n) { return n >= 0 ? `+$${Math.round(n).toLocaleString()}` : `-$${Math.round(Math.abs(n)).toLocaleString()}`; }
function pct(n) { return (n >= 0 ? '+' : '') + n.toFixed(1) + '%'; }
function pad(s, w, align) {
  s = String(s);
  if (align === 'right') return s.padStart(w);
  return s.padEnd(w);
}

function makeTable(headers, rows, aligns) {
  const widths = headers.map((h, i) => {
    let max = h.length;
    for (const r of rows) { max = Math.max(max, String(r[i]).length); }
    return max + 2;
  });

  let out = '';
  const sep = widths.map(w => '-'.repeat(w)).join('+') + '\n';

  // Header
  out += headers.map((h, i) => pad(h, widths[i], aligns?.[i])).join('|') + '\n';
  out += sep;
  for (const r of rows) {
    out += r.map((c, i) => pad(String(c), widths[i], aligns?.[i])).join('|') + '\n';
  }
  return out;
}

// ── Build Report ──
let report = '';
report += '='.repeat(100) + '\n';
report += '  PROGNO BACKTEST COMPARISON REPORT — 2024 Season Data\n';
report += '  Generated: ' + new Date().toISOString().replace('T', ' ').substring(0, 19) + '\n';
report += '  Data: ' + LEAGUES.join(', ') + ' (' + Object.values(data).reduce((s, d) => s + (d.races?.length || 0), 0) + ' total picks)\n';
report += '='.repeat(100) + '\n\n';

// ── Section 1: Strategy Overview Comparison ──
report += '━'.repeat(100) + '\n';
report += '  1. STRATEGY OVERVIEW — HEAD-TO-HEAD COMPARISON\n';
report += '━'.repeat(100) + '\n\n';

const stratKeys = Object.keys(STRATEGIES);
const overviewHeaders = ['Strategy', 'Picks', 'Filtered', 'Accuracy', 'Wagered', 'Profit', 'ROI', 'Max DD', 'Win Str', 'Loss Str'];
const overviewAligns = ['left', 'right', 'right', 'right', 'right', 'right', 'right', 'right', 'right', 'right'];
const overviewRows = stratKeys.map(k => {
  const o = allResults[k].overall;
  return [
    STRATEGIES[k].name,
    o.picks,
    o.filtered,
    pct(o.accuracy),
    '$' + Math.round(o.wagered).toLocaleString(),
    $(o.profit),
    pct(o.roi),
    '-$' + Math.round(o.maxDrawdown).toLocaleString(),
    o.maxWinStreak,
    o.maxLossStreak,
  ];
});
report += makeTable(overviewHeaders, overviewRows, overviewAligns) + '\n';

// Improvement callout
const base = allResults.baseline.overall;
const enhanced = allResults.balanced_enhanced.overall;
report += '  KEY TAKEAWAY: Balanced + Enhanced vs Baseline\n';
report += `    Picks:      ${base.picks} → ${enhanced.picks} (${enhanced.picks - base.picks} fewer, ${((base.picks - enhanced.picks) / base.picks * 100).toFixed(0)}% reduction)\n`;
report += `    Accuracy:   ${base.accuracy.toFixed(1)}% → ${enhanced.accuracy.toFixed(1)}% (${pct(enhanced.accuracy - base.accuracy)})\n`;
report += `    ROI:        ${pct(base.roi)} → ${pct(enhanced.roi)} (${pct(enhanced.roi - base.roi)})\n`;
report += `    Profit:     ${$(base.profit)} → ${$(enhanced.profit)} (${$(enhanced.profit - base.profit)})\n`;
report += `    Max DD:     $${Math.round(base.maxDrawdown)} → $${Math.round(enhanced.maxDrawdown)} (${pct(-(base.maxDrawdown - enhanced.maxDrawdown) / base.maxDrawdown * 100)} change)\n`;
report += '\n';

// ── Section 2: Per-League Breakdown ──
report += '━'.repeat(100) + '\n';
report += '  2. PER-LEAGUE BREAKDOWN — BASELINE vs BALANCED+ENHANCED\n';
report += '━'.repeat(100) + '\n\n';

const leagueHeaders = ['League', 'Strat', 'Picks', 'Accuracy', 'Wagered', 'Profit', 'ROI', 'Max DD'];
const leagueAligns = ['left', 'left', 'right', 'right', 'right', 'right', 'right', 'right'];
const leagueRows = [];
for (const league of LEAGUES) {
  const b = allResults.baseline.byLeague[league];
  const e = allResults.balanced_enhanced.byLeague[league];
  if (b) leagueRows.push([league, 'Baseline', b.picks, pct(b.accuracy), '$' + Math.round(b.wagered), $(b.profit), pct(b.roi), '-$' + Math.round(b.maxDrawdown)]);
  if (e) leagueRows.push(['', 'Enhanced', e.picks, pct(e.accuracy), '$' + Math.round(e.wagered), $(e.profit), pct(e.roi), '-$' + Math.round(e.maxDrawdown)]);
  if (b && e) {
    const delta = e.roi - b.roi;
    leagueRows.push(['', '  Δ', e.picks - b.picks, pct(e.accuracy - b.accuracy), '', $(e.profit - b.profit), pct(delta), '']);
  }
  leagueRows.push(['', '', '', '', '', '', '', '']);
}
report += makeTable(leagueHeaders, leagueRows.slice(0, -1), leagueAligns) + '\n';

// ── Section 3: Home vs Away ──
report += '━'.repeat(100) + '\n';
report += '  3. HOME vs AWAY ANALYSIS (per strategy)\n';
report += '━'.repeat(100) + '\n\n';

const haHeaders = ['Strategy', 'Side', 'Picks', 'Accuracy', 'Wagered', 'Profit', 'ROI'];
const haAligns = ['left', 'left', 'right', 'right', 'right', 'right', 'right'];
const haRows = [];
for (const k of stratKeys) {
  const h = allResults[k].homeVsAway.home;
  const a = allResults[k].homeVsAway.away;
  haRows.push([STRATEGIES[k].name, 'Home', h.picks, pct(h.accuracy), '$' + Math.round(h.wagered), $(h.profit), pct(h.roi)]);
  haRows.push(['', 'Away', a.picks, pct(a.accuracy), '$' + Math.round(a.wagered), $(a.profit), pct(a.roi)]);
  haRows.push(['', '', '', '', '', '', '']);
}
report += makeTable(haHeaders, haRows.slice(0, -1), haAligns) + '\n';

// ── Section 4: Home vs Away per League (Enhanced only) ──
report += '━'.repeat(100) + '\n';
report += '  4. HOME vs AWAY BY LEAGUE (Balanced + Enhanced strategy)\n';
report += '━'.repeat(100) + '\n\n';

const hblHeaders = ['League', 'Home Picks', 'Home Acc', 'Home ROI', 'Away Picks', 'Away Acc', 'Away ROI', 'H-A ROI Gap'];
const hblAligns = ['left', 'right', 'right', 'right', 'right', 'right', 'right', 'right'];
const hblRows = [];
for (const league of LEAGUES) {
  const l = allResults.balanced_enhanced.byLeague[league];
  if (!l) continue;
  const hAcc = l.homePicks > 0 ? (l.homeCorrect / l.homePicks * 100) : 0;
  const aAcc = l.awayPicks > 0 ? (l.awayCorrect / l.awayPicks * 100) : 0;
  const hRoi = l.homeWagered > 0 ? (l.homeProfit / l.homeWagered * 100) : 0;
  const aRoi = l.awayWagered > 0 ? (l.awayProfit / l.awayWagered * 100) : 0;
  hblRows.push([league, l.homePicks, pct(hAcc), pct(hRoi), l.awayPicks, pct(aAcc), pct(aRoi), pct(hRoi - aRoi)]);
}
report += makeTable(hblHeaders, hblRows, hblAligns) + '\n';

// ── Section 5: Odds Band Comparison ──
report += '━'.repeat(100) + '\n';
report += '  5. ODDS BAND BREAKDOWN — BASELINE vs ENHANCED\n';
report += '━'.repeat(100) + '\n\n';

const oddsBands = ['Heavy fav (<= -300)', 'Med fav (-300 to -150)', 'Slight fav (-150 to -110)', 'Pick-em (-110 to +110)', 'Slight dog (+110 to +200)', 'Big dog (> +200)'];
const obHeaders = ['Odds Band', 'Strat', 'Picks', 'Accuracy', 'Profit', 'ROI'];
const obAligns = ['left', 'left', 'right', 'right', 'right', 'right'];
const obRows = [];
for (const band of oddsBands) {
  const b = allResults.baseline.byOddsBand[band];
  const e = allResults.balanced_enhanced.byOddsBand[band];
  if (b) obRows.push([band, 'Base', b.picks, pct(b.picks > 0 ? b.correct / b.picks * 100 : 0), $(b.profit), pct(b.wagered > 0 ? b.profit / b.wagered * 100 : 0)]);
  else obRows.push([band, 'Base', 0, '0.0%', '$0', '0.0%']);
  if (e) obRows.push(['', 'Enh', e.picks, pct(e.picks > 0 ? e.correct / e.picks * 100 : 0), $(e.profit), pct(e.wagered > 0 ? e.profit / e.wagered * 100 : 0)]);
  else obRows.push(['', 'Enh', 0, '—', '$0', '—']);
  obRows.push(['', '', '', '', '', '']);
}
report += makeTable(obHeaders, obRows.slice(0, -1), obAligns) + '\n';

// ── Section 6: Confidence Band Comparison ──
report += '━'.repeat(100) + '\n';
report += '  6. CONFIDENCE BAND BREAKDOWN — BASELINE vs ENHANCED\n';
report += '━'.repeat(100) + '\n\n';

const confBands = ['Elite (85-95)', 'High (75-84)', 'Medium (65-74)', 'Low (50-64)', 'Very Low (30-49)'];
const cbHeaders = ['Conf Band', 'Strat', 'Picks', 'Accuracy', 'Profit', 'ROI'];
const cbAligns = ['left', 'left', 'right', 'right', 'right', 'right'];
const cbRows = [];
for (const band of confBands) {
  const b = allResults.baseline.byConfBand[band];
  const e = allResults.balanced_enhanced.byConfBand[band];
  if (b) cbRows.push([band, 'Base', b.picks, pct(b.picks > 0 ? b.correct / b.picks * 100 : 0), $(b.profit), pct(b.wagered > 0 ? b.profit / b.wagered * 100 : 0)]);
  else cbRows.push([band, 'Base', 0, '—', '$0', '—']);
  if (e) cbRows.push(['', 'Enh', e.picks, pct(e.picks > 0 ? e.correct / e.picks * 100 : 0), $(e.profit), pct(e.wagered > 0 ? e.profit / e.wagered * 100 : 0)]);
  else cbRows.push(['', 'Enh', 0, '—', '$0', '—']);
  cbRows.push(['', '', '', '', '', '']);
}
report += makeTable(cbHeaders, cbRows.slice(0, -1), cbAligns) + '\n';

// ── Section 7: Monthly Performance (Enhanced) ──
report += '━'.repeat(100) + '\n';
report += '  7. MONTHLY PERFORMANCE — BALANCED + ENHANCED\n';
report += '━'.repeat(100) + '\n\n';

const monthHeaders = ['Month', 'Picks', 'Correct', 'Accuracy', 'Wagered', 'Profit', 'ROI', 'Cumulative P/L'];
const monthAligns = ['left', 'right', 'right', 'right', 'right', 'right', 'right', 'right'];
const months = Object.keys(allResults.balanced_enhanced.byMonth).sort();
let cumPL = 0;
const monthRows = months.map(m => {
  const d = allResults.balanced_enhanced.byMonth[m];
  cumPL += d.profit;
  return [m, d.picks, d.correct, pct(d.picks > 0 ? d.correct / d.picks * 100 : 0), '$' + Math.round(d.wagered), $(d.profit), pct(d.wagered > 0 ? d.profit / d.wagered * 100 : 0), $(cumPL)];
});
report += makeTable(monthHeaders, monthRows, monthAligns) + '\n';

// ── Section 8: Risk / Reward Summary ──
report += '━'.repeat(100) + '\n';
report += '  8. RISK / REWARD SUMMARY\n';
report += '━'.repeat(100) + '\n\n';

const rrHeaders = ['Strategy', 'Profit', 'Max DD', 'Profit/DD Ratio', 'Sharpe-like', 'Picks/Day'];
const rrAligns = ['left', 'right', 'right', 'right', 'right', 'right'];
const totalDays = 365;
const rrRows = stratKeys.map(k => {
  const o = allResults[k].overall;
  const ratio = o.maxDrawdown > 0 ? (o.profit / o.maxDrawdown) : Infinity;
  const avgDailyReturn = o.profit / totalDays;
  const stdEst = o.maxDrawdown / 3;
  const sharpe = stdEst > 0 ? (avgDailyReturn / stdEst * Math.sqrt(252)) : 0;
  return [
    STRATEGIES[k].name,
    $(o.profit),
    '-$' + Math.round(o.maxDrawdown),
    ratio === Infinity ? '∞' : ratio.toFixed(2),
    sharpe.toFixed(2),
    (o.picks / totalDays).toFixed(1),
  ];
});
report += makeTable(rrHeaders, rrRows, rrAligns) + '\n';

// ── Section 9: Recommendations ──
report += '━'.repeat(100) + '\n';
report += '  9. ENHANCEMENT RECOMMENDATIONS\n';
report += '━'.repeat(100) + '\n\n';

// Compare all strategies to find the best
let bestKey = stratKeys[0];
let bestROI = allResults[stratKeys[0]].overall.roi;
for (const k of stratKeys) {
  if (allResults[k].overall.roi > bestROI) { bestROI = allResults[k].overall.roi; bestKey = k; }
}
const best = allResults[bestKey];

report += `  BEST OVERALL STRATEGY: ${STRATEGIES[bestKey].name}\n`;
report += `    ROI: ${pct(best.overall.roi)} | Profit: ${$(best.overall.profit)} | Accuracy: ${pct(best.overall.accuracy)}\n\n`;

// Find worst-performing league in enhanced
let worstLeague = LEAGUES[0], worstROI = Infinity;
for (const league of LEAGUES) {
  const l = allResults.balanced_enhanced.byLeague[league];
  if (l && l.roi < worstROI) { worstROI = l.roi; worstLeague = league; }
}

report += '  ACTIONABLE RECOMMENDATIONS:\n\n';
report += '  [1] LEAGUE-SPECIFIC TUNING\n';
report += `      Worst league: ${worstLeague} (ROI: ${pct(worstROI)})\n`;
report += `      Consider: Tighter odds range for ${worstLeague}, or exclude entirely if consistently negative.\n\n`;

// Check if home-only is better
const homeOnlyROI = allResults.home_only_balanced?.overall?.roi || 0;
const enhancedROI = allResults.balanced_enhanced.overall.roi;
if (homeOnlyROI > enhancedROI) {
  report += '  [2] HOME-ONLY FILTERING\n';
  report += `      Home-only ROI (${pct(homeOnlyROI)}) BEATS enhanced ROI (${pct(enhancedROI)})\n`;
  report += '      Strongly consider enabling home-only mode to eliminate away-pick drag.\n\n';
} else {
  report += '  [2] HOME-ONLY FILTERING\n';
  report += `      Home-only ROI (${pct(homeOnlyROI)}) vs Enhanced ROI (${pct(enhancedROI)})\n`;
  report += '      Home-only cuts volume but may not improve returns. Keep both sides with bias.\n\n';
}

// Check best vs balanced
const bestEnhROI = allResults.best_enhanced.overall.roi;
report += '  [3] BEST vs BALANCED FILTER\n';
report += `      Best filter ROI: ${pct(bestEnhROI)} (${allResults.best_enhanced.overall.picks} picks)\n`;
report += `      Balanced filter ROI: ${pct(enhancedROI)} (${enhanced.picks} picks)\n`;
if (bestEnhROI > enhancedROI + 5) {
  report += '      → "Best" filter is significantly better. Consider switching FILTER_STRATEGY=best\n\n';
} else if (enhancedROI > bestEnhROI + 5) {
  report += '      → "Balanced" filter produces better results with more volume. Keep FILTER_STRATEGY=balanced\n\n';
} else {
  report += '      → Results are comparable. "Balanced" gives more action; "Best" is more selective.\n\n';
}

// Confidence-based insight
const enhancedConf = allResults.balanced_enhanced.byConfBand;
report += '  [4] CONFIDENCE FLOOR TUNING\n';
for (const band of confBands) {
  const d = enhancedConf[band];
  if (d && d.picks > 0) {
    const roi = d.wagered > 0 ? d.profit / d.wagered * 100 : 0;
    if (roi < -10) {
      report += `      ${band}: ROI ${pct(roi)} — consider raising min confidence to exclude this band\n`;
    }
  }
}
report += '\n';

// Monthly patterns
report += '  [5] SEASONAL PATTERNS\n';
let bestMonth = '', bestMROI = -Infinity, worstMonth = '', worstMROI = Infinity;
for (const m of months) {
  const d = allResults.balanced_enhanced.byMonth[m];
  const mRoi = d.wagered > 0 ? d.profit / d.wagered * 100 : 0;
  if (mRoi > bestMROI) { bestMROI = mRoi; bestMonth = m; }
  if (mRoi < worstMROI) { worstMROI = mRoi; worstMonth = m; }
}
report += `      Best month:  ${bestMonth} (ROI: ${pct(bestMROI)})\n`;
report += `      Worst month: ${worstMonth} (ROI: ${pct(worstMROI)})\n`;
report += '      Consider seasonal adjustments or reduced sizing during historically weak months.\n\n';

report += '  [6] FURTHER ENHANCEMENTS TO EXPLORE\n';
report += '      • Implement dynamic confidence thresholds per league (e.g., NCAAF needs 80+, NBA works at 70+)\n';
report += '      • Add a "hot streak" detector — increase stakes during winning streaks, reduce after 3+ losses\n';
report += '      • Integrate closing-line value (CLV) tracking to measure if picks beat the closing number\n';
report += '      • Add sport-season awareness (skip out-of-season leagues to reduce API costs)\n';
report += '      • Implement time-weighted confidence decay for early-line picks\n';
report += '      • Track and weight picks by bookmaker consensus spread (tighter consensus = higher confidence)\n';
report += '\n';

report += '='.repeat(100) + '\n';
report += '  END OF REPORT\n';
report += '='.repeat(100) + '\n';

// Write report
const outPath = path.join(__dirname, 'backtest-comparison-report.txt');
fs.writeFileSync(outPath, report, 'utf8');
console.log('Report written to:', outPath);
console.log('Report length:', report.length, 'chars');

// Also dump JSON for programmatic use
const jsonPath = path.join(__dirname, 'backtest-comparison-data.json');
fs.writeFileSync(jsonPath, JSON.stringify(allResults, null, 2), 'utf8');
console.log('JSON data written to:', jsonPath);
