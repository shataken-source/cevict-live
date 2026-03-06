/**
 * Odds Tracker Cron Job — Backtesting Data Collector
 * Runs hourly. Collects odds snapshots from 4 bookmakers × 7 sports.
 * Tags opening lines (first snapshot per game) and closing lines
 * (last snapshot before commence_time). Also writes game results
 * from ESPN for completed games.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const maxDuration = 120;

const BOOKMAKERS = [
  'pinnacle',    // Sharp book (most important!)
  'draftkings',  // Public book
  'fanduel',     // Public book
  'betmgm',      // Public book
];

const SPORTS = [
  'americanfootball_nfl',
  'basketball_nba',
  'baseball_mlb',
  'icehockey_nhl',
  'americanfootball_ncaaf',
  'basketball_ncaab',
  'baseball_ncaa',
];

const ESPN_LEAGUE_PATH: Record<string, string> = {
  americanfootball_nfl: 'football/nfl',
  basketball_nba: 'basketball/nba',
  baseball_mlb: 'baseball/mlb',
  icehockey_nhl: 'hockey/nhl',
  americanfootball_ncaaf: 'football/college-football',
  basketball_ncaab: 'basketball/mens-college-basketball',
  baseball_ncaa: 'baseball/college-baseball',
};

function getSupabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function GET(request: NextRequest) {
  try {
    const isVercelCron = request.headers.get('x-vercel-cron') === '1';
    const authHeader = request.headers.get('authorization');
    if (!isVercelCron && process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[Odds Tracker] Starting odds collection...');

    const oddsApiKey = process.env.ODDS_API_KEY;
    if (!oddsApiKey) {
      return NextResponse.json({ success: false, error: 'ODDS_API_KEY not configured' }, { status: 500 });
    }

    const sb = getSupabase();
    const allSnapshots: any[] = [];
    let closingTagged = 0;
    let openingTagged = 0;
    let resultsWritten = 0;

    for (const sport of SPORTS) {
      try {
        const url = `https://api.the-odds-api.com/v4/sports/${sport}/odds/?apiKey=${oddsApiKey}&markets=h2h,spreads,totals&bookmakers=${BOOKMAKERS.join(',')}`;
        const response = await fetch(url);
        if (!response.ok) { console.warn(`[Odds Tracker] ${sport}: HTTP ${response.status}`); continue; }
        const games = await response.json();

        for (const game of games) {
          const snapshot = createOddsSnapshot(game);
          allSnapshots.push(snapshot);
        }
        console.log(`[Odds Tracker] ${sport}: ${games.length} games`);
      } catch (error: any) {
        console.error(`[Odds Tracker] ${sport}:`, error?.message);
      }
    }

    // Store snapshots
    await storeOddsSnapshots(allSnapshots);

    // Tag opening/closing lines and collect results
    if (sb) {
      openingTagged = await tagOpeningLines(sb);
      closingTagged = await tagClosingLines(sb);
      resultsWritten = await collectGameResults(sb);
    }

    console.log(`[Odds Tracker] Done: ${allSnapshots.length} snapshots, ${openingTagged} opening, ${closingTagged} closing, ${resultsWritten} results`);

    return NextResponse.json({
      success: true,
      gamesTracked: allSnapshots.length,
      openingTagged,
      closingTagged,
      resultsWritten,
      sports: SPORTS,
      bookmakers: BOOKMAKERS,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[Odds Tracker] Error:', error);
    return NextResponse.json({ success: false, error: error?.message || 'Failed' }, { status: 500 });
  }
}

// ── Tag opening lines: first snapshot per game_id ────────────────────────────

async function tagOpeningLines(sb: SupabaseClient): Promise<number> {
  try {
    // Find game_ids that have NO opening line tagged yet
    // Then mark their earliest snapshot as opening
    const { data: untagged, error: e1 } = await sb.rpc('tag_opening_lines');
    if (e1) {
      // Fallback: manual query if RPC doesn't exist
      // Get game_ids with no opening tag
      const { data: games } = await sb
        .from('historical_odds')
        .select('game_id')
        .eq('is_opening', false)
        .is('is_opening', null)
        .limit(500);

      if (!games?.length) return 0;

      const uniqueIds = [...new Set(games.map((g: any) => g.game_id))];
      let tagged = 0;

      for (const gameId of uniqueIds.slice(0, 100)) {
        // Check if this game already has an opening tag
        const { data: existing } = await sb
          .from('historical_odds')
          .select('id')
          .eq('game_id', gameId)
          .eq('is_opening', true)
          .limit(1);

        if (existing?.length) continue;

        // Get earliest snapshot for this game
        const { data: earliest } = await sb
          .from('historical_odds')
          .select('captured_at')
          .eq('game_id', gameId)
          .order('captured_at', { ascending: true })
          .limit(1);

        if (!earliest?.length) continue;

        // Tag all rows with that game_id + captured_at as opening
        const { error } = await sb
          .from('historical_odds')
          .update({ is_opening: true })
          .eq('game_id', gameId)
          .eq('captured_at', earliest[0].captured_at);

        if (!error) tagged++;
      }
      return tagged;
    }
    return (untagged as any)?.tagged ?? 0;
  } catch (e) {
    console.warn('[Odds Tracker] Opening tag error:', e);
    return 0;
  }
}

// ── Tag closing lines: last snapshot before commence_time ────────────────────

async function tagClosingLines(sb: SupabaseClient): Promise<number> {
  try {
    const now = new Date().toISOString();

    // Find games that have started (commence_time < now) but no closing tag
    const { data: started } = await sb
      .from('historical_odds')
      .select('game_id, commence_time')
      .lt('commence_time', now)
      .eq('is_closing', false)
      .limit(500);

    if (!started?.length) return 0;

    const uniqueGames = new Map<string, string>();
    for (const row of started) {
      if (!uniqueGames.has(row.game_id)) uniqueGames.set(row.game_id, row.commence_time);
    }

    let tagged = 0;
    for (const [gameId, commenceTime] of [...uniqueGames].slice(0, 100)) {
      // Check if already has a closing tag
      const { data: existing } = await sb
        .from('historical_odds')
        .select('id')
        .eq('game_id', gameId)
        .eq('is_closing', true)
        .limit(1);

      if (existing?.length) continue;

      // Get the last snapshot BEFORE game start
      const { data: latest } = await sb
        .from('historical_odds')
        .select('captured_at')
        .eq('game_id', gameId)
        .lt('captured_at', commenceTime)
        .order('captured_at', { ascending: false })
        .limit(1);

      if (!latest?.length) continue;

      // Tag all rows with that game_id + captured_at as closing
      const { error } = await sb
        .from('historical_odds')
        .update({ is_closing: true })
        .eq('game_id', gameId)
        .eq('captured_at', latest[0].captured_at);

      if (!error) tagged++;
    }
    return tagged;
  } catch (e) {
    console.warn('[Odds Tracker] Closing tag error:', e);
    return 0;
  }
}

// ── Collect game results from ESPN ──────────────────────────────────────────

async function collectGameResults(sb: SupabaseClient): Promise<number> {
  let written = 0;

  for (const [sportKey, espnPath] of Object.entries(ESPN_LEAGUE_PATH)) {
    try {
      const res = await fetch(
        `https://site.api.espn.com/apis/site/v2/sports/${espnPath}/scoreboard`,
        { headers: { 'Cache-Control': 'no-store' }, signal: AbortSignal.timeout(8000) }
      );
      if (!res.ok) continue;
      const data: any = await res.json();

      for (const event of data.events || []) {
        const statusType = event.status?.type;
        if (statusType?.state !== 'post') continue; // Only completed games

        const comp = event.competitions?.[0];
        if (!comp) continue;
        const homeComp = comp.competitors?.find((c: any) => c.homeAway === 'home');
        const awayComp = comp.competitors?.find((c: any) => c.homeAway === 'away');
        if (!homeComp?.team || !awayComp?.team) continue;

        const homeScore = parseInt(String(homeComp.score || 0), 10) || 0;
        const awayScore = parseInt(String(awayComp.score || 0), 10) || 0;
        const homeTeam = (homeComp.team.displayName || homeComp.team.abbreviation || '').trim();
        const awayTeam = (awayComp.team.displayName || awayComp.team.abbreviation || '').trim();

        // Try to match to a game_id in historical_odds by team name fuzzy match
        const gameId = await findGameId(sb, sportKey, homeTeam, awayTeam);

        const gameDate = event.date
          ? new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(event.date))
          : null;

        const row = {
          game_id: gameId || `espn_${event.id}`,
          sport: sportKey,
          home_team: homeTeam,
          away_team: awayTeam,
          commence_time: event.date || null,
          game_date: gameDate,
          home_score: homeScore,
          away_score: awayScore,
          winner: homeScore > awayScore ? 'home' : awayScore > homeScore ? 'away' : 'draw',
          total_points: homeScore + awayScore,
          home_margin: homeScore - awayScore,
          status: 'final',
          source: 'espn',
        };

        const { error } = await sb
          .from('game_results')
          .upsert(row, { onConflict: 'game_id', ignoreDuplicates: true });

        if (!error) written++;
      }
    } catch { continue; }
  }
  return written;
}

/** Fuzzy match ESPN team names to historical_odds game_id */
async function findGameId(sb: SupabaseClient, sport: string, home: string, away: string): Promise<string | null> {
  try {
    // Look for recent games matching both team names
    const yesterday = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    const { data } = await sb
      .from('historical_odds')
      .select('game_id, home_team, away_team')
      .eq('sport', sport)
      .gte('commence_time', yesterday)
      .limit(200);

    if (!data?.length) return null;

    const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
    const nh = normalize(home);
    const na = normalize(away);

    for (const row of data) {
      const rh = normalize(row.home_team || '');
      const ra = normalize(row.away_team || '');
      if ((rh.includes(nh) || nh.includes(rh)) && (ra.includes(na) || na.includes(ra))) {
        return row.game_id;
      }
    }
    return null;
  } catch { return null; }
}

