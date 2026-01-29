/**
 * Fetch 2024 game results from Sports-Reference.com and write backtest JSON.
 *
 * No API key. Fetches NFL, NBA, NHL, MLB, NCAAF, NCAAB game tables, parses
 * winner/loser (or home/away), scores, and outputs .progno/backtest-games.json
 * for run-backtest-historical.ts. Uses placeholder odds (-110/-110) when not available.
 *
 * Run: cd apps/progno && npx tsx scripts/fetch-sports-reference-backtest.ts
 *
 * Env:
 *   BACKTEST_OUTPUT - output path (default: .progno/backtest-games.json)
 *   BACKTEST_YEAR   - season year (default: 2024)
 *   SPORTS          - comma list: NFL,NBA,NHL,MLB,NCAAF,NCAAB (default: all)
 */

import fs from 'fs';
import path from 'path';
import * as cheerio from 'cheerio';

const YEAR = process.env.BACKTEST_YEAR || '2024';
const OUT_PATH =
  process.env.BACKTEST_OUTPUT ||
  path.join(process.cwd(), '.progno', 'backtest-games.json');
const SPORTS = (process.env.SPORTS || 'NFL,NBA,NHL,MLB,NCAAF,NCAAB').split(',');
const DEBUG = process.env.BACKTEST_DEBUG === '1' || process.env.BACKTEST_DEBUG === 'true';

const URLS: Record<string, string> = {
  NFL: `https://www.pro-football-reference.com/years/${YEAR}/games.htm`,
  NBA: `https://www.basketball-reference.com/leagues/NBA_${YEAR}_games.html`,
  NHL: `https://www.hockey-reference.com/leagues/NHL_${YEAR}_games.html`,
  MLB: `https://www.baseball-reference.com/leagues/majors/${YEAR}-schedule.shtml`,
  NCAAF: `https://www.college-football-reference.com/years/${YEAR}/games.htm`,
  NCAAB: `https://www.sports-reference.com/cbb/leagues/NCAA_${YEAR}_games.html`,
};
const NCAAB_ALT_URL = `https://www.college-basketball-reference.com/leagues/NCAA_${YEAR}.html`;

interface BacktestGame {
  id: string;
  homeTeam: string;
  awayTeam: string;
  league: string;
  date: string;
  odds: { home: number; away: number; spread?: number; total?: number };
  actualWinner: string;
  actualScore?: { home: number; away: number };
}

function stripHtml(text: string): string {
  return text.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

function parseDate(s: string): string | null {
  const m = s.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  const us = s.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (us) return `${us[3]}-${us[1].padStart(2, '0')}-${us[2].padStart(2, '0')}`;
  return null;
}

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; rv:91.0) Gecko/20100101 Firefox/91.0' },
  });
  if (!res.ok) throw new Error(`${url} ${res.status}`);
  return res.text();
}

/** Sports-Reference often puts the main table inside a comment; find first comment containing a table. */
function extractTableFromComment(html: string): string | null {
  let idx = 0;
  for (;;) {
    const commentStart = html.indexOf('<!--', idx);
    if (commentStart === -1) break;
    const commentEnd = html.indexOf('-->', commentStart + 4);
    if (commentEnd === -1) break;
    const block = html.slice(commentStart + 4, commentEnd);
    if (/<\s*table\s/i.test(block) && /winner|schedule|pts_win|date_game|visitor|home_team|pts/i.test(block)) return block;
    idx = commentEnd + 3;
  }
  return null;
}

/** Find the main games/schedule table: in DOM, in comments, or by structure. */
function findGamesTable($: cheerio.CheerioAPI, html: string, minCells = 8): cheerio.Cheerio<cheerio.Element> {
  let table = $('table#games').first();
  if (!table.length) table = $('table#schedule').first();
  if (!table.length) table = $('#all_games table').first();
  if (!table.length) table = $('#all_schedule table').first();
  if (!table.length) {
    $('table').each((_, el) => {
      const t = $(el);
      const firstRow = t.find('tbody tr').first();
      if (firstRow.find('td, th').length >= minCells) {
        if (!table?.length) table = t;
        return false; // break
      }
    });
  }
  if (!table?.length && html) {
    const commented = extractTableFromComment(html);
    if (commented) {
      const $c = cheerio.load(commented);
      table = $c('table').first();
      if (!table.length) $c('table').each((_, el) => { table = $c(el); return false; });
    }
  }
  return table ?? $();
}

