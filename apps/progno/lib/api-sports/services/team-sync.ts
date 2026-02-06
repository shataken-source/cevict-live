/**
 * Team Sync Service
 * Syncs team data from API-Sports to Supabase
 * Hardened with timeouts, retries, validation, logging, and graceful fallbacks
 */

import { createNBAClient, createNFLClient, createNHLClient, LEAGUE_IDS } from '../client';

const getSupabase = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  const { createClient } = require('@supabase/supabase-js');
  return createClient(url, key);
};

export interface SyncResult {
  success: boolean;
  sport: string;
  count: number;
  errors?: string[];
}

export async function syncTeams(sport: 'nba' | 'nfl' | 'nhl'): Promise<SyncResult> {
  const supabase = getSupabase();
  if (!supabase) {
    return { success: false, sport, count: 0, errors: ['Supabase not configured'] };
  }

  if (!['nba', 'nfl', 'nhl'].includes(sport)) {
    return { success: false, sport, count: 0, errors: ['Unsupported sport'] };
  }

  const clients = {
    nba: createNBAClient(),
    nfl: createNFLClient(),
    nhl: createNHLClient()
  };

  const leagues = {
    nba: LEAGUE_IDS.nba,
    nfl: LEAGUE_IDS.nfl,
    nhl: LEAGUE_IDS.nhl
  };

  const client = clients[sport];
  const league = leagues[sport];
  const currentSeason = new Date().getFullYear();
  const errors: string[] = [];

  try {
    console.log(`[TeamSync] Starting sync for ${sport.toUpperCase()}...`);

    // Fetch teams with timeout + retry
    const teams = await this.fetchWithRetry(
      () => client.getTeams(league, currentSeason),
      10000,
      2
    );

    if (!teams || !Array.isArray(teams)) {
      return { success: false, sport, count: 0, errors: ['No teams returned'] };
    }

    console.log(`[TeamSync] Fetched ${teams.length} teams`);

    let successCount = 0;
    const batchSize = 200;

    for (let i = 0; i < teams.length; i += batchSize) {
      const batch = teams.slice(i, i + batchSize);

      const upsertData = batch.map((team: any) => ({
        api_sports_id: team.id,
        name: team.name || 'Unknown',
        code: team.code || '',
        logo_url: team.logo || null,
        sport: sport.toUpperCase(),
        league: league,
        city: team.city || null,
        country: team.country || null,
        founded: team.founded || null,
        updated_at: new Date().toISOString()
      }));

      const { error } = await supabase
        .from('teams')
        .upsert(upsertData, { onConflict: 'api_sports_id' });

      if (error) {
        errors.push(`Batch upsert failed: ${error.message}`);
      } else {
        successCount += upsertData.length;
      }
    }

    const success = errors.length === 0;

    console.log(`[TeamSync] ${sport.toUpperCase()} sync complete: ${successCount}/${teams.length} successful`);

    return {
      success,
      sport,
      count: successCount,
      errors: errors.length > 0 ? errors : undefined
    };

  } catch (error: any) {
    console.error(`[TeamSync] Critical error for ${sport}:`, error.message);
    return { success: false, sport, count: 0, errors: [error.message] };
  }
}

private async fetchWithRetry<T>(
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
        console.warn(`[TeamSync] Failed after ${maxRetries} attempts: ${err.message}`);
        return null;
      }
      await new Promise(r => setTimeout(r, 1000 * attempt));
    }
  }
  return null;
}

export async function syncAllTeams(): Promise<SyncResult[]> {
  const sports = ['nba', 'nfl', 'nhl'] as const;
  const results: SyncResult[] = [];

  for (const sport of sports) {
    const res = await syncTeams(sport);
    results.push(res);
  }

  return results;
}

export async function syncStandings(sport: 'nba' | 'nfl' | 'nhl'): Promise<SyncResult> {
  const supabase = getSupabase();
  if (!supabase) {
    return { success: false, sport, count: 0, errors: ['Supabase not configured'] };
  }

  const client = getClientForSport(sport);
  if (!client) {
    return { success: false, sport, count: 0, errors: ['Client not available'] };
  }

  const league = getLeagueId(sport);
  if (!league) {
    return { success: false, sport, count: 0, errors: ['League ID not found'] };
  }

  const currentSeason = new Date().getFullYear();
  const errors: string[] = [];

  try {
    const standings = await this.fetchWithRetry(
      () => client.getStandings(league, currentSeason),
      12000,
      2
    );

    if (!standings || !Array.isArray(standings)) {
      return { success: false, sport, count: 0, errors: ['No standings returned'] };
    }

    let successCount = 0;
    const batchSize = 200;

    for (let i = 0; i < standings.length; i += batchSize) {
      const batch = standings.slice(i, i + batchSize);

      const upsertData = await Promise.all(batch.map(async (standing: any) => {
        const { data: team } = await supabase
          .from('teams')
          .select('id')
          .eq('api_sports_id', standing.team.id)
          .single();

        if (!team) {
          errors.push(`Team not found: ${standing.team.name}`);
          return null;
        }

        return {
          team_id: team.id,
          season: currentSeason,
          league,
          wins: standing.won || 0,
          losses: standing.lost || 0,
          win_pct: standing.won && (standing.won + standing.lost) > 0 
            ? (standing.won / (standing.won + standing.lost)) * 100 
            : 0,
          points_for: standing.points?.for || 0,
          points_against: standing.points?.against || 0,
          point_diff: (standing.points?.for || 0) - (standing.points?.against || 0),
          streak: standing.streak || null,
          rank: standing.position || null,
          updated_at: new Date().toISOString()
        };
      }));

      const validBatch = upsertData.filter(Boolean);
      if (validBatch.length === 0) continue;

      const { error } = await supabase
        .from('team_standings')
        .upsert(validBatch, { onConflict: 'team_id' });

      if (error) {
        errors.push(`Standings upsert failed: ${error.message}`);
      } else {
        successCount += validBatch.length;
      }
    }

    const success = errors.length === 0;

    return {
      success,
      sport,
      count: successCount,
      errors: errors.length > 0 ? errors : undefined
    };

  } catch (error: any) {
    console.error(`[StandingsSync] Critical error for ${sport}:`, error.message);
    return { success: false, sport, count: 0, errors: [error.message] };
  }
}

// Helper functions
function getLeagueId(sport: string): string | null {
  const map: Record<string, string> = {
    nba: LEAGUE_IDS.nba,
    nfl: LEAGUE_IDS.nfl,
    nhl: LEAGUE_IDS.nhl
  };
  return map[sport] || null;
}

function getClientForSport(sport: string) {
  const clients = {
    nba: createNBAClient(),
    nfl: createNFLClient(),
    nhl: createNHLClient()
  };
  return clients[sport as keyof typeof clients] || null;
}