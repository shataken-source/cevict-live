/**
 * Backtest Progno (or any) picks vs actual results from The Odds API scores.
 *
 * Input: JSON file of picks with home_team, away_team, pick, game_time (ISO), optional sport.
 * Output: Win rate and list of correct/incorrect.
 *
 * Env: ODDS_API_KEY (or NEXT_PUBLIC_ODDS_API_KEY), PICKS_JSON (path to picks file).
 * Run: npm run backtest-progno
 *
 * Picks file format (one of):
 *   { "picks": [ { "home_team", "away_team", "pick", "game_time", "sport?" } ] }
 *   [ { "home_team", "away_team", "pick", "game_time", "sport?" }, ... ]
 */

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
// Fallback: load Progno's key if alpha-hunter doesn't have ODDS_API_KEY
if (!process.env.ODDS_API_KEY && !process.env.NEXT_PUBLIC_ODDS_API_KEY) {
  const prognoEnv = path.join(process.cwd(), '..', 'progno', '.env.local');
  if (fs.existsSync(prognoEnv)) {
    const content = fs.readFileSync(prognoEnv, 'utf8');
    const m = content.match(/ODDS_API_KEY=(.+)/m);
    if (m) process.env.ODDS_API_KEY = m[1].trim().replace(/^["']|["']$/g, '');
  }
}

const ODDS_API_KEY = process.env.ODDS_API_KEY || process.env.NEXT_PUBLIC_ODDS_API_KEY;
const PICKS_JSON = process.env.PICKS_JSON || path.join(process.cwd(), 'progno-picks-for-backtest.json');

const SPORT_KEYS: Record<string, string> = {
  NFL: 'americanfootball_nfl',
  NBA: 'basketball_nba',
  NCAAB: 'basketball_ncaab',
  NCAAF: 'americanfootball_ncaaf',
  NHL: 'icehockey_nhl',
  MLB: 'baseball_mlb',
};

interface Pick {
  home_team: string;
  away_team: string;
  pick: string;
  game_time: string;
  sport?: string;
}

interface CompletedGame {
  id: string;
  home_team: string;
  away_team: string;
  commence_time: string;
  completed: boolean;
  scores: Array<{ name: string; score?: string; points?: string }>;
}

function normalize(s: string): string {
  return (s || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function teamsMatch(a: string, b: string, c: string, d: string): boolean {
  const n = (x: string) => normalize(x);
  return (n(a) === n(c) && n(b) === n(d)) || (n(a) === n(d) && n(b) === n(c));
}

async function fetchScores(sportKey: string, daysFrom: number): Promise<CompletedGame[]> {
  const url = `https://api.the-odds-api.com/v4/sports/${sportKey}/scores/?apiKey=${ODDS_API_KEY}&daysFrom=${daysFrom}&dateFormat=iso`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  if (!Array.isArray(data)) return [];
  return data.filter((g: CompletedGame) => g.completed && g.scores && g.scores.length >= 2);
}

function getWinner(game: CompletedGame): string | null {
  const home = game.scores.find((s) => normalize(s.name) === normalize(game.home_team));
  const away = game.scores.find((s) => normalize(s.name) === normalize(game.away_team));
  if (!home || !away) return null;
  const homeScore = Number(home.score ?? home.points ?? 0);
  const awayScore = Number(away.score ?? away.points ?? 0);
  if (homeScore === awayScore) return null;
  return homeScore > awayScore ? game.home_team : game.away_team;
}

async function main() {
  console.log('\n📊 Backtest Progno picks vs Odds API results\n');

  if (!ODDS_API_KEY) {
    console.error('❌ Set ODDS_API_KEY or NEXT_PUBLIC_ODDS_API_KEY (or ODDS_API_KEY in progno .env.local).');
    process.exit(1);
  }

  let picks: Pick[] = [];
  const picksPath = path.isAbsolute(PICKS_JSON) ? PICKS_JSON : path.join(process.cwd(), PICKS_JSON);

  if (fs.existsSync(picksPath)) {
    const raw = JSON.parse(fs.readFileSync(picksPath, 'utf8'));
    picks = Array.isArray(raw) ? raw : raw.picks || [];
    console.log(`   Loaded ${picks.length} picks from ${picksPath}\n`);
  } else {
    // Fallback: fetch today's picks from Progno
    const prognoBase = process.env.PROGNO_BASE_URL || 'http://localhost:3008';
    console.log(`   No picks file at ${picksPath}; fetching from Progno ${prognoBase}/api/picks/today ...`);
    try {
      const res = await fetch(`${prognoBase}/api/picks/today`, {
        headers: process.env.BOT_API_KEY ? { 'x-api-key': process.env.BOT_API_KEY } : {},
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { picks?: Array<{ home_team?: string; away_team?: string; pick?: string; game_time?: string; commence_time?: string; sport?: string }> };
      const rawPicks = data.picks || [];
      picks = rawPicks
        .filter((p: any) => p.home_team && p.away_team && (p.pick || p.home_team))
        .map((p: any) => ({
          home_team: p.home_team,
          away_team: p.away_team,
          pick: p.pick || p.home_team,
          game_time: p.game_time || p.commence_time || new Date().toISOString(),
          sport: p.sport || 'NCAAB',
        }));
      console.log(`   Fetched ${picks.length} picks from Progno.\n`);
    } catch (e) {
      console.error('❌ Picks file not found and could not fetch from Progno:', (e as Error).message);
      console.error('   Set PICKS_JSON to path of JSON with picks (home_team, away_team, pick, game_time[, sport]).');
      console.error('   Or start Progno (npm run dev in apps/progno) and run again.');
      process.exit(1);
    }
  }

  if (picks.length === 0) {
    console.error('❌ No picks to backtest.');
    process.exit(1);
  }

  const sports = [...new Set(picks.map((p) => p.sport || 'NCAAB').filter(Boolean))];
  const sportKeySet = new Set(sports.map((s) => SPORT_KEYS[s] || s));
  const gamesBySport: Record<string, CompletedGame[]> = {};

  for (const sportKey of sportKeySet) {
    if (!sportKey) continue;
    for (const days of [1, 2, 3]) {
      const list = await fetchScores(sportKey, days);
      if (list.length > 0) {
        gamesBySport[sportKey] = (gamesBySport[sportKey] || []).concat(list);
        await new Promise((r) => setTimeout(r, 500));
      }
    }
    if (gamesBySport[sportKey]) {
      const byId = new Map<string, CompletedGame>();
      for (const g of gamesBySport[sportKey]) byId.set(g.id, g);
      gamesBySport[sportKey] = [...byId.values()];
    }
  }

  let correctCount = 0;
  let incorrectCount = 0;
  let noResultCount = 0;
  const rows: { pick: Pick; actualWinner: string | null; correct: boolean | null }[] = [];

  for (const pick of picks) {
    const sportKey = SPORT_KEYS[pick.sport || 'NCAAB'] || 'basketball_ncaab';
    const games = gamesBySport[sportKey] || [];
    const gameTime = new Date(pick.game_time).getTime();
    const gameDateStr = new Date(pick.game_time).toISOString().split('T')[0];

    const match = games.find((g) => {
      if (!teamsMatch(pick.home_team, pick.away_team, g.home_team, g.away_team)) return false;
      const gDate = new Date(g.commence_time).toISOString().split('T')[0];
      return gDate === gameDateStr || Math.abs(new Date(g.commence_time).getTime() - gameTime) < 86400 * 1000 * 2;
    });

    if (!match) {
      noResultCount++;
      rows.push({ pick, actualWinner: null, correct: null });
      continue;
    }

    const actualWinner = getWinner(match);
    if (actualWinner === null) {
      noResultCount++;
      rows.push({ pick, actualWinner: null, correct: null });
      continue;
    }

    const pickNorm = normalize(pick.pick);
    const winnerNorm = normalize(actualWinner);
    const isCorrect = pickNorm === winnerNorm || pick.pick === actualWinner;
    if (isCorrect) correctCount++;
    else incorrectCount++;
    rows.push({ pick, actualWinner, correct: isCorrect });
  }

  const resolved = correctCount + incorrectCount;
  const winRate = resolved > 0 ? ((100 * correctCount) / resolved).toFixed(1) : '0';

  console.log('   Results:');
  console.log(`   ✅ Correct:   ${correctCount}`);
  console.log(`   ❌ Incorrect: ${incorrectCount}`);
  console.log(`   ⏳ No result: ${noResultCount} (game not in Odds API scores for last 1–3 days)`);
  console.log(`   📈 Win rate (resolved): ${winRate}% (${correctCount}/${resolved})\n`);

  if (resolved === 0 && noResultCount > 0) {
    console.log('   💡 Tip: "Today\'s" picks are mostly for games that haven\'t been played yet.');
    console.log('   • Run again later (e.g. after tonight\'s games finish) to get results for those.');
    console.log('   • Or use a picks file from a past date: run Progno run-progno-for-dates for yesterday,');
    console.log('     save the picks JSON, set PICKS_JSON to that file, then run backtest-progno.\n');
  }

  if (rows.length <= 20) {
    rows.forEach((r, i) => {
      const tag = r.correct === null ? '⏳' : r.correct ? '✅' : '❌';
      const actual = r.actualWinner ?? '—';
      console.log(`   ${i + 1}. ${tag} ${r.pick.home_team} vs ${r.pick.away_team} → pick: ${r.pick.pick}, actual: ${actual}`);
    });
  }
  console.log('\n');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
