/**
 * College Baseball (CBB) Monte Carlo Simulation
 * Runs 1000 simulations per game using real CBB matchups from Feb 21-27.
 * Validates: (1) scores are baseball-realistic, (2) no away picks get through, (3) HOME_ONLY blocks away favs.
 */

// Inline the MC engine logic since we can't import ESM from CJS easily
function poissonRandom(lambda) {
  let L = Math.exp(-lambda), k = 0, p = 1;
  do { k++; p *= Math.random(); } while (p > L);
  return k - 1;
}

function normalRandom(mean, stdDev) {
  const u1 = Math.random(), u2 = Math.random();
  return mean + stdDev * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

const CBB_PARAMS = { avgScore: 5.0, stdDev: 3.0, minScore: 0, maxScore: 20, homeAdvantage: 0.3, usePoisson: true };
const MLB_PARAMS = { avgScore: 4.5, stdDev: 2.5, minScore: 0, maxScore: 15, homeAdvantage: 0.2, usePoisson: true };
const NCAAB_PARAMS = { avgScore: 72, stdDev: 11, minScore: 40, maxScore: 110, homeAdvantage: 4.0, usePoisson: false };

function simulateGame(homeExpected, awayExpected, params) {
  let homeScore, awayScore;
  if (params.usePoisson) {
    homeScore = poissonRandom(Math.max(0.5, homeExpected));
    awayScore = poissonRandom(Math.max(0.5, awayExpected));
  } else {
    homeScore = Math.round(normalRandom(homeExpected, params.stdDev));
    awayScore = Math.round(normalRandom(awayExpected, params.stdDev));
  }
  homeScore = Math.max(params.minScore, Math.min(params.maxScore, homeScore));
  awayScore = Math.max(params.minScore, Math.min(params.maxScore, awayScore));
  return { homeScore, awayScore };
}

function runMC(homeExpected, awayExpected, params, iterations = 1000) {
  let homeWins = 0, totalHomeScore = 0, totalAwayScore = 0;
  const homeScores = [], awayScores = [];
  for (let i = 0; i < iterations; i++) {
    const { homeScore, awayScore } = simulateGame(homeExpected, awayExpected, params);
    homeScores.push(homeScore);
    awayScores.push(awayScore);
    totalHomeScore += homeScore;
    totalAwayScore += awayScore;
    if (homeScore > awayScore) homeWins++;
  }
  const avgHome = totalHomeScore / iterations;
  const avgAway = totalAwayScore / iterations;
  return {
    homeWinProb: homeWins / iterations,
    avgHomeScore: Math.round(avgHome * 10) / 10,
    avgAwayScore: Math.round(avgAway * 10) / 10,
    homeScoreP5: homeScores.sort((a, b) => a - b)[Math.floor(iterations * 0.05)],
    homeScoreP95: homeScores.sort((a, b) => a - b)[Math.floor(iterations * 0.95)],
    awayScoreP5: awayScores.sort((a, b) => a - b)[Math.floor(iterations * 0.05)],
    awayScoreP95: awayScores.sort((a, b) => a - b)[Math.floor(iterations * 0.95)],
  };
}

// Odds to implied probability
function oddsToProb(odds) {
  if (odds > 0) return 100 / (odds + 100);
  return Math.abs(odds) / (Math.abs(odds) + 100);
}

// Real CBB games from Supabase (Feb 21-27) with their actual results
const games = [
  { home: 'UCF Knights', away: 'LSU Tigers', homeOdds: -130, awayOdds: 110, actualHome: 0, actualAway: 11, actualWinner: 'LSU Tigers' },
  { home: 'Stetson Hatters', away: 'Virginia Cavaliers', homeOdds: -115, awayOdds: -105, actualHome: 6, actualAway: 5, actualWinner: 'Stetson Hatters' },
  { home: 'McNeese Cowboys', away: 'Kansas Jayhawks', homeOdds: 150, awayOdds: -170, actualHome: 2, actualAway: 8, actualWinner: 'Kansas Jayhawks' },
  { home: 'UC Riverside Highlanders', away: 'BYU Cougars', homeOdds: 140, awayOdds: -160, actualHome: 3, actualAway: 11, actualWinner: 'BYU Cougars' },
  { home: 'Kansas St Wildcats', away: 'Michigan Wolverines', homeOdds: -120, awayOdds: 100, actualHome: 10, actualAway: 6, actualWinner: 'Kansas St Wildcats' },
  { home: 'Loyola Marymount Lions', away: 'TCU Horned Frogs', homeOdds: 160, awayOdds: -180, actualHome: 7, actualAway: 17, actualWinner: 'TCU Horned Frogs' },
  { home: 'James Madison Dukes', away: 'Virginia Tech Hokies', homeOdds: -110, awayOdds: -110, actualHome: 4, actualAway: 5, actualWinner: 'Virginia Tech Hokies' },
  { home: 'Arkansas-Little Rock Trojans', away: 'Memphis Tigers', homeOdds: 200, awayOdds: -240, actualHome: 5, actualAway: 24, actualWinner: 'Memphis Tigers' },
  { home: 'Charleston Cougars', away: 'East Carolina Pirates', homeOdds: -115, awayOdds: -105, actualHome: 8, actualAway: 7, actualWinner: 'East Carolina Pirates' },
  { home: 'Florida Atlantic Owls', away: 'Miami Hurricanes', homeOdds: 130, awayOdds: -150, actualHome: 7, actualAway: 11, actualWinner: 'Miami Hurricanes' },
  { home: 'Georgia Bulldogs', away: 'Troy Trojans', homeOdds: -300, awayOdds: 250, actualHome: 5, actualAway: 6, actualWinner: 'Troy Trojans' },
  { home: 'North Carolina Tar Heels', away: 'VCU Rams', homeOdds: -250, awayOdds: 210, actualHome: 13, actualAway: 3, actualWinner: 'North Carolina Tar Heels' },
  { home: 'Arkansas Razorbacks', away: 'Arkansas St Red Wolves', homeOdds: -350, awayOdds: 280, actualHome: 4, actualAway: 12, actualWinner: 'Arkansas St Red Wolves' },
  { home: 'Kennesaw St Owls', away: 'West Virginia Mountaineers', homeOdds: 180, awayOdds: -200, actualHome: 4, actualAway: 12, actualWinner: 'West Virginia Mountaineers' },
  { home: 'South Carolina Gamecocks', away: 'Clemson Tigers', homeOdds: -140, awayOdds: 120, actualHome: 7, actualAway: 0, actualWinner: 'South Carolina Gamecocks' },
  { home: 'San Diego Toreros', away: 'Michigan Wolverines', homeOdds: -115, awayOdds: -105, actualHome: 6, actualAway: 5, actualWinner: 'San Diego Toreros' },
];

const HOME_BIAS_BOOST = 5;
const AWAY_BIAS_PENALTY = 5;
const HOME_ONLY_MODE = true;
const ITERATIONS = 1000;

// We'll test multiple confidence floor values
const FLOORS_TO_TEST = [55, 57, 59, 62];

// ── Key insight: in baseball, odds reflect true probability more directly than in basketball.
// A -300 favorite in baseball has ~75% implied probability. We need the MC engine
// to AMPLIFY the odds differential into expected runs, not just add a flat 0.3 home bonus.
// The fix: derive expected runs from implied probability, not just flat avgScore ± homeAdv.

function deriveExpectedRuns(homeProb, awayProb, totalExpected, homeAdv) {
  // Higher-probability team should score proportionally more runs
  // In baseball, a 60% favorite might outscore the opponent 6-4 on a total of 10
  const homeShare = homeProb / (homeProb + awayProb);
  const awayShare = awayProb / (homeProb + awayProb);
  const homeExpected = totalExpected * homeShare + homeAdv;
  const awayExpected = totalExpected * awayShare;
  return { homeExpected, awayExpected };
}

// Test multiple homeAdvantage and confidence floor combos
const CONFIGS = [
  { label: 'F: homeAdv=1.0, floor=57 (FINAL - no cap)', homeAdv: 1.0, floor: 57, baseballCap: false },
  { label: 'H: homeAdv=1.0, floor=57, +10% baseball cap (PRODUCTION)', homeAdv: 1.0, floor: 57, baseballCap: true },
];

console.log('╔══════════════════════════════════════════════════════════════════════════╗');
console.log('║   CBB (College Baseball) MC Simulation — 1000 iters x 16 games         ║');
console.log('║   Testing multiple configs. HOME_ONLY_MODE=true, AWAY_PENALTY=5        ║');
console.log('║   Odds-derived expected runs (not flat). Poisson distribution.          ║');
console.log('╚══════════════════════════════════════════════════════════════════════════╝');
console.log('');

for (const cfg of CONFIGS) {
  let totalPicks = 0, awayFiltered = 0, confFiltered = 0;
  let correctPicks = 0, wrongPicks = 0, awayLeaked = 0;
  let scoreErrors = [];
  const details = [];

  for (const g of games) {
    const homeProb = oddsToProb(g.homeOdds);
    const awayProb = oddsToProb(g.awayOdds);
    const homeFav = homeProb > awayProb;
    const favorite = homeFav ? g.home : g.away;
    const isHomePick = favorite === g.home;

    // Derive expected runs from odds
    const totalExpected = 10;
    const { homeExpected, awayExpected } = deriveExpectedRuns(homeProb, awayProb, totalExpected, cfg.homeAdv);

    // Run MC with cfg.homeAdv
    const params = { ...CBB_PARAMS, homeAdvantage: cfg.homeAdv };
    const mc = runMC(homeExpected, awayExpected, params, ITERATIONS);

    // Confidence
    const mcConf = Math.round(Math.max(mc.homeWinProb, 1 - mc.homeWinProb) * 100);
    let confidence = mcConf;
    if (isHomePick) confidence += HOME_BIAS_BOOST;
    else confidence -= AWAY_BIAS_PENALTY;

    // Baseball market ceiling: +10% instead of +20%
    const favoriteMarketPct = Math.round(Math.max(homeProb, awayProb) * 100);
    if (cfg.baseballCap) {
      const marketCeiling = favoriteMarketPct + 10;
      confidence = Math.min(confidence, marketCeiling);
    }
    confidence = Math.max(30, Math.min(95, confidence));

    const blockedByHomeOnly = HOME_ONLY_MODE && !isHomePick;
    const blockedByFloor = confidence < cfg.floor;
    const passed = !blockedByHomeOnly && !blockedByFloor;

    if (blockedByHomeOnly) awayFiltered++;
    if (blockedByFloor && !blockedByHomeOnly) confFiltered++;
    if (!isHomePick && passed) awayLeaked++;

    if (passed) {
      totalPicks++;
      const pickCorrect = favorite === g.actualWinner;
      if (pickCorrect) correctPicks++; else wrongPicks++;
      const err = Math.abs(g.actualHome - mc.avgHomeScore) + Math.abs(g.actualAway - mc.avgAwayScore);
      scoreErrors.push(err);
      details.push({
        matchup: `${g.away} @ ${g.home}`,
        pred: `${mc.avgHomeScore}-${mc.avgAwayScore}`,
        actual: `${g.actualHome}-${g.actualAway}`,
        conf: confidence,
        result: pickCorrect ? '✅' : '❌',
        err: err.toFixed(1),
        homeWinP: mc.homeWinProb.toFixed(3),
      });
    }
  }

  const wr = totalPicks > 0 ? ((correctPicks / totalPicks) * 100).toFixed(1) : '0.0';
  const avgErr = scoreErrors.length > 0 ? (scoreErrors.reduce((a, b) => a + b, 0) / scoreErrors.length).toFixed(1) : 'N/A';

  console.log(`━━━ ${cfg.label} ━━━`);
  console.log(`  Passed: ${totalPicks}/${games.length} | Away filtered: ${awayFiltered} | Conf filtered: ${confFiltered}`);
  console.log(`  Record: ${correctPicks}W-${wrongPicks}L (${wr}%) | Avg error: ${avgErr} pts | Away leaked: ${awayLeaked}`);
  for (const d of details) {
    console.log(`    ${d.result} ${d.matchup} | Pred: ${d.pred} | Actual: ${d.actual} | Conf: ${d.conf}% | P(home): ${d.homeWinP} | Err: ${d.err}`);
  }
  console.log('');
}
