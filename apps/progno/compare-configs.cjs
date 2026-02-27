const fs = require('fs');
const path = require('path');

// ================================================================
// COMPARE: OLD Alpha Hunter config vs NEW config on Feb 25 data
// ================================================================

const predFile = path.join(__dirname, 'predictions-2026-02-25.json');
if (!fs.existsSync(predFile)) { console.log('No predictions file'); process.exit(1); }
const data = JSON.parse(fs.readFileSync(predFile, 'utf8'));
const picks = data.picks;

// ── OLD CONFIG (before today's fixes) ──
const OLD = {
  label: 'OLD (before fixes)',
  MAX_SINGLE_TRADE: 2,
  autoExecuteEnv: true,         // AUTO_EXECUTE=true was already set
  maxBetSize: 5,                // kalshi-auto-trader CONFIG.maxBetSize was 5
  maxOpenBets: 5,               // was 5
  minEdge: 3,
  minConfidence: 55,
  maxDailyTrades: 5,            // CRYPTO_MAX_DAILY_TRADES was 5
  maxDailySpend: 150,           // MAX_DAILY_LOSS=150
  oppAmount: 5,                 // hardcoded amount in opportunity objects was $5
  oppAutoExecute: true,         // Progno/Kalshi opps had autoExecute:true
};

// ── NEW CONFIG (after today's fixes) ──
const NEW = {
  label: 'NEW (after fixes)',
  MAX_SINGLE_TRADE: 10,
  autoExecuteEnv: true,
  maxBetSize: 10,
  maxOpenBets: 8,
  minEdge: 3,
  minConfidence: 55,
  maxDailyTrades: 10,
  maxDailySpend: 150,
  oppAmount: 10,
  oppAutoExecute: true,
};

const ODDS_KEY = 'dea4f9f87fe7a2e3642523ee51d398d9';

async function fetchScores(sport) {
  const url = 'https://api.the-odds-api.com/v4/sports/' + sport +
    '/scores/?apiKey=' + ODDS_KEY + '&daysFrom=3&dateFormat=iso';
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    return await res.json();
  } catch (e) { return []; }
}

function normalize(name) { return name.toLowerCase().replace(/[^a-z0-9]/g, ''); }

function matchGame(scores, home, away) {
  const hN = normalize(home), aN = normalize(away);
  for (const g of scores) {
    if (!g.scores || !g.completed) continue;
    const gH = normalize(g.home_team), gA = normalize(g.away_team);
    if ((gH.includes(hN) || hN.includes(gH)) && (gA.includes(aN) || aN.includes(gA))) return g;
    if ((gH.includes(aN) || aN.includes(gH)) && (gA.includes(hN) || hN.includes(gA))) return g;
  }
  return null;
}

function getScore(game, teamName) {
  if (!game || !game.scores) return null;
  const s = game.scores.find(function(s) {
    return normalize(s.name).includes(normalize(teamName)) || normalize(teamName).includes(normalize(s.name));
  });
  return s ? parseInt(s.score) : null;
}

// Simulate how Alpha Hunter decides whether to execute a trade
function simulateTrade(pick, config, tradesSoFar, spentSoFar) {
  var result = { wouldRecommend: false, wouldExecute: false, stake: 0, reason: '' };

  // Confidence gate
  if (pick.confidence < config.minConfidence) {
    result.reason = 'Below min confidence (' + pick.confidence + '% < ' + config.minConfidence + '%)';
    return result;
  }

  // Edge gate
  var edge = pick.value_bet_edge || 0;
  if (edge < config.minEdge) {
    result.reason = 'Below min edge (' + edge.toFixed(1) + '% < ' + config.minEdge + '%)';
    return result;
  }

  result.wouldRecommend = true;

  // Daily trade limit
  if (tradesSoFar >= config.maxDailyTrades) {
    result.reason = 'Daily trade limit reached (' + tradesSoFar + '/' + config.maxDailyTrades + ')';
    return result;
  }

  // Effective stake: min of oppAmount and MAX_SINGLE_TRADE (index.ts caps it)
  var stake = Math.min(config.oppAmount, config.MAX_SINGLE_TRADE);

  // Daily spend limit
  if (spentSoFar + stake > config.maxDailySpend) {
    result.reason = 'Daily spend limit exceeded';
    return result;
  }

  // Max open bets
  if (tradesSoFar >= config.maxOpenBets) {
    result.reason = 'Max open bets reached (' + tradesSoFar + '/' + config.maxOpenBets + ')';
    return result;
  }

  // autoExecute gate
  if (!config.oppAutoExecute || !config.autoExecuteEnv) {
    result.reason = 'Auto-execute disabled';
    return result;
  }

  result.wouldExecute = true;
  result.stake = stake;
  return result;
}

