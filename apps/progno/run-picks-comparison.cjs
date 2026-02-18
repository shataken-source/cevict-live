const fs = require('fs');
const path = require('path');

const origFile = path.join(__dirname, 'predictions-2026-02-18.json');
const orig = JSON.parse(fs.readFileSync(origFile, 'utf8'));
const picks = orig.picks;

// V3 filter configs
const FILTERS = {
  best:     { minOdds: -130, maxOdds: 200, minConf: 80 },
  balanced: { minOdds: -150, maxOdds: 150, minConf: 75 },
};
const LEAGUE_CONF_FLOOR = { NCAAB: 75, NBA: 70, NHL: 70, MLB: 70, NFL: 75, NCAAF: 80 };
const HOME_BIAS = 5;
const AWAY_PENALTY = 5;
const SPORT_SEASONS = {
  NCAAB: { start: 11, end: 4 },
  NBA:   { start: 10, end: 6 },
  NHL:   { start: 10, end: 6 },
  MLB:   { start: 3,  end: 10 },
  NFL:   { start: 9,  end: 2 },
  NCAAF: { start: 8,  end: 1 },
  CBB:   { start: 2,  end: 6 },
};
function inSeason(league) {
  const s = SPORT_SEASONS[league];
  if (!s) return true;
  const month = 2; // February 2026
  if (s.start <= s.end) return month >= s.start && month <= s.end;
  return month >= s.start || month <= s.end;
}
function earlyDecay(commenceTime) {
  const game = new Date(commenceTime);
  const now = new Date('2026-02-18T08:00:00Z');
  const days = (game.getTime() - now.getTime()) / 86400000;
  if (days <= 1) return 1.0;
  if (days <= 2) return 0.97;
  if (days <= 3) return 0.93;
  return 0.88;
}

let R = '';
R += '='.repeat(110) + '\n';
R += '  PROGNO PICKS COMPARISON: Original (V1) vs V3 Enhanced Filters\n';
R += '  Date: 2026-02-18  |  Generated: ' + new Date().toISOString().replace('T',' ').substring(0,19) + '\n';
R += '='.repeat(110) + '\n\n';

// ── Section 1: Original Picks Summary ──
R += '━'.repeat(110) + '\n  1. ORIGINAL PICKS SUMMARY (pre-enhancement)\n' + '━'.repeat(110) + '\n\n';
R += `  Total picks generated: ${picks.length} (from ${orig.message})\n\n`;

let sportCounts = {};
let homePicks = 0, awayPicks = 0;
let totalConf = 0, minConf = 100, maxConf = 0;
let totalOdds = 0, minOdds = 99999, maxOdds = -99999;
let favPicks = 0, dogPicks = 0;

for (const p of picks) {
  sportCounts[p.sport] = (sportCounts[p.sport] || 0) + 1;
  const isHome = p.pick === p.home_team;
  if (isHome) homePicks++; else awayPicks++;
  totalConf += p.confidence;
  if (p.confidence < minConf) minConf = p.confidence;
  if (p.confidence > maxConf) maxConf = p.confidence;
  totalOdds += p.odds;
  if (p.odds < minOdds) minOdds = p.odds;
  if (p.odds > maxOdds) maxOdds = p.odds;
  if (p.is_favorite_pick) favPicks++; else dogPicks++;
}

R += '  Sport breakdown:\n';
for (const [s, c] of Object.entries(sportCounts)) R += `    ${s}: ${c} picks\n`;
R += '\n';
R += `  Home picks: ${homePicks}  |  Away picks: ${awayPicks}  |  Ratio: ${(homePicks/(homePicks+awayPicks)*100).toFixed(0)}% home\n`;
R += `  Favorite picks: ${favPicks}  |  Underdog picks: ${dogPicks}\n`;
R += `  Confidence: min ${minConf}%, max ${maxConf}%, avg ${(totalConf/picks.length).toFixed(1)}%\n`;
R += `  Odds: min +${minOdds}, max +${maxOdds}, avg +${(totalOdds/picks.length).toFixed(0)}\n\n`;

// ── Section 2: Each Pick Through V3 Filters ──
R += '━'.repeat(110) + '\n  2. PICK-BY-PICK V3 FILTER ANALYSIS\n' + '━'.repeat(110) + '\n\n';

R += '  Legend: [PASS] = survives V3 filters  |  [FAIL: reason] = filtered out\n\n';

const filterResults = { best: [], balanced: [] };

