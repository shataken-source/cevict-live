/**
 * compare-results.cjs
 * Compares progno picks against real game results using The Odds API scores endpoint.
 * Usage: node compare-results.cjs [YYYY-MM-DD]
 * Default: checks all predictions files from last 14 days that have completed games.
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// ── Config ────────────────────────────────────────────────────────────────────
const ODDS_API_KEY = 'dea4f9f87fe7a2e3642523ee51d398d9';
const PROGNO_DIR = path.join(__dirname);

const SPORT_KEYS = {
  NFL: 'americanfootball_nfl',
  NBA: 'basketball_nba',
  NHL: 'icehockey_nhl',
  MLB: 'baseball_mlb',
  NCAAB: 'basketball_ncaab',
  NCAAF: 'americanfootball_ncaaf',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      let data = '';
      res.on('data', d => { data += d; });
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error(`JSON parse error: ${e.message}\nBody: ${data.substring(0, 200)}`)); }
      });
    }).on('error', reject);
  });
}

async function fetchScores(sportKey, daysFrom) {
  const url = `https://api.the-odds-api.com/v4/sports/${sportKey}/scores/?apiKey=${ODDS_API_KEY}&daysFrom=${daysFrom}`;
  try {
    const data = await fetchJson(url);
    return Array.isArray(data) ? data : [];
  } catch (e) {
    console.error(`  [scores] ${sportKey}: ${e.message}`);
    return [];
  }
}

function normalizeTeam(name) {
  return (name || '').toLowerCase()
    .replace(/\s+(st|state|university|college|univ)\b/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

function teamsMatch(a, b) {
  const na = normalizeTeam(a);
  const nb = normalizeTeam(b);
  if (na === nb) return true;
  // partial match (one contains the other, min 4 chars)
  if (na.length >= 4 && nb.includes(na)) return true;
  if (nb.length >= 4 && na.includes(nb)) return true;
  return false;
}

function findResult(scores, homeTeam, awayTeam) {
  for (const g of scores) {
    const gh = g.home_team || '';
    const ga = g.away_team || '';
    if ((teamsMatch(gh, homeTeam) && teamsMatch(ga, awayTeam)) ||
      (teamsMatch(gh, awayTeam) && teamsMatch(ga, homeTeam))) {
      if (!g.completed) return { found: true, completed: false, game: g };
      const hs = g.scores?.find(s => s.name === g.home_team)?.score;
      const as_ = g.scores?.find(s => s.name === g.away_team)?.score;
      if (hs == null || as_ == null) return { found: true, completed: false, game: g };
      const homeScore = Number(hs);
      const awayScore = Number(as_);
      const winner = homeScore > awayScore ? g.home_team : g.away_team;
      return { found: true, completed: true, homeScore, awayScore, winner, game: g };
    }
  }
  return { found: false };
}

// ── Load predictions files ────────────────────────────────────────────────────

function loadPredictionsFiles() {
  const files = fs.readdirSync(PROGNO_DIR)
    .filter(f => f.match(/^predictions-\d{4}-\d{2}-\d{2}\.json$/) && !f.includes('early'))
    .sort().reverse();

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 14);

  const result = [];
  for (const f of files) {
    const dateStr = f.match(/predictions-(\d{4}-\d{2}-\d{2})\.json/)?.[1];
    if (!dateStr) continue;
    const fileDate = new Date(dateStr);
    if (fileDate < cutoff) continue;
    try {
      const raw = JSON.parse(fs.readFileSync(path.join(PROGNO_DIR, f), 'utf8'));
      const picks = raw.picks || [];
      if (picks.length === 0) continue;
      result.push({ file: f, date: dateStr, picks });
    } catch { continue; }
  }
  return result;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const specificDate = process.argv[2];
  console.log('\n' + '═'.repeat(100));
  console.log('  PROGNO PICKS vs REAL RESULTS');
  console.log(`  Generated: ${new Date().toLocaleString()}`);
  console.log('═'.repeat(100));

  // Load all prediction files
  let allFiles = loadPredictionsFiles();
  if (specificDate) {
    allFiles = allFiles.filter(f => f.date === specificDate);
  }

  if (allFiles.length === 0) {
    console.log('\nNo predictions files found in last 14 days.');
    return;
  }

  console.log(`\nFound ${allFiles.length} predictions file(s): ${allFiles.map(f => f.date).join(', ')}\n`);

  // Fetch scores for all relevant sports (daysFrom=3 covers recent games)
  console.log('Fetching real scores from The Odds API...');
  const scoreCache = {};
  for (const [league, sportKey] of Object.entries(SPORT_KEYS)) {
    process.stdout.write(`  ${league}... `);
    scoreCache[league] = await fetchScores(sportKey, 7);
    console.log(`${scoreCache[league].length} games`);
  }

  // ── Compare ───────────────────────────────────────────────────────────────
  const summary = { total: 0, completed: 0, correct: 0, incorrect: 0, pending: 0 };
  const rows = [];

  for (const { file, date, picks } of allFiles) {
    for (const pick of picks) {
      const league = (pick.sport || pick.league || '').toUpperCase();
      const scores = scoreCache[league] || [];
      const result = findResult(scores, pick.home_team, pick.away_team);

      summary.total++;

      let status, correct, actualWinner = '—', scoreStr = '—';

      if (!result.found) {
        status = 'NOT FOUND';
        summary.pending++;
      } else if (!result.completed) {
        status = 'PENDING';
        summary.pending++;
      } else {
        actualWinner = result.winner;
        scoreStr = `${result.homeScore}-${result.awayScore}`;
        correct = teamsMatch(pick.pick, result.winner);
        status = correct ? '✅ WIN' : '❌ LOSS';
        if (correct) summary.correct++; else summary.incorrect++;
        summary.completed++;
      }

      rows.push({
        date,
        league,
        matchup: `${pick.away_team} @ ${pick.home_team}`,
        pick: pick.pick,
        type: pick.pick_type || 'ML',
        conf: `${pick.confidence}%`,
        edge: pick.value_bet_edge ? `${pick.value_bet_edge.toFixed(1)}%` : '—',
        ev: pick.expected_value ? `$${pick.expected_value.toFixed(0)}` : '—',
        actual: actualWinner,
        score: scoreStr,
        status,
      });
    }
  }

  // ── Print table ───────────────────────────────────────────────────────────
  const col = (s, w) => String(s || '').substring(0, w).padEnd(w);

  console.log('\n' + '─'.repeat(100));
  console.log(
    col('DATE', 12) + col('LG', 7) + col('MATCHUP', 38) +
    col('PICK', 22) + col('TYPE', 8) + col('CONF', 6) + col('EDGE', 7) +
    col('ACTUAL', 22) + col('SCORE', 10) + 'RESULT'
  );
  console.log('─'.repeat(100));

  let lastDate = '';
  for (const r of rows) {
    if (r.date !== lastDate) {
      if (lastDate) console.log('');
      lastDate = r.date;
    }
    console.log(
      col(r.date, 12) + col(r.league, 7) + col(r.matchup, 38) +
      col(r.pick, 22) + col(r.type, 8) + col(r.conf, 6) + col(r.edge, 7) +
      col(r.actual, 22) + col(r.score, 10) + r.status
    );
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  const winRate = summary.completed > 0
    ? ((summary.correct / summary.completed) * 100).toFixed(1)
    : 'N/A';

  console.log('\n' + '═'.repeat(100));
  console.log('  SUMMARY');
  console.log('═'.repeat(100));
  console.log(`  Total picks:    ${summary.total}`);
  console.log(`  Completed:      ${summary.completed}`);
  console.log(`  ✅ Correct:     ${summary.correct}`);
  console.log(`  ❌ Incorrect:   ${summary.incorrect}`);
  console.log(`  ⏳ Pending:     ${summary.pending}`);
  console.log(`  Win Rate:       ${winRate}%`);
  if (summary.completed > 0) {
    const roi = ((summary.correct / summary.completed - 0.524) * 100).toFixed(1);
    console.log(`  Est. ROI:       ${roi}% (vs -110 breakeven of 52.4%)`);
  }
  console.log('═'.repeat(100) + '\n');

  // ── Save report ───────────────────────────────────────────────────────────
  const reportDate = new Date().toISOString().split('T')[0];
  const reportPath = path.join(PROGNO_DIR, `results-report-${reportDate}.txt`);
  const lines = [
    '═'.repeat(100),
    '  PROGNO PICKS vs REAL RESULTS',
    `  Generated: ${new Date().toLocaleString()}`,
    '═'.repeat(100),
    '',
    col('DATE', 12) + col('LG', 7) + col('MATCHUP', 38) +
    col('PICK', 22) + col('TYPE', 8) + col('CONF', 6) + col('EDGE', 7) +
    col('ACTUAL', 22) + col('SCORE', 10) + 'RESULT',
    '─'.repeat(100),
    ...rows.map(r =>
      col(r.date, 12) + col(r.league, 7) + col(r.matchup, 38) +
      col(r.pick, 22) + col(r.type, 8) + col(r.conf, 6) + col(r.edge, 7) +
      col(r.actual, 22) + col(r.score, 10) + r.status
    ),
    '',
    '═'.repeat(100),
    '  SUMMARY',
    '═'.repeat(100),
    `  Total picks:    ${summary.total}`,
    `  Completed:      ${summary.completed}`,
    `  Correct:        ${summary.correct}`,
    `  Incorrect:      ${summary.incorrect}`,
    `  Pending:        ${summary.pending}`,
    `  Win Rate:       ${winRate}%`,
    summary.completed > 0 ? `  Est. ROI:       ${((summary.correct / summary.completed - 0.524) * 100).toFixed(1)}%` : '',
    '═'.repeat(100),
  ];
  fs.writeFileSync(reportPath, lines.join('\n'), 'utf8');
  console.log(`Report saved: ${reportPath}`);
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