interface OddsSnapshot {
  gameId: string;
  sport: string;
  homeTeam: string;
  awayTeam: string;
  commenceTime: string;
  timestamp: string;
  bookmakers: {
    [key: string]: {
      spreads?: { home: number; away: number; homeOdds: number; awayOdds: number };
      totals?: { line: number; overOdds: number; underOdds: number };
      moneyline?: { home: number; away: number };
    };
  };
}

// Convert decimal odds (1.57, 3.1) to American (-175, +210) if needed.
// The Odds API returns decimal for some baseball markets but our DB stores American (integer).
function toAmericanOdds(price: number): number {
  if (!Number.isFinite(price)) return -110;
  // Already American format: values like -110, +150, -200 (magnitude > 20 or negative)
  if (price <= 0 || price > 20) return Math.round(price);
  // Decimal odds: 1.01–20.00
  if (price >= 2) return Math.round((price - 1) * 100);     // e.g. 3.1 → +210
  return Math.round(-100 / (price - 1));                      // e.g. 1.57 → -175
}

function createOddsSnapshot(game: any): OddsSnapshot {
  const snapshot: OddsSnapshot = {
    gameId: game.id,
    sport: game.sport_key,
    homeTeam: game.home_team,
    awayTeam: game.away_team,
    commenceTime: game.commence_time,
    timestamp: new Date().toISOString(),
    bookmakers: {},
  };

  for (const bookmaker of game.bookmakers || []) {
    const bookData: any = {};

    for (const market of bookmaker.markets || []) {
      if (market.key === 'spreads') {
        const homeOutcome = market.outcomes?.find((o: any) => o.name === game.home_team);
        const awayOutcome = market.outcomes?.find((o: any) => o.name === game.away_team);
        if (homeOutcome && awayOutcome) {
          bookData.spreads = {
            home: homeOutcome.point || 0,
            away: awayOutcome.point || 0,
            homeOdds: toAmericanOdds(homeOutcome.price || -110),
            awayOdds: toAmericanOdds(awayOutcome.price || -110),
          };
        }
      } else if (market.key === 'totals') {
        const overOutcome = market.outcomes?.find((o: any) => o.name === 'Over');
        const underOutcome = market.outcomes?.find((o: any) => o.name === 'Under');
        if (overOutcome && underOutcome) {
          bookData.totals = {
            line: overOutcome.point || 0,
            overOdds: toAmericanOdds(overOutcome.price || -110),
            underOdds: toAmericanOdds(underOutcome.price || -110),
          };
        }
      } else if (market.key === 'h2h') {
        const homeOutcome = market.outcomes?.find((o: any) => o.name === game.home_team);
        const awayOutcome = market.outcomes?.find((o: any) => o.name === game.away_team);
        if (homeOutcome && awayOutcome) {
          bookData.moneyline = {
            home: toAmericanOdds(homeOutcome.price || -110),
            away: toAmericanOdds(awayOutcome.price || -110),
          };
        }
      }
    }

    if (Object.keys(bookData).length > 0) {
      snapshot.bookmakers[bookmaker.key] = bookData;
    }
  }

  return snapshot;
}

