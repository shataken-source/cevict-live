/**
 * Enrich backtest-games.json with real historical odds from The Odds API.
 *
 * Reads BACKTEST_JSON (default .progno/backtest-games.json), fetches historical
 * snapshots per (league, date), matches events by home/away/date, and merges
 * consensus odds (h2h, spreads, totals) into each game. Writes back to the
 * same file.
 *
 * Requires: paid Odds API plan (historical = 10 credits per region per market).
 * Env: ODDS_API_KEY or NEXT_PUBLIC_ODDS_API_KEY (or .progno/keys.json).
 *
 * Usage (from apps/progno):
 *   npx tsx scripts/fetch-theodds-historical.ts
 *   BACKTEST_JSON=.progno/backtest-games.json npx tsx scripts/fetch-theodds-historical.ts
 *
 * Optional:
 *   BACKTEST_HISTORICAL_LEAGUES=NFL,NBA   only these leagues (default: all in file)
 *   BACKTEST_HISTORICAL_DRY_RUN=1         log only, do not write
 */

import fs from 'fs';
import path from 'path';
import { getPrimaryKey } from '../app/keys-store';

const BACKTEST_JSON =
  process.env.BACKTEST_JSON ||
  path.join(process.cwd(), '.progno', 'backtest-games.json');
const DRY_RUN = process.env.BACKTEST_HISTORICAL_DRY_RUN === '1' || process.env.BACKTEST_HISTORICAL_DRY_RUN === 'true';
const MAX_BOOKS = 5;

const LEAGUE_TO_SPORT_KEY: Record<string, string> = {
  NFL: 'americanfootball_nfl',
  NBA: 'basketball_nba',
  NHL: 'icehockey_nhl',
  MLB: 'baseball_mlb',
  NCAAF: 'americanfootball_ncaaf',
  NCAAB: 'basketball_ncaab',
};

interface BacktestGameRow {
  id?: string;
  homeTeam: string;
  awayTeam: string;
  league: string;
  date: string;
  odds?: { home: number; away: number; spread?: number; total?: number };
  actualWinner?: string;
  actualScore?: { home: number; away: number };
  [k: string]: unknown;
}

function normalizeDate(d: string | unknown): string | null {
  if (typeof d !== 'string') return null;
  const m = d.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  const parsed = new Date(d);
  if (!isNaN(parsed.getTime())) return parsed.toISOString().split('T')[0];
  return null;
}

function teamMatch(a: string, b: string): boolean {
  const na = a.trim().toLowerCase();
  const nb = b.trim().toLowerCase();
  if (na === nb) return true;
  if (na.includes(nb) || nb.includes(na)) return true;
  // e.g. "Chiefs" vs "Kansas City Chiefs"
  const aWords = na.split(/\s+/);
  const bWords = nb.split(/\s+/);
  const lastA = aWords[aWords.length - 1];
  const lastB = bWords[bWords.length - 1];
  return lastA === lastB && (aWords.length <= 2 || bWords.length <= 2);
}

