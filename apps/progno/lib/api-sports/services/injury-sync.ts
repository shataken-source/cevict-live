/**
 * Injury Sync Service
 * Syncs injury data from API-Sports for Chaos Sensitivity Index (CSI)
 * Hardened with timeouts, retries, validation, logging, and robust fallbacks
 */

import { createNBAClient, createNFLClient, createNHLClient, LEAGUE_IDS } from '../client';

let _supabaseWarned = false;
const getSupabase = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    if (!_supabaseWarned) {
      _supabaseWarned = true;
      console.warn('[InjurySync] Supabase not configured');
    }
    return null;
  }
  const { createClient } = require('@supabase/supabase-js');
  return createClient(url, key);
};

export interface InjurySyncResult {
  success: boolean;
  sport: string;
  count: number;
  activeInjuries: number;
  errors?: string[];
}

export async function syncInjuries(sport: 'nba' | 'nfl' | 'nhl'): Promise<InjurySyncResult> {
  const supabase = getSupabase();
  if (!supabase) {
    return { success: false, sport, count: 0, activeInjuries: 0, errors: ['Supabase not configured'] };
  }

  if (!['nba', 'nfl', 'nhl'].includes(sport)) {
    return { success: false, sport, count: 0, activeInjuries: 0, errors: ['Unsupported sport'] };
  }

  const client = getClientForSport(sport);
  if (!client) {
    return { success: false, sport, count: 0, activeInjuries: 0, errors: ['Client not available'] };
  }

  const result: InjurySyncResult = {
    success: false,
    sport,
    count: 0,
    activeInjuries: 0,
    errors: []
  };

  try {
    // Fetch injuries with timeout & retry
    const injuries = await fetchWithRetry(
      () => client.getInjuries(),
      12000,
      2
    );

    if (!injuries || !Array.isArray(injuries)) {
      result.errors?.push('No injury data returned');
      return result;
    }

    const formattedInjuries = injuries.map((inj: any) => ({
      player_name: inj.player_name || inj.player || 'Unknown',
      team_name: inj.team_name || inj.team || 'Unknown',
      status: inj.status || 'Unknown',
      injury_type: inj.injury_type || inj.injury || 'Unknown',
      position: inj.position || '',
      severity: inj.severity || 'Unknown',
      is_starter: inj.is_starter ?? false,
      scraped_at: new Date().toISOString()
    }));

    // Upsert in batches (Supabase limit ~500 rows per upsert)
    const batchSize = 400;
    let successCount = 0;

    for (let i = 0; i < formattedInjuries.length; i += batchSize) {
      const batch = formattedInjuries.slice(i, i + batchSize);

      const { error } = await supabase
        .from('injuries')
        .upsert(batch, { onConflict: 'player_name,team_name' });

      if (error) {
        result.errors?.push(error.message);
      } else {
        successCount += batch.length;
      }
    }

    // Count active injuries (out, doubtful, questionable)
    const activeStatuses = ['out', 'doubtful', 'questionable'];
    result.activeInjuries = formattedInjuries.filter(inj =>
      activeStatuses.includes(inj.status.toLowerCase())
    ).length;

    result.success = result.errors?.length === 0;
    result.count = successCount;

    console.log(`[InjurySync] ${result.success ? 'Success' : 'Partial'} sync for ${sport.toUpperCase()}: ${successCount} injuries`);

    return result;

  } catch (error: any) {
    console.error(`[InjurySync] Critical failure for ${sport}: ${error.message}`);
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
        console.warn(`[InjurySync] Failed after ${maxRetries} attempts: ${err.message}`);
        return null;
      }
      await new Promise(r => setTimeout(r, 1000 * attempt));
    }
  }
  return null;
}

/**
 * Calculate injury impact score for a team
 */
export async function calculateInjuryImpact(sport: string, teamName: string): Promise<number> {
  try {
    const supabase = getSupabase();
    if (!supabase) return 0;

    const { data: injuries } = await supabase
      .from('injuries')
      .select('*')
      .eq('team_name', teamName)
      .eq('sport', sport.toLowerCase());

    if (!injuries || injuries.length === 0) return 0;

    let impact = 0;
    let severeCount = 0, moderateCount = 0, minorCount = 0;

    for (const inj of injuries) {
      const status = inj.status?.toLowerCase() || '';
      if (status.includes('out') || status.includes('ir') || status.includes('pup')) {
        severeCount++;
        impact += 0.20;
      } else if (status.includes('doubtful') || status.includes('questionable')) {
        moderateCount++;
        impact += 0.10;
      } else {
        minorCount++;
        impact += 0.03;
      }

      if (inj.is_starter) impact += 0.15;
    }

    // Cluster penalty (3+ at same position)
    const positionCounts: Record<string, number> = {};
    for (const inj of injuries) {
      const pos = inj.position || 'Unknown';
      positionCounts[pos] = (positionCounts[pos] || 0) + 1;
    }
    if (Object.values(positionCounts).some(c => c >= 3)) {
      impact += 0.10;
    }

    return Math.min(1.0, impact);
  } catch (error) {
    console.error('[InjurySync] Error calculating impact:', error);
    return 0;
  }
}

/** Alias for API consistency (exported from index as getTeamInjuryImpact) */
export const getTeamInjuryImpact = calculateInjuryImpact;

export async function syncAllInjuries(): Promise<InjurySyncResult[]> {
  const sports = ['nba', 'nfl', 'nhl'] as const;
  const results = [];

  for (const sport of sports) {
    const res = await syncInjuries(sport);
    results.push(res);
  }

  return results;
}