async function detectLineMovementSignals(snapshot: OddsSnapshot): Promise<string[]> {
  const signals: string[] = [];

  // Load previous snapshot for comparison
  const previousSnapshot = await loadPreviousSnapshot(snapshot.gameId);
  if (!previousSnapshot) return signals;

  // Compare Pinnacle (sharp book) to public books
  const pinnacle = snapshot.bookmakers['pinnacle'];
  const previousPinnacle = previousSnapshot.bookmakers['pinnacle'];

  if (pinnacle?.spreads && previousPinnacle?.spreads) {
    const movement = pinnacle.spreads.home - previousPinnacle.spreads.home;

    // Detect significant movement (0.5+ points)
    if (Math.abs(movement) >= 0.5) {
      signals.push(`SPREAD_MOVE: ${movement > 0 ? '+' : ''}${movement} points`);
    }

    // Detect steam move (rapid movement across books)
    const publicBooks = ['draftkings', 'fanduel', 'betmgm'];
    const publicMoves = publicBooks.filter(book => {
      const current = snapshot.bookmakers[book]?.spreads?.home;
      const previous = previousSnapshot.bookmakers[book]?.spreads?.home;
      return current && previous && Math.abs(current - previous) >= 0.5;
    });

    if (publicMoves.length >= 2 && Math.abs(movement) >= 0.5) {
      signals.push(`STEAM_MOVE: ${publicMoves.length + 1} books moved in <30min`);
    }
  }

  return signals;
}