/** Basketball Reference: Date, Visitor, Pts, Home, Pts (or data-stat). Use td,th so date column is included. */
function parseBasketball(
  $: cheerio.CheerioAPI,
  html: string,
  league: string,
  tableSelector: string
): BacktestGame[] {
  const games: BacktestGame[] = [];
  let table = $(tableSelector).first();
  if (!table.length) table = findGamesTable($, html, 5);
  if (!table.length) return games;

  const ths: string[] = [];
  table.find('thead th').each((_, el) => {
    ths.push(stripHtml($(el).html() || '').toLowerCase());
  });
  const dateIdx = ths.findIndex((c) => c.includes('date'));
  const visIdx = ths.findIndex((c) => c.includes('visitor') || c.includes('away'));
  const homeIdx = ths.findIndex((c) => c.includes('home') && !c.includes('pts'));
  let ptsVisIdx = ths.findIndex((c) => c === 'pts' || c.includes('pts'));
  if (ptsVisIdx === -1) ptsVisIdx = 3;
  const ptsHomeIdx =
    ths.findIndex((c, i) => i > ptsVisIdx && (c === 'pts' || c.includes('pts'))) ?? ptsVisIdx + 2;
  const safePtsHomeIdx = ptsHomeIdx >= 0 && ptsHomeIdx < ths.length ? ptsHomeIdx : ptsVisIdx + 2;

  table.find('tbody tr').each((_, tr) => {
    const $tr = $(tr);
    const cells = $tr.find('td, th');
    const byStat = (name: string) =>
      stripHtml($tr.find(`[data-stat="${name}"]`).first().text() || '').trim();
    const get = (i: number) => stripHtml(cells.eq(i).html() || '').trim();
    const dateStr = byStat('date_game') || (dateIdx >= 0 && cells.length > dateIdx ? get(dateIdx) : '');
    const visitor = byStat('visitor_team_name') || (visIdx >= 0 && cells.length > visIdx ? get(visIdx) : '');
    const home = byStat('home_team_name') || (homeIdx >= 0 && cells.length > homeIdx ? get(homeIdx) : '');
    const ptsV = parseInt(
      (byStat('visitor_pts') || (ptsVisIdx >= 0 && cells.length > ptsVisIdx ? get(ptsVisIdx) : '')).replace(/\D/g, ''),
      10
    );
    const ptsH = parseInt(
      (byStat('home_pts') ||
        (safePtsHomeIdx >= 0 && cells.length > safePtsHomeIdx ? get(safePtsHomeIdx) : '')).replace(/\D/g, ''),
      10
    );
    const date = parseDate(dateStr);
    if (!date || !visitor || !home) return;
    if (isNaN(ptsV) || isNaN(ptsH)) return;
    const winner = ptsV > ptsH ? visitor : home;
    games.push({
      id: `${league.toLowerCase()}-${date}-${home}-${visitor}`.replace(/\s+/g, '-'),
      homeTeam: home,
      awayTeam: visitor,
      league,
      date,
      odds: { home: -110, away: -110 },
      actualWinner: winner,
      actualScore: { home: ptsH, away: ptsV },
    });
  });
  return games;
}