for (const [stratName, filt] of Object.entries(FILTERS)) {
  R += `  ─── Strategy: ${stratName.toUpperCase()} (odds ${filt.minOdds} to +${filt.maxOdds}, min conf ${filt.minConf}%) ───\n\n`;

  let passed = 0, failed = 0;
  const reasons = {};

  for (let i = 0; i < picks.length; i++) {
    const p = picks[i];
    const isHome = p.pick === p.home_team;
    const league = p.league || p.sport;
    let status = 'PASS';
    let failReason = '';

    // Season check
    if (!inSeason(league)) {
      status = 'FAIL'; failReason = `${league} out of season (Feb)`;
    }

    // Odds filter
    if (status === 'PASS') {
      const favOdds = Math.min(p.odds, -(p.odds > 0 ? (100*100/p.odds) : p.odds));
      if (p.odds > filt.maxOdds) {
        status = 'FAIL'; failReason = `odds +${p.odds} > max +${filt.maxOdds}`;
      }
    }

    // Confidence with bias
    if (status === 'PASS') {
      let adjConf = p.confidence;
      if (isHome) adjConf += HOME_BIAS; else adjConf -= AWAY_PENALTY;
      const decay = earlyDecay(p.game_time);
      adjConf = Math.round(adjConf * decay);
      adjConf = Math.max(30, Math.min(95, adjConf));

      if (adjConf < filt.minConf) {
        status = 'FAIL'; failReason = `conf ${p.confidence}% → ${adjConf}% (adj) < min ${filt.minConf}%`;
      }

      // League floor
      if (status === 'PASS') {
        const leagueFloor = LEAGUE_CONF_FLOOR[league] || 70;
        if (adjConf < leagueFloor) {
          status = 'FAIL'; failReason = `conf ${adjConf}% < ${league} floor ${leagueFloor}%`;
        }
      }
    }

    if (status === 'PASS') passed++; else failed++;
    if (failReason) reasons[failReason] = (reasons[failReason] || 0) + 1;

    const homeFlag = isHome ? 'H' : 'A';
    const shortPick = `${p.pick.split(' ').pop()} (${homeFlag})`;
    R += `  ${String(i+1).padStart(2)}. ${shortPick.padEnd(28)} Conf:${String(p.confidence).padStart(3)}%  Odds:+${String(p.odds).padStart(3)}  → [${status}${failReason ? ': ' + failReason : ''}]\n`;

    filterResults[stratName].push({ ...p, status, failReason, isHome });
  }

  R += `\n  Result: ${passed} PASS / ${failed} FAIL out of ${picks.length}\n`;
  if (Object.keys(reasons).length > 0) {
    R += '  Failure reasons:\n';
    for (const [reason, count] of Object.entries(reasons).sort((a,b) => b[1] - a[1])) {
      R += `    ${count}x — ${reason}\n`;
    }
  }
  R += '\n';
}

// ── Section 3: Critical Problems Found ──
R += '━'.repeat(110) + '\n  3. CRITICAL PROBLEMS IN ORIGINAL PICKS\n' + '━'.repeat(110) + '\n\n';

R += '  PROBLEM 1: ALL picks are LOW CONFIDENCE (32-44%)\n';
R += '    V3 "best" filter requires 80% minimum. Every single pick fails.\n';
R += '    V3 "balanced" filter requires 75% minimum. Every single pick fails.\n';
R += '    Root cause: The confidence formula is producing values way below the MC win probabilities.\n';
R += '    Example: Pepperdine has 59.3% MC win rate but only 44% confidence.\n';
R += '    Expected: Confidence should be much closer to MC probability for non-heavy-favorite picks.\n\n';

R += '  PROBLEM 2: ALL picks are UNDERDOGS with high odds (+166 to +480)\n';
R += '    V3 "best" filter caps at +200. Only 5 of 20 picks have odds <= +200.\n';
R += '    The model is systematically picking long-shot underdogs (the very picks\n';
R += '    that the 2024 backtest showed lose money: "Big dog > +200" = negative ROI).\n\n';

R += '  PROBLEM 3: AWAY BIAS — 16 of 20 picks (80%) are away team picks\n';
R += '    Backtest showed: Home ROI +112%, Away ROI -18%.\n';
R += '    The V3 home bias (+5% conf / -5% away) helps but doesn\'t fix this\n';
R += '    when 80% of generated picks are already away.\n\n';

R += '  PROBLEM 4: MODEL PROBABILITY vs MARKET ODDS DISCONNECT\n';
R += '    Example: Pepperdine — Model says 59.3% win, Market says 27.2% (odds +235)\n';
R += '    A 32% edge over the market is unrealistic. This suggests the MC sim is\n';
R += '    overestimating underdog probabilities, likely because it estimates team\n';
R += '    stats from odds alone and the estimation method favors underdogs.\n\n';

// ── Section 4: What V3 WOULD Generate ──
R += '━'.repeat(110) + '\n  4. WHAT V3 WOULD DO WITH THESE 79 GAMES\n' + '━'.repeat(110) + '\n\n';

