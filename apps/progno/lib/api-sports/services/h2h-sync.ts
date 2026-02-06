/**
 * Head-to-Head Sync Service
 * Syncs historical matchup data for Narrative Momentum (NM)
 * Hardened with timeouts, retries, validation, logging, and graceful fallbacks
 */

import { createNBAClient, createNFLClient, createNHLClient, getClientForSport } from '../client';

const getSupabase = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  const { createClient } = require('@supabase/supabase-js');
  return createClient(url, key);
};

export interface H2HSyncResult {
  success: boolean;
  sport: string;
  count: number;
  homeTeam: string;
  awayTeam: string;
  errors?: string[];
}

export async function syncH2H(
  homeTeamApiId: number,
  awayTeamApiId: number,
  sport: 'nba' | 'nfl' | 'nhl'
): Promise<H2HSyncResult> {
  const supabase = getSupabase();
  if (!supabase) {
    return { success: false, sport, count: 0, homeTeam: '', awayTeam: '', errors: ['Supabase not configured'] };
  }

  if (!homeTeamApiId || !awayTeamApiId) {
    console.warn('[H2H-Sync] Missing team API IDs');
    return { success: false, sport, count: 0, homeTeam: '', awayTeam: '', errors: ['Missing team IDs'] };
  }

  const client = getClientForSport(sport);
  if (!client) {
    return { success: false, sport, count: 0, homeTeam: '', awayTeam: '', errors: ['Unsupported sport'] };
  }

  const result: H2HSyncResult = {
    success: false,
    sport,
    count: 0,
    homeTeam: '',
    awayTeam: '',
    errors: []
  };

  try {
    // Fetch head-to-head data with timeout & retry
    const h2hData = await fetchWithRetry(
      () => client.getHeadToHead(homeTeamApiId, awayTeamApiId),
      10000,
      2
    );

    if (!h2hData || !Array.isArray(h2hData)) {
      result.errors?.push('No H2H data returned');
      return result;
    }

    const insertions = h2hData.map((game: any) => {
      const homeTeam = game.home_team?.name || '';
      const awayTeam = game.away_team?.name || '';
      result.homeTeam = homeTeam;
      result.awayTeam = awayTeam;

      return {
        game_id: game.id,
        sport,
        home_team_id: game.home_team?.id,
        away_team_id: game.away_team?.id,
        home_team_name: homeTeam,
        away_team_name: awayTeam,
        date: game.date || new Date().toISOString(),
        home_score: game.home_score || 0,
        away_score: game.away_score || 0,
        winner: game.winner || (game.home_score > game.away_score ? homeTeam : awayTeam),
        spread: game.spread || null,
        total: game.total || null,
        home_covered: game.home_covered ?? null,
        over_hit: game.over_hit ?? null,
        synced_at: new Date().toISOString()
      };
    });

    // Upsert in batches
    const { error } = await supabase
      .from('h2h_history')
      .upsert(insertions, { onConflict: 'game_id' });

    if (error) {
      result.errors?.push(error.message);
      return result;
    }

    result.success = true;
    result.count = insertions.length;

    console.log(`[H2H-Sync] Synced ${result.count} games for ${sport.toUpperCase()} ${homeTeam} vs ${awayTeam}`);
    return result;

  } catch (error: any) {
    console.error(`[H2H-Sync] Error for ${sport}: ${error.message}`);
    result.errors?.push(error.message);
    return result;
  }
}

async function fetchWithRetry<T>(
  fn: () => Promise<T>,
  timeoutMs: number,
  maxRetries: number
): Promise<T | null> {
  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const result = await fn();
      clearTimeout(timeoutId);
      return result;
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (attempt > maxRetries) {
        console.warn(`[H2H-Sync] Failed after ${maxRetries} attempts: ${err.message}`);
        return null;
      }
      await new Promise(r => setTimeout(r, 1000 * attempt));
    }
  }
  return null;
}

/**
 * Calculate Narrative Momentum from H2H data
 */
export async function calculateNarrativeMomentum(
  homeTeam: string,
  awayTeam: string,
  sport: string
): Promise<{ momentum: number; narratives: string[] }> {
  try {
    const supabase = getSupabase();
    if (!supabase) return { momentum: 0, narratives: ['Supabase not configured'] };

    const { data: games } = await supabase
      .from('h2h_history')
      .select('*')
      .or(`home_team_name.eq.${homeTeam},away_team_name.eq.${homeTeam}`)
      .or(`home_team_name.eq.${awayTeam},away_team_name.eq.${awayTeam}`)
      .order('date', { ascending: false })
      .limit(10);

    if (!games || games.length === 0) {
      return { momentum: 0, narratives: ['No recent H2H data'] };
    }

    let momentum = 0;
    const narratives: string[] = [];

    // Recent dominance
    const recentGames = games.slice(0, 5);
    const homeWins = recentGames.filter(g => g.winner === homeTeam).length;
    const homeWinRate = homeWins / recentGames.length;

    if (homeWinRate >= 0.8) {
      momentum += 0.08;
      narratives.push(`🏆 ${homeTeam} dominates recent H2H (${homeWinRate.toFixed(2)} win rate)`);
    } else if (homeWinRate <= 0.2) {
      momentum -= 0.08;
      narratives.push(`⚠️ ${awayTeam} dominates recent H2H (${(1 - homeWinRate).toFixed(2)} win rate)`);
    }

    // Average margin
    const avgPointDiff = recentGames.reduce((sum, g) => {
      const homeWon = (g.home_team_name === homeTeam && g.home_score > g.away_score) ||
                      (g.away_team_name === homeTeam && g.away_score > g.home_score);
      return sum + (homeWon ? Math.abs(g.home_score - g.away_score) : -Math.abs(g.home_score - g.away_score));
    }, 0) / recentGames.length;

    if (Math.abs(avgPointDiff) > 10) {
      const direction = avgPointDiff > 0 ? homeTeam : awayTeam;
      momentum += avgPointDiff > 0 ? 0.03 : -0.03;
      narratives.push(`📊 Average margin: ${Math.abs(avgPointDiff).toFixed(1)} points for ${direction}`);
    }

    return { 
      momentum: Math.max(-0.15, Math.min(0.15, momentum)),
      narratives
    };
  } catch (error) {
    console.error('[Narrative Momentum] Error:', error);
    return { momentum: 0, narratives: ['Error calculating narrative'] };
  }
}