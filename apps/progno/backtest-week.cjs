/**
 * backtest-week.cjs
 * Backtests past week's predictions against real results via ESPN API (no key needed).
 * Usage: node backtest-week.cjs
 */

const fs   = require('fs');
const path = require('path');
const https = require('https');

const PROGNO_DIR = path.join(__dirname);

// ESPN sport keys
const ESPN_SPORT_MAP = {
  NBA:   { sport: 'basketball', league: 'nba' },
  NFL:   { sport: 'football',   league: 'nfl' },
  NHL:   { sport: 'hockey',     league: 'nhl' },
  MLB:   { sport: 'baseball',   league: 'mlb' },
  NCAAB: { sport: 'basketball', league: 'mens-college-basketball' },
  NCAAF: { sport: 'football',   league: 'college-football' },
  NCAA:  { sport: 'basketball', league: 'mens-college-basketball' },
};

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, res => {
      let data = '';
      res.on('data', d => { data += d; });
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error(`JSON parse error for ${url}: ${e.message}`)); }
      });
    });
    req.on('error', reject);
    req.setTimeout(10000, () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

function normalizeTeam(name) {
  return (name || '').toLowerCase()
    .replace(/\s+(st|state|university|college|univ|tigers|bears|eagles|hawks|wolves|cats|dogs|bulls|nets|heat|jazz|suns|kings|spurs|bucks|sixers|knicks|celtics|lakers|clippers|nuggets|rockets|pistons|pacers|hawks|wizards|magic|raptors|hornets|pelicans|grizzlies|thunder|blazers|warriors|mavericks|cavaliers|timberwolves|hawks)\b/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

function teamsMatch(a, b) {
  const na = normalizeTeam(a);
  const nb = normalizeTeam(b);
  if (na === nb) return true;
  if (na.length >= 4 && nb.includes(na)) return true;
  if (nb.length >= 4 && na.includes(nb)) return true;
  // City name match (first word)
  const cityA = na.substring(0, Math.min(6, na.length));
  const cityB = nb.substring(0, Math.min(6, nb.length));
  if (cityA.length >= 4 && cityA === cityB) return true;
  return false;
}

// Fetch ESPN scoreboard for a given date and sport
async function fetchESPNScores(sportKey, leagueKey, dateStr) {
  const espnDate = dateStr.replace(/-/g, ''); // YYYYMMDD
  const url = `https://site.api.espn.com/apis/site/v2/sports/${sportKey}/${leagueKey}/scoreboard?dates=${espnDate}&limit=100`;
  try {
    const data = await fetchJson(url);
    const games = [];
    for (const event of data.events || []) {
      const comp = event.competitions?.[0];
      if (!comp) continue;
      const status = comp.status?.type?.completed;
      if (!status) continue;

      const home = comp.competitors?.find(c => c.homeAway === 'home');
      const away = comp.competitors?.find(c => c.homeAway === 'away');
      if (!home || !away) continue;

      const homeScore = parseInt(home.score || '0', 10);
      const awayScore = parseInt(away.score || '0', 10);
      const homeName = home.team?.displayName || home.team?.name || '';
      const awayName = away.team?.displayName || away.team?.name || '';

      games.push({
        homeTeam: homeName,
        awayTeam: awayName,
        homeScore,
        awayScore,
        winner: homeScore > awayScore ? homeName : awayName,
        completed: true,
      });
    }
    return games;
  } catch (e) {
    return [];
  }
}

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
      result.push({ file: f, date: dateStr, picks, engine: detectEngine(picks) });
    } catch { continue; }
  }
  return result;
}

function detectEngine(picks) {
  if (!picks.length) return 'unknown';
  const p = picks[0];
  // New engine: has triple_align, mc_win_probability, value_bet_edge
  if (p.triple_align !== undefined && p.mc_win_probability !== undefined) return 'new';
  // Old engine: has claudeEffect object, confidence as decimal
  if (p.claudeEffect || p.confidence < 1) return 'old';
  return 'new';
}