async function scrapeSport(league: string): Promise<BacktestGame[]> {
  let url = URLS[league];
  if (!url) return [];
  let html: string;
  try {
    html = await fetchHtml(url);
  } catch (e1) {
    if (league === 'NCAAB' && NCAAB_ALT_URL) {
      try {
        html = await fetchHtml(NCAAB_ALT_URL);
      } catch {
        throw e1;
      }
    } else {
      throw e1;
    }
  }
  if (DEBUG) {
    const debugDir = path.join(process.cwd(), '.progno');
    if (!fs.existsSync(debugDir)) fs.mkdirSync(debugDir, { recursive: true });
    fs.writeFileSync(path.join(debugDir, `debug-${league.toLowerCase()}.html`), html, 'utf8');
  }
  const $ = cheerio.load(html);

  if (league === 'NFL') {
    const table = findGamesTable($, html, 10);
    if (!table.length) return [];
    const games: BacktestGame[] = [];
    table.find('tbody tr').each((_, tr) => {
      const $tr = $(tr);
      const cells = $tr.find('td');
      const byStat = (name: string) => stripHtml($tr.find(`td[data-stat="${name}"]`).first().text() || '').trim();
      const get = (i: number) => stripHtml(cells.eq(i).html() || '').trim();
      // PFR uses game_date (not date_game); first cell is <th> so td indices are 0-based from first td
      let dateStr = byStat('game_date') || byStat('date_game') || (cells.length >= 2 ? get(1) : '');
      let winner = byStat('winner') || (cells.length >= 4 ? get(3) : '');
      let loser = byStat('loser') || (cells.length >= 6 ? get(5) : '');
      const atCol = byStat('game_location') || (cells.length >= 5 ? get(4) : '');
      let pw = parseInt((byStat('pts_win') || (cells.length >= 8 ? get(7) : '')).replace(/\D/g, ''), 10);
      let pl = parseInt((byStat('pts_lose') || (cells.length >= 9 ? get(8) : '')).replace(/\D/g, ''), 10);
      if (cells.length >= 1 && (get(0) === 'Week' || /WildCard|Division|ConfChamp|SuperBowl/.test(get(0)))) return;
      if (!winner || !loser || winner.length > 80) return;
      if (isNaN(pw) || isNaN(pl)) return;
      const date = parseDate(dateStr);
      if (!date) return;
      const isAwayWin = atCol === '@' || atCol === 'N';
      const homeTeam = isAwayWin ? loser : winner;
      const awayTeam = isAwayWin ? winner : loser;
      games.push({
        id: `nfl-${date}-${homeTeam}-${awayTeam}`.replace(/\s+/g, '-'),
        homeTeam,
        awayTeam,
        league: 'NFL',
        date,
        odds: { home: -110, away: -110 },
        actualWinner: winner,
        actualScore: { home: isAwayWin ? pl : pw, away: isAwayWin ? pw : pl },
      });
    });
    return games;
  }

  if (league === 'NBA') {
    const months = ['october', 'november', 'december', 'january', 'february', 'march', 'april', 'may', 'june'];
    const baseUrl = `https://www.basketball-reference.com/leagues/NBA_${YEAR}_games`;
    const allGames: BacktestGame[] = [];
    for (const month of months) {
      try {
        const monthHtml = await fetchHtml(`${baseUrl}-${month}.html`);
        const $m = cheerio.load(monthHtml);
        const monthGames = parseBasketball($m, monthHtml, 'NBA', 'table#schedule');
        if (monthGames.length) allGames.push(...monthGames);
      } catch {
        // month page may not exist yet
      }
    }
    if (allGames.length) return allGames;
    const sel = 'table#schedule';
    return parseBasketball($, html, league, sel);
  }

  if (league === 'NCAAB') {
    const sel = 'table#schedule, table#games';
    return parseBasketball($, html, league, sel);
  }

  if (league === 'NHL') {
    const table = findGamesTable($, html, 6);
    if (!table.length) return [];
    const games: BacktestGame[] = [];
    table.find('tbody tr').each((_, tr) => {
      const cells = $(tr).find('td, th');
      if (cells.length < 6) return;
      const get = (i: number) => stripHtml(cells.eq(i).html() || '').trim();
      const dateStr = get(0);
      const vis = get(2);
      const home = get(4);
      const ptsV = parseInt(get(3).replace(/\D/g, ''), 10);
      const ptsH = parseInt(get(5).replace(/\D/g, ''), 10);
      if (!vis || !home) return;
      const date = parseDate(dateStr);
      if (!date) return;
      const winner = !isNaN(ptsV) && !isNaN(ptsH) ? (ptsV > ptsH ? vis : home) : home;
      games.push({
        id: `nhl-${date}-${home}-${vis}`.replace(/\s+/g, '-'),
        homeTeam: home,
        awayTeam: vis,
        league: 'NHL',
        date,
        odds: { home: -110, away: -110 },
        actualWinner: winner,
        actualScore: !isNaN(ptsH) && !isNaN(ptsV) ? { home: ptsH, away: ptsV } : undefined,
      });
    });
    return games;
  }

  if (league === 'MLB') {
    let table = findGamesTable($, html, 5);
    if (!table.length) table = $('table#schedule').first();
    if (!table.length) return [];
    const games: BacktestGame[] = [];
    table.find('tbody tr').each((_, tr) => {
      const cells = $(tr).find('td');
      if (cells.length < 5) return;
      const get = (i: number) => stripHtml(cells.eq(i).html() || '').trim();
      const dateStr = get(0);
      const vis = get(2);
      const home = get(4);
      const ptsV = parseInt(get(3).replace(/\D/g, ''), 10);
      const ptsH = parseInt(get(5).replace(/\D/g, ''), 10);
      if (!vis || !home) return;
      const date = parseDate(dateStr);
      if (!date) return;
      const winner = !isNaN(ptsV) && !isNaN(ptsH) ? (ptsV > ptsH ? vis : home) : home;
      games.push({
        id: `mlb-${date}-${home}-${vis}`.replace(/\s+/g, '-'),
        homeTeam: home,
        awayTeam: vis,
        league: 'MLB',
        date,
        odds: { home: -110, away: -110 },
        actualWinner: winner,
        actualScore: !isNaN(ptsH) && !isNaN(ptsV) ? { home: ptsH, away: ptsV } : undefined,
      });
    });
    return games;
  }

  if (league === 'NCAAF') {
    const table = findGamesTable($, html, 9);
    if (!table.length) return [];
    const games: BacktestGame[] = [];
    table.find('tbody tr').each((_, tr) => {
      const cells = $(tr).find('td, th');
      if (cells.length < 10) return;
      const get = (i: number) => stripHtml(cells.eq(i).html() || '').trim();
      const dateStr = get(2);
      const winner = get(4);
      const atCol = get(5);
      const loser = get(6);
      const ptsW = parseInt(get(8).replace(/\D/g, ''), 10);
      const ptsL = parseInt(get(9).replace(/\D/g, ''), 10);
      if (!winner || !loser) return;
      if (isNaN(ptsW) || isNaN(ptsL)) return;
      const date = parseDate(dateStr);
      if (!date) return;
      const isAwayWin = atCol === '@';
      const homeTeam = isAwayWin ? loser : winner;
      const awayTeam = isAwayWin ? winner : loser;
      games.push({
        id: `ncaaf-${date}-${homeTeam}-${awayTeam}`.replace(/\s+/g, '-'),
        homeTeam,
        awayTeam,
        league: 'NCAAF',
        date,
        odds: { home: -110, away: -110 },
        actualWinner: winner,
        actualScore: { home: isAwayWin ? ptsL : ptsW, away: isAwayWin ? ptsW : ptsL },
      });
    });
    return games;
  }

  return [];
}

async function main() {
  console.log(`\n📥 Fetching Sports-Reference ${YEAR} results → backtest JSON\n`);
  const dir = path.dirname(OUT_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const all: BacktestGame[] = [];
  for (const league of SPORTS) {
    if (!URLS[league]) continue;
    try {
      process.stdout.write(`   ${league}... `);
      const games = await scrapeSport(league);
      all.push(...games);
      console.log(`${games.length} games`);
    } catch (e) {
      console.log(`failed: ${(e as Error).message}`);
    }
  }

  all.sort((a, b) => a.date.localeCompare(b.date));
  fs.writeFileSync(OUT_PATH, JSON.stringify(all, null, 2), 'utf8');
  console.log(`\n   Total: ${all.length} games → ${OUT_PATH}`);
  console.log('   Run backtest: npx tsx scripts/run-backtest-historical.ts\n');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