async function loadPreviousSnapshot(gameId: string): Promise<OddsSnapshot | null> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseKey) return null;

    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get the most recent snapshot for this game (older than 10 min to avoid self-comparison)
    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from('historical_odds')
      .select('*')
      .eq('game_id', gameId)
      .lt('captured_at', tenMinAgo)
      .order('captured_at', { ascending: false })
      .limit(20);

    if (error || !data || data.length === 0) return null;

    // Reconstruct the OddsSnapshot from flat rows
    const first = data[0];
    const snapshot: OddsSnapshot = {
      gameId: first.game_id,
      sport: first.sport,
      homeTeam: first.home_team,
      awayTeam: first.away_team,
      commenceTime: first.commence_time,
      timestamp: first.captured_at,
      bookmakers: {},
    };

    // Group by bookmaker and reconstruct markets
    for (const row of data) {
      // Only use rows from the same captured_at timestamp
      if (row.captured_at !== first.captured_at) continue;

      if (!snapshot.bookmakers[row.bookmaker]) {
        snapshot.bookmakers[row.bookmaker] = {};
      }
      const book = snapshot.bookmakers[row.bookmaker];

      if (row.market_type === 'moneyline' && row.home_odds != null) {
        book.moneyline = { home: row.home_odds, away: row.away_odds };
      } else if (row.market_type === 'spreads' && row.home_spread != null) {
        book.spreads = {
          home: row.home_spread,
          away: row.away_spread,
          homeOdds: row.home_odds,
          awayOdds: row.away_odds,
        };
      } else if (row.market_type === 'totals' && row.total_line != null) {
        book.totals = {
          line: row.total_line,
          overOdds: row.over_odds,
          underOdds: row.under_odds,
        };
      }
    }

    return snapshot;
  } catch (e) {
    console.warn('[Odds Tracker] Failed to load previous snapshot:', e);
    return null;
  }
}

async function storeOddsSnapshots(snapshots: OddsSnapshot[]): Promise<void> {
  // Store in Supabase for historical database
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.warn('[Odds Tracker] Supabase credentials not configured, skipping DB storage');
      return;
    }

    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, supabaseKey);

    for (const snapshot of snapshots) {
      // Flatten bookmaker data for storage
      const records: any[] = [];

      for (const [bookmaker, data] of Object.entries(snapshot.bookmakers)) {
        // Moneyline odds
        if (data.moneyline) {
          records.push({
            game_id: snapshot.gameId,
            sport: snapshot.sport,
            home_team: snapshot.homeTeam,
            away_team: snapshot.awayTeam,
            commence_time: snapshot.commenceTime,
            bookmaker: bookmaker,
            market_type: 'moneyline',
            home_odds: data.moneyline.home,
            away_odds: data.moneyline.away,
            captured_at: snapshot.timestamp
          });
        }

        // Spread odds
        if (data.spreads) {
          records.push({
            game_id: snapshot.gameId,
            sport: snapshot.sport,
            home_team: snapshot.homeTeam,
            away_team: snapshot.awayTeam,
            commence_time: snapshot.commenceTime,
            bookmaker: bookmaker,
            market_type: 'spreads',
            home_spread: data.spreads.home,
            away_spread: data.spreads.away,
            home_odds: data.spreads.homeOdds,
            away_odds: data.spreads.awayOdds,
            captured_at: snapshot.timestamp
          });
        }

        // Totals odds
        if (data.totals) {
          records.push({
            game_id: snapshot.gameId,
            sport: snapshot.sport,
            home_team: snapshot.homeTeam,
            away_team: snapshot.awayTeam,
            commence_time: snapshot.commenceTime,
            bookmaker: bookmaker,
            market_type: 'totals',
            total_line: data.totals.line,
            over_odds: data.totals.overOdds,
            under_odds: data.totals.underOdds,
            captured_at: snapshot.timestamp
          });
        }
      }

      // Batch insert to Supabase
      if (records.length > 0) {
        const { error } = await supabase
          .from('historical_odds')
          .upsert(records, {
            onConflict: 'game_id,bookmaker,market_type,captured_at',
            ignoreDuplicates: true
          });

        if (error) {
          console.error(`[Odds Tracker] Supabase insert error for ${snapshot.gameId}:`, error);
        } else {
          console.log(`[Odds Tracker] Stored ${records.length} odds records for ${snapshot.gameId}`);
        }
      }
    }
  } catch (e) {
    console.error('[Odds Tracker] Failed to store odds in Supabase:', e);
  }
}