async function main() {
  console.log('\n' + '═'.repeat(110));
  console.log('  PROGNO WEEKLY BACKTEST — ESPN RESULTS');
  console.log(`  Generated: ${new Date().toLocaleString()}`);
  console.log('═'.repeat(110));

  const allFiles = loadPredictionsFiles();
  if (allFiles.length === 0) {
    console.log('\nNo predictions files found in last 14 days.');
    return;
  }

  // Get unique dates and leagues needed
  const dateLeaguePairs = new Set();
  for (const { date, picks } of allFiles) {
    for (const pick of picks) {
      const league = (pick.sport || pick.league || '').toUpperCase();
      dateLeaguePairs.add(`${date}|${league}`);
      // Also check day after (game_time may be next day UTC)
      const d = new Date(date);
      d.setDate(d.getDate() + 1);
      const nextDay = d.toISOString().split('T')[0];
      dateLeaguePairs.add(`${nextDay}|${league}`);
    }
  }

  // Fetch ESPN scores for all needed date/league combos
  console.log(`\nFetching ESPN scores for ${dateLeaguePairs.size} date/league combinations...\n`);
  const scoreCache = {}; // key: "date|league" -> games[]

  for (const pair of dateLeaguePairs) {
    const [date, league] = pair.split('|');
    const espnMap = ESPN_SPORT_MAP[league];
    if (!espnMap) continue;
    process.stdout.write(`  ${league} ${date}... `);
    const games = await fetchESPNScores(espnMap.sport, espnMap.league, date);
    scoreCache[pair] = games;
    console.log(`${games.length} completed games`);
    await new Promise(r => setTimeout(r, 300)); // rate limit
  }

  // Compare picks vs results
  const summary = { total: 0, completed: 0, correct: 0, incorrect: 0, pending: 0 };
  const byEngine = {
    new: { total: 0, completed: 0, correct: 0, incorrect: 0 },
    old: { total: 0, completed: 0, correct: 0, incorrect: 0 },
  };
  const rows = [];

  for (const { file, date, picks, engine } of allFiles) {
    for (const pick of picks) {
      const league = (pick.sport || pick.league || '').toUpperCase();
      const pickTeam = pick.pick || pick.winner || '';
      const conf = pick.confidence > 1 ? pick.confidence : Math.round((pick.confidence || 0) * 100);
      const edge = pick.value_bet_edge || pick.edge || 0;

      // Try same date and next day
      let result = null;
      for (const tryDate of [date, (() => { const d = new Date(date); d.setDate(d.getDate()+1); return d.toISOString().split('T')[0]; })()] ) {
        const key = `${tryDate}|${league}`;
        const games = scoreCache[key] || [];
        for (const g of games) {
          if ((teamsMatch(g.homeTeam, pick.home_team) && teamsMatch(g.awayTeam, pick.away_team)) ||
              (teamsMatch(g.homeTeam, pick.away_team) && teamsMatch(g.awayTeam, pick.home_team))) {
            result = g;
            break;
          }
        }
        if (result) break;
      }

      summary.total++;
      byEngine[engine] = byEngine[engine] || { total: 0, completed: 0, correct: 0, incorrect: 0 };
      byEngine[engine].total++;

      let status, correct, actualWinner = '—', scoreStr = '—';

      if (!result) {
        status = 'NOT FOUND';
        summary.pending++;
      } else {
        actualWinner = result.winner;
        scoreStr = `${result.homeScore}-${result.awayScore}`;
        correct = teamsMatch(pickTeam, result.winner);
        status = correct ? '✅ WIN' : '❌ LOSS';
        if (correct) { summary.correct++; byEngine[engine].correct++; }
        else { summary.incorrect++; byEngine[engine].incorrect++; }
        summary.completed++;
        byEngine[engine].completed++;
      }

      rows.push({
        date, league, engine,
        matchup: `${pick.away_team || ''} @ ${pick.home_team || ''}`,
        pick: pickTeam,
        type: pick.pick_type || 'ML',
        conf: `${conf}%`,
        edge: edge ? `${Number(edge).toFixed(1)}%` : '—',
        actual: actualWinner,
        score: scoreStr,
        status,
      });
    }
  }

  // Print table
  const col = (s, w) => String(s || '').substring(0, w).padEnd(w);
  console.log('\n' + '─'.repeat(110));
  console.log(
    col('DATE', 12) + col('LG', 7) + col('ENG', 5) + col('MATCHUP', 36) +
    col('PICK', 22) + col('TYPE', 8) + col('CONF', 6) + col('EDGE', 7) +
    col('ACTUAL', 22) + col('SCORE', 10) + 'RESULT'
  );
  console.log('─'.repeat(110));

  let lastDate = '';
  for (const r of rows) {
    if (r.date !== lastDate) {
      if (lastDate) console.log('');
      lastDate = r.date;
    }
    console.log(
      col(r.date, 12) + col(r.league, 7) + col(r.engine, 5) + col(r.matchup, 36) +
      col(r.pick, 22) + col(r.type, 8) + col(r.conf, 6) + col(r.edge, 7) +
      col(r.actual, 22) + col(r.score, 10) + r.status
    );
  }

  // Summary
  const winRate = summary.completed > 0
    ? ((summary.correct / summary.completed) * 100).toFixed(1)
    : 'N/A';

  console.log('\n' + '═'.repeat(110));
  console.log('  OVERALL SUMMARY');
  console.log('═'.repeat(110));
  console.log(`  Total picks:    ${summary.total}`);
  console.log(`  Completed:      ${summary.completed}`);
  console.log(`  ✅ Correct:     ${summary.correct}`);
  console.log(`  ❌ Incorrect:   ${summary.incorrect}`);
  console.log(`  ⏳ Not Found:   ${summary.pending}`);
  console.log(`  Win Rate:       ${winRate}%`);
  if (summary.completed > 0) {
    const roi = ((summary.correct / summary.completed - 0.524) * 100).toFixed(1);
    console.log(`  Est. ROI:       ${roi}% (vs -110 breakeven of 52.4%)`);
  }

  // Engine comparison
  console.log('\n' + '═'.repeat(110));
  console.log('  ENGINE COMPARISON (old = pre-Feb-13 format, new = current Cevict Flex)');
  console.log('═'.repeat(110));
  for (const [eng, stats] of Object.entries(byEngine)) {
    if (stats.total === 0) continue;
    const wr = stats.completed > 0 ? ((stats.correct / stats.completed) * 100).toFixed(1) : 'N/A';
    const roi = stats.completed > 0 ? ((stats.correct / stats.completed - 0.524) * 100).toFixed(1) : 'N/A';
    console.log(`  ${eng.toUpperCase().padEnd(6)} | Total: ${String(stats.total).padEnd(4)} | Completed: ${String(stats.completed).padEnd(4)} | W: ${String(stats.correct).padEnd(3)} L: ${String(stats.incorrect).padEnd(3)} | Win Rate: ${String(wr).padEnd(6)}% | Est. ROI: ${roi}%`);
  }
  console.log('═'.repeat(110));

  // Save report
  const reportDate = new Date().toISOString().split('T')[0];
  const reportPath = path.join(PROGNO_DIR, `backtest-report-${reportDate}.txt`);
  const lines = [
    '═'.repeat(110),
    '  PROGNO WEEKLY BACKTEST — ESPN RESULTS',
    `  Generated: ${new Date().toLocaleString()}`,
    '═'.repeat(110),
    '',
    col('DATE', 12) + col('LG', 7) + col('ENG', 5) + col('MATCHUP', 36) +
      col('PICK', 22) + col('TYPE', 8) + col('CONF', 6) + col('EDGE', 7) +
      col('ACTUAL', 22) + col('SCORE', 10) + 'RESULT',
    '─'.repeat(110),
    ...rows.map(r =>
      col(r.date, 12) + col(r.league, 7) + col(r.engine, 5) + col(r.matchup, 36) +
      col(r.pick, 22) + col(r.type, 8) + col(r.conf, 6) + col(r.edge, 7) +
      col(r.actual, 22) + col(r.score, 10) + r.status
    ),
    '',
    '═'.repeat(110),
    '  OVERALL SUMMARY',
    '═'.repeat(110),
    `  Total picks:    ${summary.total}`,
    `  Completed:      ${summary.completed}`,
    `  Correct:        ${summary.correct}`,
    `  Incorrect:      ${summary.incorrect}`,
    `  Not Found:      ${summary.pending}`,
    `  Win Rate:       ${winRate}%`,
    summary.completed > 0 ? `  Est. ROI:       ${((summary.correct / summary.completed - 0.524) * 100).toFixed(1)}%` : '',
    '',
    '═'.repeat(110),
    '  ENGINE COMPARISON',
    '═'.repeat(110),
    ...Object.entries(byEngine).filter(([,s]) => s.total > 0).map(([eng, stats]) => {
      const wr = stats.completed > 0 ? ((stats.correct / stats.completed) * 100).toFixed(1) : 'N/A';
      const roi = stats.completed > 0 ? ((stats.correct / stats.completed - 0.524) * 100).toFixed(1) : 'N/A';
      return `  ${eng.toUpperCase().padEnd(6)} | Total: ${String(stats.total).padEnd(4)} | Completed: ${String(stats.completed).padEnd(4)} | W: ${String(stats.correct).padEnd(3)} L: ${String(stats.incorrect).padEnd(3)} | Win Rate: ${String(wr).padEnd(6)}% | Est. ROI: ${roi}%`;
    }),
    '═'.repeat(110),
  ];
  fs.writeFileSync(reportPath, lines.join('\n'), 'utf8');
  console.log(`\nReport saved: ${reportPath}\n`);
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