// Calculate profit/loss from American odds
function calcPayout(stake, odds, won) {
  if (!won) return -stake;
  if (odds > 0) return stake * (odds / 100);
  if (odds < 0) return stake * (100 / Math.abs(odds));
  return 0;
}

async function run() {
  var sportMap = {
    'NBA': 'basketball_nba', 'NHL': 'icehockey_nhl',
    'NCAAB': 'basketball_ncaab', 'NFL': 'americanfootball_nfl',
    'MLB': 'baseball_mlb', 'CBB': 'baseball_ncaa', 'NCAA': 'baseball_ncaa',
  };

  var allScores = {};
  var sportsNeeded = [];
  picks.forEach(function(p) {
    var l = p.league || p.sport;
    if (sportsNeeded.indexOf(l) === -1) sportsNeeded.push(l);
  });

  for (var li = 0; li < sportsNeeded.length; li++) {
    var league = sportsNeeded[li];
    var apiSport = sportMap[league];
    if (!apiSport) continue;
    process.stdout.write('Fetching ' + league + ' scores... ');
    allScores[league] = await fetchScores(apiSport);
    console.log(allScores[league].length + ' games');
  }

  // Resolve actual results for all picks
  var results = picks.map(function(p) {
    var league = p.league || p.sport;
    var game = matchGame(allScores[league] || [], p.home_team, p.away_team);
    var hPts = getScore(game, p.home_team);
    var aPts = getScore(game, p.away_team);
    var outcome = 'pending';
    if (hPts !== null && aPts !== null) {
      var winner = hPts > aPts ? p.home_team : (aPts > hPts ? p.away_team : 'TIE');
      outcome = normalize(p.pick) === normalize(winner) ? 'win' : 'loss';
    }
    return Object.assign({}, p, { hPts: hPts, aPts: aPts, outcome: outcome });
  });

  // Print actual results first
  console.log('\n' + '='.repeat(72));
  console.log('  FEB 25 PREDICTIONS + ACTUAL RESULTS');
  console.log('='.repeat(72));
  results.forEach(function(r, i) {
    var oddsStr = r.odds > 0 ? ('+' + r.odds) : String(r.odds);
    var icon = r.outcome === 'win' ? 'WIN ' : (r.outcome === 'loss' ? 'LOSS' : '??? ');
    var actual = r.hPts !== null ? (r.home_team + ' ' + r.hPts + ' - ' + r.aPts + ' ' + r.away_team) : 'Not completed';
    console.log('  [' + (i+1) + '] ' + r.away_team + ' @ ' + r.home_team + ' (' + (r.league || r.sport) + ')');
    console.log('      Pick: ' + r.pick + ' | Conf: ' + r.confidence + '% | Odds: ' + oddsStr);
    console.log('      Actual: ' + actual + '  =>  ' + icon);
  });

  // ── Run simulation for both configs ──
  var configs = [OLD, NEW];
  var summaries = [];

  for (var ci = 0; ci < configs.length; ci++) {
    var config = configs[ci];
    var trades = 0, spent = 0, totalPL = 0;
    var executed = [], recommended = [];

    console.log('\n' + '='.repeat(72));
    console.log('  CONFIG: ' + config.label);
    console.log('  MAX_SINGLE_TRADE=$' + config.MAX_SINGLE_TRADE +
      ' | maxBetSize=$' + config.maxBetSize +
      ' | maxDailyTrades=' + config.maxDailyTrades +
      ' | maxOpenBets=' + config.maxOpenBets);
    console.log('  Effective stake per trade: $' + Math.min(config.oppAmount, config.MAX_SINGLE_TRADE));
    console.log('='.repeat(72));

    for (var ri = 0; ri < results.length; ri++) {
      var r = results[ri];
      var sim = simulateTrade(r, config, trades, spent);
      var oddsStr = r.odds > 0 ? ('+' + r.odds) : String(r.odds);
      var outcomeIcon = r.outcome === 'win' ? 'W' : (r.outcome === 'loss' ? 'L' : '?');

      if (sim.wouldExecute) {
        var pl = r.outcome !== 'pending' ? calcPayout(sim.stake, r.odds, r.outcome === 'win') : 0;
        totalPL += pl;
        trades++;
        spent += sim.stake;
        executed.push(r);
        var plStr = r.outcome !== 'pending' ? ('  P/L: ' + (pl >= 0 ? '+' : '') + '$' + pl.toFixed(2)) : '';
        console.log('  EXEC  $' + String(sim.stake).padStart(2) + '  [' + outcomeIcon + ']  ' +
          r.pick.substring(0, 28).padEnd(28) + ' ' + oddsStr.padStart(5) + '  conf:' + r.confidence + '%' + plStr);
      } else if (sim.wouldRecommend) {
        recommended.push(r);
        console.log('  SKIP  --  [' + outcomeIcon + ']  ' +
          r.pick.substring(0, 28).padEnd(28) + ' ' + oddsStr.padStart(5) + '  conf:' + r.confidence + '%  >> ' + sim.reason);
      }
    }

    var exWins = executed.filter(function(r) { return r.outcome === 'win'; }).length;
    var exLosses = executed.filter(function(r) { return r.outcome === 'loss'; }).length;
    var exPending = executed.filter(function(r) { return r.outcome === 'pending'; }).length;

    console.log('  ' + '-'.repeat(70));
    console.log('  Executed: ' + executed.length + ' trades ($' + spent.toFixed(2) + ' wagered)');
    console.log('  Results:  ' + exWins + 'W / ' + exLosses + 'L / ' + exPending + ' pending');
    console.log('  Net P/L:  ' + (totalPL >= 0 ? '+' : '') + '$' + totalPL.toFixed(2));
    if (exWins + exLosses > 0) {
      console.log('  Win Rate: ' + ((exWins / (exWins + exLosses)) * 100).toFixed(1) + '%');
      console.log('  ROI:      ' + ((totalPL / spent) * 100).toFixed(1) + '%');
    }
    console.log('  Recommended but blocked:  ' + recommended.length);

    summaries.push({ label: config.label, trades: trades, spent: spent, pl: totalPL, wins: exWins, losses: exLosses, pending: exPending });
  }

  // ── Side-by-side summary ──
  var o = summaries[0], n = summaries[1];
  console.log('\n' + '='.repeat(72));
  console.log('  SIDE-BY-SIDE COMPARISON');
  console.log('='.repeat(72));
  console.log('                             OLD ($2/trade)    NEW ($10/trade)');
  console.log('  -------------------------------------------------------');
  console.log('  Stake per trade:           $2                $10');
  console.log('  Max daily trades:          5                 10');
  console.log('  Max open bets:             5                 8');
  console.log('  Trades executed:           ' + String(o.trades).padEnd(18) + n.trades);
  console.log('  Total wagered:             $' + o.spent.toFixed(2).padEnd(17) + '$' + n.spent.toFixed(2));
  console.log('  Record:                    ' + (o.wins + 'W-' + o.losses + 'L').padEnd(18) + n.wins + 'W-' + n.losses + 'L');
  console.log('  Net P/L:                   ' + ((o.pl >= 0 ? '+$' : '-$') + Math.abs(o.pl).toFixed(2)).padEnd(18) +
    (n.pl >= 0 ? '+$' : '-$') + Math.abs(n.pl).toFixed(2));
  if (o.spent > 0 && n.spent > 0) {
    console.log('  ROI:                       ' + ((o.pl / o.spent * 100).toFixed(1) + '%').padEnd(18) + (n.pl / n.spent * 100).toFixed(1) + '%');
  }
  console.log('  -------------------------------------------------------');
  var diff = n.pl - o.pl;
  console.log('  DELTA:                     ' + (diff >= 0 ? '+$' : '-$') + Math.abs(diff).toFixed(2) +
    (diff >= 0 ? ' MORE profit' : ' LESS profit') + ' with new config');
  console.log('='.repeat(72));
}

run().catch(console.error);
