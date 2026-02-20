/**
 * Odds Tracker Cron Job
 * Per Claude Effect Complete Guide - runs every 30 minutes
 * Tracks line movements from multiple sportsbooks for IAI detection
 */

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Bookmakers to track (per guide)
const BOOKMAKERS = [
  'pinnacle',    // Sharp book (most important!)
  'draftkings',  // Public book
  'fanduel',     // Public book
  'betmgm',      // Public book
];

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret (Vercel Cron sends `x-vercel-cron: 1`)
    const isVercelCron = request.headers.get('x-vercel-cron') === '1';
    const authHeader = request.headers.get('authorization');
    if (!isVercelCron && process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[Odds Tracker] Starting odds collection...');

    const oddsApiKey = process.env.ODDS_API_KEY;
    if (!oddsApiKey) {
      console.warn('[Odds Tracker] No ODDS_API_KEY configured');
      return NextResponse.json({
        success: false,
        error: 'ODDS_API_KEY not configured',
      }, { status: 500 });
    }

    // Sports to track
    const sports = [
      'americanfootball_nfl',
      'basketball_nba',
      'baseball_mlb',
      'icehockey_nhl',
      'americanfootball_ncaaf',
      'basketball_ncaab',
    ];

    const allSnapshots: any[] = [];

    for (const sport of sports) {
      try {
        const url = `https://api.the-odds-api.com/v4/sports/${sport}/odds/?apiKey=${oddsApiKey}&markets=h2h,spreads,totals&bookmakers=${BOOKMAKERS.join(',')}`;
        const response = await fetch(url);

        if (!response.ok) {
          console.warn(`[Odds Tracker] Failed to fetch ${sport}: HTTP ${response.status}`);
          continue;
        }

        const games = await response.json();

        for (const game of games) {
          const snapshot = createOddsSnapshot(game);
          allSnapshots.push(snapshot);

          // Detect line movement signals
          const signals = await detectLineMovementSignals(snapshot);
          if (signals.length > 0) {
            console.log(`[Odds Tracker] Signals detected for ${game.id}:`, signals);
          }
        }

        console.log(`[Odds Tracker] Collected ${games.length} games for ${sport}`);
      } catch (error: any) {
        console.error(`[Odds Tracker] Error fetching ${sport}:`, error);
      }
    }

    // Store all snapshots
    await storeOddsSnapshots(allSnapshots);

    console.log(`[Odds Tracker] Completed: ${allSnapshots.length} game snapshots`);

    return NextResponse.json({
      success: true,
      gamesTracked: allSnapshots.length,
      sports,
      bookmakers: BOOKMAKERS,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[Odds Tracker] Error:', error);
    return NextResponse.json({
      success: false,
      error: error?.message || 'Failed to track odds',
    }, { status: 500 });
  }
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
            homeOdds: homeOutcome.price || -110,
            awayOdds: awayOutcome.price || -110,
          };
        }
      } else if (market.key === 'totals') {
        const overOutcome = market.outcomes?.find((o: any) => o.name === 'Over');
        const underOutcome = market.outcomes?.find((o: any) => o.name === 'Under');
        if (overOutcome && underOutcome) {
          bookData.totals = {
            line: overOutcome.point || 0,
            overOdds: overOutcome.price || -110,
            underOdds: underOutcome.price || -110,
          };
        }
      } else if (market.key === 'h2h') {
        const homeOutcome = market.outcomes?.find((o: any) => o.name === game.home_team);
        const awayOutcome = market.outcomes?.find((o: any) => o.name === game.away_team);
        if (homeOutcome && awayOutcome) {
          bookData.moneyline = {
            home: homeOutcome.price || -110,
            away: awayOutcome.price || -110,
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
  return null;
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

