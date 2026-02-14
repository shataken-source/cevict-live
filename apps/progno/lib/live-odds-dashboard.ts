/**
 * Live Odds Dashboard Service
 * Integrates with NEW live_odds_dashboard migration
 * Captures odds, detects line movements (RLM, freezes, steam), sends alerts
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

let supabase: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (!supabase) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error('Supabase credentials missing for Live Odds Dashboard');
    }
    supabase = createClient(url, key);
  }
  return supabase;
}

// ============================================================================
// TYPES
// ============================================================================

export interface OddsSnapshot {
  game_id: string;
  league: string;
  home_team: string;
  away_team: string;
  game_time: Date;
  spread_home: number;
  spread_away: number;
  spread_home_odds: number;
  spread_away_odds: number;
  moneyline_home: number;
  moneyline_away: number;
  total_over: number;
  total_under: number;
  total_over_odds: number;
  total_under_odds: number;
  public_bet_pct_home?: number;
  public_bet_pct_over?: number;
  source: string;
}

export interface SharpMoneyAlert {
  game_id: string;
  alert_type: 'RLM' | 'line_freeze' | 'steam_move' | 'sharp_split';
  bet_type: 'spread' | 'moneyline' | 'total';
  sharp_side: string;
  is_reverse_line_movement: boolean;
  is_line_freeze: boolean;
  confidence_score: number;
  created_at: Date;
}

// ============================================================================
// CAPTURE ODDS SNAPSHOT
// ============================================================================

export async function captureOddsSnapshot(snapshot: OddsSnapshot): Promise<boolean> {
  try {
    const client = getClient();

    const { error } = await client.from('odds_snapshots').insert({
      game_id: snapshot.game_id,
      league: snapshot.league,
      home_team: snapshot.home_team,
      away_team: snapshot.away_team,
      game_time: snapshot.game_time.toISOString(),
      spread_home: snapshot.spread_home,
      spread_away: snapshot.spread_away,
      spread_home_odds: snapshot.spread_home_odds,
      spread_away_odds: snapshot.spread_away_odds,
      moneyline_home: snapshot.moneyline_home,
      moneyline_away: snapshot.moneyline_away,
      total_over: snapshot.total_over,
      total_under: snapshot.total_under,
      total_over_odds: snapshot.total_over_odds,
      total_under_odds: snapshot.total_under_odds,
      public_bet_pct_home: snapshot.public_bet_pct_home,
      public_bet_pct_over: snapshot.public_bet_pct_over,
      source: snapshot.source,
    });

    if (error) {
      console.error('❌ Error capturing odds snapshot:', error);
      return false;
    }

    return true;
  } catch (e: any) {
    console.error('❌ Exception capturing odds:', e.message);
    return false;
  }
}

// ============================================================================
// DETECT LINE MOVEMENTS
// ============================================================================

export async function detectLineMovements(gameId: string): Promise<SharpMoneyAlert[]> {
  try {
    const client = getClient();

    // Get last 2 snapshots for this game
    const { data, error } = await client
      .from('odds_snapshots')
      .select('*')
      .eq('game_id', gameId)
      .order('created_at', { ascending: false })
      .limit(2);

    if (error || !data || data.length < 2) {
      return [];
    }

    const [current, previous] = data;
    const alerts: SharpMoneyAlert[] = [];

    // SPREAD MOVEMENT
    if (current.spread_home !== previous.spread_home) {
      const spreadMove = current.spread_home - previous.spread_home;
      const publicPct = current.public_bet_pct_home || 50;
      
      // Check for RLM using PostgreSQL function
      const isRLM = await checkReverseLineMovement(
        gameId,
        previous.spread_home,
        current.spread_home,
        publicPct
      );

      if (isRLM) {
        alerts.push({
          game_id: gameId,
          alert_type: 'RLM',
          bet_type: 'spread',
          sharp_side: spreadMove > 0 ? current.away_team : current.home_team,
          is_reverse_line_movement: true,
          is_line_freeze: false,
          confidence_score: await calculateSharpConfidence(gameId, 'spread'),
          created_at: new Date(),
        });
      }
    }

    // TOTAL MOVEMENT
    if (current.total_over !== previous.total_over) {
      const totalMove = current.total_over - previous.total_over;
      const publicPct = current.public_bet_pct_over || 50;

      const isRLM = await checkReverseLineMovement(
        gameId,
        previous.total_over,
        current.total_over,
        publicPct
      );

      if (isRLM) {
        alerts.push({
          game_id: gameId,
          alert_type: 'RLM',
          bet_type: 'total',
          sharp_side: totalMove > 0 ? 'Over' : 'Under',
          is_reverse_line_movement: true,
          is_line_freeze: false,
          confidence_score: await calculateSharpConfidence(gameId, 'total'),
          created_at: new Date(),
        });
      }
    }

    // Save alerts to database
    if (alerts.length > 0) {
      await saveSharpMoneyAlerts(alerts);
    }

    return alerts;
  } catch (e: any) {
    console.error('❌ Exception detecting line movements:', e.message);
    return [];
  }
}

// ============================================================================
// CHECK REVERSE LINE MOVEMENT (Using PostgreSQL Function)
// ============================================================================

async function checkReverseLineMovement(
  gameId: string,
  oldLine: number,
  newLine: number,
  publicPct: number
): Promise<boolean> {
  try {
    const client = getClient();

    const { data, error } = await client.rpc('detect_reverse_line_movement', {
      p_game_id: gameId,
      p_old_line: oldLine,
      p_new_line: newLine,
      p_public_pct: publicPct,
    });

    if (error) {
      console.error('❌ Error checking RLM:', error);
      return false;
    }

    return Boolean(data);
  } catch (e: any) {
    console.error('❌ Exception checking RLM:', e.message);
    return false;
  }
}

// ============================================================================
// CALCULATE SHARP CONFIDENCE (Using PostgreSQL Function)
// ============================================================================

async function calculateSharpConfidence(gameId: string, betType: string): Promise<number> {
  try {
    const client = getClient();

    const { data, error } = await client.rpc('calculate_sharp_confidence', {
      p_game_id: gameId,
      p_bet_type: betType,
    });

    if (error) {
      console.error('❌ Error calculating confidence:', error);
      return 0;
    }

    return Number(data || 0);
  } catch (e: any) {
    console.error('❌ Exception calculating confidence:', e.message);
    return 0;
  }
}

// ============================================================================
// SAVE SHARP MONEY ALERTS
// ============================================================================

async function saveSharpMoneyAlerts(alerts: SharpMoneyAlert[]): Promise<boolean> {
  try {
    const client = getClient();

    const { error } = await client.from('sharp_money_alerts').insert(
      alerts.map(a => ({
        game_id: a.game_id,
        alert_type: a.alert_type,
        bet_type: a.bet_type,
        sharp_side: a.sharp_side,
        is_reverse_line_movement: a.is_reverse_line_movement,
        is_line_freeze: a.is_line_freeze,
        confidence_score: a.confidence_score,
      }))
    );

    if (error) {
      console.error('❌ Error saving alerts:', error);
      return false;
    }

    console.log(`✅ Saved ${alerts.length} sharp money alerts`);
    return true;
  } catch (e: any) {
    console.error('❌ Exception saving alerts:', e.message);
    return false;
  }
}

// ============================================================================
// GET RECENT ALERTS
// ============================================================================

export async function getRecentAlerts(hoursBack = 24, limit = 50): Promise<SharpMoneyAlert[]> {
  try {
    const client = getClient();

    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - hoursBack);

    const { data, error } = await client
      .from('sharp_money_alerts')
      .select('*')
      .gte('detected_at', cutoffTime.toISOString())
      .order('confidence_score', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('❌ Error fetching alerts:', error);
      return [];
    }

    return (data || []).map(d => ({
      game_id: d.game_id,
      alert_type: d.alert_type,
      bet_type: d.bet_type,
      sharp_side: d.sharp_side,
      is_reverse_line_movement: d.is_reverse_line_movement,
      is_line_freeze: d.is_line_freeze,
      confidence_score: Number(d.confidence_score || 0),
      created_at: new Date(d.detected_at),
    }));
  } catch (e: any) {
    console.error('❌ Exception fetching alerts:', e.message);
    return [];
  }
}

// ============================================================================
// CRON JOB: Capture Odds for All Upcoming Games
// ============================================================================

export async function captureAllOdds(oddsApiKey: string): Promise<number> {
  try {
    // Fetch odds from The Odds API
    const response = await fetch(
      `https://api.the-odds-api.com/v4/sports/americanfootball_nfl,basketball_nba,icehockey_nhl,americanfootball_ncaaf,basketball_ncaab,baseball_mlb/odds/?apiKey=${oddsApiKey}&regions=us&markets=spreads,h2h,totals`
    );

    if (!response.ok) {
      console.error(`❌ Odds API error: ${response.status}`);
      return 0;
    }

    const games = await response.json();
    let captured = 0;

    for (const game of games) {
      const homeTeam = game.home_team;
      const awayTeam = game.away_team;
      const gameTime = new Date(game.commence_time);
      const league = game.sport_key;

      // Extract odds (using first bookmaker for simplicity)
      const bookmaker = game.bookmakers?.[0];
      if (!bookmaker) continue;

      const spreads = bookmaker.markets.find((m: any) => m.key === 'spreads');
      const h2h = bookmaker.markets.find((m: any) => m.key === 'h2h');
      const totals = bookmaker.markets.find((m: any) => m.key === 'totals');

      if (!spreads || !h2h || !totals) continue;

      const snapshot: OddsSnapshot = {
        game_id: game.id,
        league,
        home_team: homeTeam,
        away_team: awayTeam,
        game_time: gameTime,
        spread_home: spreads.outcomes[0].point || 0,
        spread_away: spreads.outcomes[1].point || 0,
        spread_home_odds: spreads.outcomes[0].price || 0,
        spread_away_odds: spreads.outcomes[1].price || 0,
        moneyline_home: h2h.outcomes[0].price || 0,
        moneyline_away: h2h.outcomes[1].price || 0,
        total_over: totals.outcomes[0].point || 0,
        total_under: totals.outcomes[1].point || 0,
        total_over_odds: totals.outcomes[0].price || 0,
        total_under_odds: totals.outcomes[1].price || 0,
        source: bookmaker.key,
      };

      const success = await captureOddsSnapshot(snapshot);
      if (success) {
        captured++;
        // Check for line movements
        await detectLineMovements(game.id);
      }
    }

    console.log(`✅ Captured odds for ${captured} games`);
    return captured;
  } catch (e: any) {
    console.error('❌ Exception capturing all odds:', e.message);
    return 0;
  }
}

// ============================================================================
// EXPORT ALL FUNCTIONS
// ============================================================================

export const liveOddsDashboard = {
  captureOddsSnapshot,
  detectLineMovements,
  getRecentAlerts,
  captureAllOdds,
};
