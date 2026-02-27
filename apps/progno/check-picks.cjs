const fs = require('fs');
const path = require('path');

// Load Feb 25 predictions from local file
const predFile = path.join(__dirname, 'predictions-2026-02-25.json');
if (!fs.existsSync(predFile)) {
  console.log('No predictions file for 2026-02-25');
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(predFile, 'utf8'));
const picks = data.picks;

console.log('================================================================');
console.log('  PROGNO PREDICTIONS vs ACTUAL RESULTS  -  February 25, 2026');
console.log('================================================================');
console.log('Generated:', data.generatedAt);
console.log('Total picks:', data.count);
console.log('');

// Fetch actual scores from The Odds API (scores endpoint)
const ODDS_KEY = 'dea4f9f87fe7a2e3642523ee51d398d9';

async function fetchScores(sport) {
  const url = 'https://api.the-odds-api.com/v4/sports/' + sport +
    '/scores/?apiKey=' + ODDS_KEY + '&daysFrom=3&dateFormat=iso';
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const json = await res.json();
    return json;
  } catch (e) {
    return [];
  }
}

function normalize(name) {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function matchGame(scores, home, away) {
  const hN = normalize(home);
  const aN = normalize(away);
  for (const g of scores) {
    if (!g.scores || !g.completed) continue;
    const gHome = normalize(g.home_team);
    const gAway = normalize(g.away_team);
    if ((gHome.includes(hN) || hN.includes(gHome)) &&
      (gAway.includes(aN) || aN.includes(gAway))) {
      return g;
    }
    // Try reversed
    if ((gHome.includes(aN) || aN.includes(gHome)) &&
      (gAway.includes(hN) || hN.includes(gAway))) {
      return g;
    }
  }
  return null;
}

async function run() {
  // Fetch scores for all relevant sports
  const sportMap = {
    'NBA': 'basketball_nba',
    'NHL': 'icehockey_nhl',
    'NCAAB': 'basketball_ncaab',
    'NFL': 'americanfootball_nfl',
    'MLB': 'baseball_mlb',
    'CBB': 'baseball_ncaa',
  };

  const allScores = {};
  const sportsNeeded = [...new Set(picks.map(p => p.league || p.sport))];

  for (const league of sportsNeeded) {
    const apiSport = sportMap[league];
    if (!apiSport) continue;
    console.log('Fetching ' + league + ' scores...');
    allScores[league] = await fetchScores(apiSport);
  }
  console.log('');

  let wins = 0, losses = 0, pending = 0, pushes = 0;

  for (let i = 0; i < picks.length; i++) {
    const p = picks[i];
    const league = p.league || p.sport;
    const scores = allScores[league] || [];
    const game = matchGame(scores, p.home_team, p.away_team);

    const predScore = p.mc_predicted_score;
    const predStr = predScore ? (predScore.home + '-' + predScore.away) : '?';
    const winPct = p.mc_win_probability ? (p.mc_win_probability * 100).toFixed(1) : '?';
    const oddsStr = p.odds > 0 ? ('+' + p.odds) : String(p.odds);

    console.log('[' + (i + 1) + '] ' + p.away_team + ' @ ' + p.home_team + ' (' + league + ')');
    console.log('    PICK: ' + p.pick + ' | Conf: ' + p.confidence + '% | Odds: ' + oddsStr + ' | MC Win: ' + winPct + '%');
    console.log('    Predicted Score: ' + predStr);

    if (game) {
      const homeScore = game.scores.find(s => normalize(s.name).includes(normalize(p.home_team)) || normalize(p.home_team).includes(normalize(s.name)));
      const awayScore = game.scores.find(s => normalize(s.name).includes(normalize(p.away_team)) || normalize(p.away_team).includes(normalize(s.name)));

      const hPts = homeScore ? parseInt(homeScore.score) : null;
      const aPts = awayScore ? parseInt(awayScore.score) : null;

      if (hPts !== null && aPts !== null) {
        const actualWinner = hPts > aPts ? p.home_team : (aPts > hPts ? p.away_team : 'TIE');
        const correct = normalize(p.pick) === normalize(actualWinner);
        const icon = correct ? 'WIN' : 'LOSS';

        if (correct) wins++; else losses++;

        console.log('    ACTUAL: ' + p.home_team + ' ' + hPts + ' - ' + aPts + ' ' + p.away_team);
        console.log('    RESULT: ** ' + icon + ' ** ' + (correct ? '(Correct!)' : '(Wrong)'));
      } else {
        console.log('    ACTUAL: Score parse issue');
        pending++;
      }
    } else {
      console.log('    ACTUAL: Game not found or not completed yet');
      pending++;
    }
    console.log('');
  }

  console.log('================================================================');
  console.log('  SUMMARY');
  console.log('================================================================');
  console.log('  Correct:   ' + wins);
  console.log('  Wrong:     ' + losses);
  console.log('  Pending:   ' + pending);
  const total = wins + losses;
  if (total > 0) {
    console.log('  Win Rate:  ' + (wins / total * 100).toFixed(1) + '% (' + wins + '/' + total + ')');
  }
  console.log('================================================================');
}

run().catch(console.error);