R += '  With V3 "best" filter active:\n';
R += '    • Odds filter (-130 to +200): ~35-40 of 79 games survive (pick-em range)\n';
R += '    • Season filter: NBA (in season), NCAAB (in season) = ~79 games OK\n';
R += '    • Confidence filter (80% min): Depends on recalculated confidence\n';
R += '    • Home bias: Home picks boosted +5%, away penalised -5%\n';
R += '    • Early decay: Games 2+ days out get 3-12% confidence reduction\n';
R += '    • League floor: NCAAB needs 75%, NBA needs 70%\n\n';

R += '  Expected V3 output: 5-12 picks (vs 20 original)\n';
R += '    • Focused on pick-em lines (-130 to +200)\n';
R += '    • Higher confidence (80%+)\n';
R += '    • Home-biased selection\n';
R += '    • Smaller stakes on NCAAB (75% multiplier)\n';
R += '    • Backtest-validated: 82% ROI vs 27.7% baseline\n\n';

// ── Section 5: Recommendations ──
R += '━'.repeat(110) + '\n  5. RECOMMENDATIONS & ENHANCEMENT SUGGESTIONS\n' + '━'.repeat(110) + '\n\n';

R += '  [CRITICAL] FIX CONFIDENCE FORMULA\n';
R += '    Current: baseConfidence = 50 + (probDiff * 80)\n';
R += '    Problem: For underdog picks where favoriteProb = 0.59,\n';
R += '      probDiff = |0.59 - 0.5| = 0.09, so base = 50 + 7.2 = 57.2\n';
R += '      Then MC ceiling caps it at max(mcWinProb * 100 + 3) = 62.3%\n';
R += '      Then away bias -5% → 57.3%. Still below 80%.\n';
R += '    Solution: For picks where MC win prob > 65%, the base confidence\n';
R += '      should reflect the MC probability more directly. Consider:\n';
R += '      baseConfidence = Math.max(50 + probDiff * 80, mcWinProb * 85)\n';
R += '      This would give Pepperdine: max(57.2, 50.4) = 57.2... still low.\n';
R += '    Real fix: The MC ceiling is the bottleneck. MC says 59% but this\n';
R += '      caps confidence at 62%. Raise ceiling to mcWinProb * 100 + 10\n';
R += '      for picks where model edge > 15% over market.\n\n';

R += '  [CRITICAL] STOP PICKING HEAVY UNDERDOGS\n';
R += '    The composite_score formula heavily rewards high EV/edge numbers.\n';
R += '    Underdogs get inflated EV ($98-$150+ per $100) because their odds\n';
R += '    are high, but these are rarely correct. The odds filter at +200 max\n';
R += '    will fix this, but only if the buildPickFromRawGame function properly\n';
R += '    skips games where the RECOMMENDED pick odds exceed +200.\n';
R += '    Current filter checks homeOdds.price / awayOdds.price but needs\n';
R += '    to also check the FAVORITE odds (the lower of the two).\n\n';

R += '  [IMPORTANT] RECALIBRATE MC SIM TEAM STATS ESTIMATION\n';
R += '    The estimateTeamStatsFromOdds() function appears to overestimate\n';
R += '    underdog strength. When a team is +235, the model shouldn\'t give\n';
R += '    them 59% win probability. Possible fix: Weight the MC seed values\n';
R += '    closer to the implied market probabilities rather than generating\n';
R += '    symmetric-ish distributions.\n\n';

R += '  [ENHANCEMENT] ADD RECOMMENDED-PICK ODDS CHECK\n';
R += '    After the recommended pick is selected (line ~940 in route.ts),\n';
R += '    add a second odds check on recommendedOdds itself:\n';
R += '    if (recommendedOdds > activeFilter.maxOdds) return null;\n';
R += '    This catches cases where the value bet side is an underdog\n';
R += '    outside the filter range even if the game odds are within range.\n\n';

R += '  [ENHANCEMENT] COMPOSITE SCORE REBALANCING\n';
R += '    Current: edge*40 + ev*40 + confidence*20\n';
R += '    Problem: EV is inflated for underdogs (a +400 dog with 20% edge = $80 EV)\n';
R += '    Suggestion: confidence*50 + edge*30 + ev*20\n';
R += '    This would prioritise higher-confidence picks over high-EV longshots.\n\n';

R += '  [ENHANCEMENT] ADD POST-FILTER RECOMMENDED-ODDS CHECK\n';
R += '    The current odds filter checks game-level odds (home vs away),\n';
R += '    but the recommended pick can be a spread or total bet at -110.\n';
R += '    Add a check that the MONEYLINE recommended pick odds (not\n';
R += '    spread/total odds) fall within the filter range.\n\n';

R += '='.repeat(110) + '\n  END OF COMPARISON REPORT\n' + '='.repeat(110) + '\n';

const outPath = path.join(__dirname, 'picks-comparison-2026-02-18.txt');
fs.writeFileSync(outPath, R, 'utf8');
console.log('Report:', outPath, '(' + R.length + ' chars)');