async function fetchHistoricalOdds(
  apiKey: string,
  sportKey: string,
  dateIso: string
): Promise<{ data?: Array<{
  id: string;
  home_team: string;
  away_team: string;
  commence_time: string;
  bookmakers?: Array<{
    markets?: Array<{
      key: string;
      outcomes?: Array<{ name: string; price: number; point?: number }>;
    }>;
  }>;
}> }> {
  const url = new URL(`https://api.the-odds-api.com/v4/historical/sports/${sportKey}/odds`);
  url.searchParams.set('apiKey', apiKey);
  url.searchParams.set('regions', 'us');
  url.searchParams.set('markets', 'h2h,spreads,totals');
  url.searchParams.set('oddsFormat', 'american');
  url.searchParams.set('date', dateIso);

  const res = await fetch(url.toString());
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Odds API ${res.status}: ${text.slice(0, 200)}`);
  }
  const json = await res.json();
  const remaining = res.headers.get('x-requests-remaining');
  if (remaining != null) console.log(`   Quota remaining: ${remaining}`);
  return json;
}

function consensusFromEvent(event: {
  home_team: string;
  away_team: string;
  bookmakers?: Array<{
    markets?: Array<{
      key: string;
      outcomes?: Array<{ name: string; price: number; point?: number }>;
    }>;
  }>;
}): { home: number; away: number; spread?: number; total?: number } | null {
  const books = event.bookmakers?.slice(0, MAX_BOOKS) ?? [];
  if (books.length === 0) return null;

  let homeSum = 0, awaySum = 0, homeCount = 0, awayCount = 0;
  let spreadSum = 0, spreadCount = 0, totalSum = 0, totalCount = 0;

  for (const book of books) {
    const h2h = book.markets?.find((m) => m.key === 'h2h');
    const spreads = book.markets?.find((m) => m.key === 'spreads');
    const totals = book.markets?.find((m) => m.key === 'totals');

    const homeOutcome = h2h?.outcomes?.find((o) => o.name === event.home_team);
    const awayOutcome = h2h?.outcomes?.find((o) => o.name === event.away_team);
    if (homeOutcome?.price != null) { homeSum += homeOutcome.price; homeCount++; }
    if (awayOutcome?.price != null) { awaySum += awayOutcome.price; awayCount++; }

    const homeSpread = spreads?.outcomes?.find((o) => o.name === event.home_team);
    const overTotal = totals?.outcomes?.find((o) => o.name === 'Over');
    if (homeSpread?.point != null) { spreadSum += homeSpread.point; spreadCount++; }
    if (overTotal?.point != null) { totalSum += overTotal.point; totalCount++; }
  }

  if (homeCount === 0 || awayCount === 0) return null;
  const home = Math.round(homeSum / homeCount);
  const away = Math.round(awaySum / awayCount);
  const spread = spreadCount > 0 ? spreadSum / spreadCount : undefined;
  const total = totalCount > 0 ? Math.round(totalSum / totalCount) : undefined;
  return { home, away, spread, total };
}

async function main() {
  console.log('\n📥 Fetch The Odds API historical odds into backtest JSON\n');

  const apiKey = getPrimaryKey();
  if (!apiKey) {
    console.error('❌ ODDS_API_KEY not set. Use env ODDS_API_KEY or .progno/keys.json');
    process.exit(1);
  }

  const resolved = path.isAbsolute(BACKTEST_JSON) ? BACKTEST_JSON : path.join(process.cwd(), BACKTEST_JSON);
  if (!fs.existsSync(resolved)) {
    console.error('❌ Backtest file not found:', resolved);
    process.exit(1);
  }

  const raw = JSON.parse(fs.readFileSync(resolved, 'utf8'));
  const games: BacktestGameRow[] = Array.isArray(raw) ? raw : raw.games ?? raw.picks ?? [];
  if (games.length === 0) {
    console.log('   No games in file.');
    return;
  }

  const leaguesFilter = process.env.BACKTEST_HISTORICAL_LEAGUES?.split(',').map((s) => s.trim().toUpperCase());
  const leagueToSportKey = LEAGUE_TO_SPORT_KEY;

  // Unique (league, date) to fetch
  const toFetch = new Map<string, { league: string; dateStr: string }>();
  for (const g of games) {
    const league = (g.league || 'NFL').toString().toUpperCase();
    if (leaguesFilter && leaguesFilter.length > 0 && !leaguesFilter.includes(league)) continue;
    const dateStr = normalizeDate(g.date);
    if (!dateStr) continue;
    const sportKey = leagueToSportKey[league];
    if (!sportKey) continue;
    toFetch.set(`${sportKey}:${dateStr}`, { league, dateStr });
  }

  console.log(`   Games in file: ${games.length}`);
  console.log(`   Unique (sport, date) to fetch: ${toFetch.size}`);
  if (DRY_RUN) console.log('   [DRY RUN] Will not write file.\n');

  let updated = 0;
  let errors = 0;

  for (const [, { league, dateStr }] of toFetch) {
    const sportKey = leagueToSportKey[league];
    if (!sportKey) continue;
    const dateIso = `${dateStr}T12:00:00Z`;
    try {
      const json = await fetchHistoricalOdds(apiKey, sportKey, dateIso);
      const events = json.data ?? [];
      for (const event of events) {
        const odds = consensusFromEvent(event);
        if (!odds) continue;
        const eventDate = event.commence_time?.slice(0, 10);
        for (const g of games) {
          const gDate = normalizeDate(g.date);
          const gLeague = (g.league || '').toString().toUpperCase();
          if (gLeague !== league || gDate !== eventDate) continue;
          const homeMatch = teamMatch(g.homeTeam, event.home_team);
          const awayMatch = teamMatch(g.awayTeam, event.away_team);
          if (homeMatch && awayMatch) {
            g.odds = { home: odds.home, away: odds.away, spread: odds.spread, total: odds.total };
            updated++;
            break;
          }
        }
      }
      await new Promise((r) => setTimeout(r, 400));
    } catch (e: any) {
      console.warn(`   Failed ${sportKey} ${dateStr}: ${e.message}`);
      errors++;
    }
  }

  console.log(`   Matched and updated odds: ${updated} games`);
  if (errors) console.log(`   Errors: ${errors}`);

  if (!DRY_RUN && updated > 0) {
    const out = Array.isArray(raw) ? games : { ...raw, games };
    fs.writeFileSync(resolved, JSON.stringify(out, null, 2), 'utf8');
    console.log(`   Wrote ${resolved}\n`);
  } else if (DRY_RUN) {
    console.log('   Skipped write (dry run).\n');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
