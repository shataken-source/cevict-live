import { createClient } from '@supabase/supabase-js';
import { OddsCacheRecord, GameOdds, OddsSyncResult, SYNC_SPORTS } from './odds-cache.types';
import { fetchApiSportsOdds } from './api-sports-client';

let supabase: ReturnType<typeof createClient> | null = null;

function getSupabase() {
  if (!supabase) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

    if (!url || !key) {
      console.error('[OddsCache] Missing Supabase credentials:', { url: !!url, key: !!key });
      return null;
    }

    console.log('[OddsCache] Initializing with URL:', url);
    console.log('[OddsCache] Key prefix:', key.substring(0, 20) + '...');
    console.log('[OddsCache] Key length:', key.length);

    supabase = createClient(url, key);
    console.log('[OddsCache] Supabase client initialized');
  }
  return supabase;
}

export class OddsCacheService {
  /**
   * Check if odds exist for a given sport and date
   */
  static async hasOddsForDate(sport: string, date: string): Promise<boolean> {
    const client = getSupabase();
    if (!client) return false;

    const { data, error } = await client
      .from('odds_cache')
      .select('id')
      .eq('sport', sport.toLowerCase())
      .eq('game_date', date)
      .limit(1);

    if (error) {
      console.error('[OddsCache] Error checking for odds:', error);
      return false;
    }

    return data && data.length > 0;
  }

  /**
   * Get cached odds for a sport and date
   */
  static async getOddsForDate(sport: string, date: string): Promise<GameOdds[]> {
    const client = getSupabase();
    if (!client) return [];

    const { data, error } = await client
      .from('odds_cache')
      .select('*')
      .eq('sport', sport.toLowerCase())
      .eq('game_date', date)
      .order('commence_time', { ascending: true });

    if (error) {
      console.error('[OddsCache] Error fetching odds:', error);
      return [];
    }

    return (data || []).map(this.convertRecordToGameOdds);
  }

  /**
   * Get cached odds for a sport (today by default)
   */
  static async getOdds(sport: string, date?: string): Promise<GameOdds[]> {
    const queryDate = date || new Date().toISOString().split('T')[0];

    // Check if we have cached odds
    const hasCached = await this.hasOddsForDate(sport, queryDate);

    if (!hasCached) {
      console.log(`[OddsCache] No cached odds for ${sport} on ${queryDate}, syncing...`);
      await this.syncOddsForSport(sport, queryDate);
    }

    return this.getOddsForDate(sport, queryDate);
  }

  /**
   * Check if odds are stale (>24 hours old)
   */
  static async isOddsStale(sport: string): Promise<boolean> {
    const client = getSupabase();
    if (!client) return true;

    const { data, error } = await client
      .from('odds_cache')
      .select('fetched_at')
      .eq('sport', sport.toLowerCase())
      .order('fetched_at', { ascending: false })
      .limit(1);

    if (error) {
      console.error('[OddsCache] Error checking odds freshness:', error);
      return true; // Assume stale if error
    }

    if (!data || data.length === 0) {
      return true; // No odds exist, consider stale
    }

    const lastFetch = new Date(data[0].fetched_at);
    const now = new Date();
    const hoursDiff = (now.getTime() - lastFetch.getTime()) / (1000 * 60 * 60);

    console.log(`[OddsCache] Last fetch for ${sport}: ${hoursDiff.toFixed(1)} hours ago`);

    return hoursDiff > 24;
  }

  /**
   * Get odds with 24-hour freshness check
   * If data is stale, fetches fresh odds and writes to Supabase
   */
  static async getOddsWithFreshness(sport: string, date?: string): Promise<GameOdds[]> {
    const queryDate = date || new Date().toISOString().split('T')[0];

    // Check if odds are stale (>24 hours)
    const isStale = await this.isOddsStale(sport);

    if (isStale) {
      console.log(`[OddsCache] Odds for ${sport} are stale (>24h), fetching fresh...`);
      await this.syncOddsForSport(sport, queryDate);
    } else {
      console.log(`[OddsCache] Odds for ${sport} are fresh (<24h), using cache`);
    }

    return this.getOddsForDate(sport, queryDate);
  }

  /**
   * Startup check: refresh all sports if any are stale
   */
  static async startupSync(): Promise<{ synced: string[]; skipped: string[] }> {
    console.log('[OddsCache] Running startup freshness check...');
    const synced: string[] = [];
    const skipped: string[] = [];

    for (const sport of SYNC_SPORTS) {
      const isStale = await this.isOddsStale(sport.alias);

      if (isStale) {
        console.log(`[OddsCache] ${sport.alias} is stale, syncing...`);
        await this.syncOddsForSport(sport.alias);
        synced.push(sport.alias);
      } else {
        skipped.push(sport.alias);
      }

      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    console.log(`[OddsCache] Startup sync complete: ${synced.length} synced, ${skipped.length} skipped`);
    return { synced, skipped };
  }

  static async syncOddsForSport(sport: string, date: string): Promise<OddsSyncResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    let gamesInserted = 0;
    let gamesUpdated = 0;

    console.log(`[OddsCache] Starting sync for ${sport} on ${date}...`);

    try {
      // Fetch from API-SPORTS (primary source)
      const games = await fetchApiSportsOdds(sport, date);

      if (games.length === 0) {
        console.log(`[OddsCache] No games found for ${sport}`);
        return {
          sport,
          date,
          gamesInserted: 0,
          gamesUpdated: 0,
          errors: ['No games found'],
          duration: Date.now() - startTime,
        };
      }

      // Process each game
      for (const game of games) {
        try {
          const record = this.convertGameToRecord(game, sport, date);

          // Try to insert, if duplicate then update
          const { error: insertError } = await getSupabase()
            .from('odds_cache')
            .insert(record);

          if (insertError) {
            if (insertError.code === '23505') { // Duplicate key
              // Update existing
              const { error: updateError } = await getSupabase()
                .from('odds_cache')
                .update({
                  ...record,
                  updated_at: new Date().toISOString(),
                })
                .eq('external_id', record.external_id)
                .eq('game_date', date)
                .eq('source', record.source);

              if (updateError) {
                errors.push(`Update failed for ${game.id}: ${updateError.message}`);
              } else {
                gamesUpdated++;
              }
            } else {
              errors.push(`Insert failed for ${game.id}: ${insertError.message}`);
            }
          } else {
            gamesInserted++;
          }
        } catch (e) {
          errors.push(`Processing failed for ${game.id}: ${e}`);
        }
      }

      const duration = Date.now() - startTime;
      console.log(`[OddsCache] Sync complete for ${sport}: ${gamesInserted} inserted, ${gamesUpdated} updated in ${duration}ms`);

      return {
        sport,
        date,
        gamesInserted,
        gamesUpdated,
        errors,
        duration,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`[OddsCache] Sync failed for ${sport}:`, error);
      return {
        sport,
        date,
        gamesInserted: 0,
        gamesUpdated: 0,
        errors: [`Sync failed: ${error}`],
        duration,
      };
    }
  }

  /**
   * Sync all sports for today
   */
  static async syncAllSports(date?: string): Promise<OddsSyncResult[]> {
    const queryDate = date || new Date().toISOString().split('T')[0];
    const results: OddsSyncResult[] = [];

    console.log(`[OddsCache] Starting full sync for ${queryDate}...`);

    for (const sport of SYNC_SPORTS) {
      const result = await this.syncOddsForSport(sport.alias, queryDate);
      results.push(result);

      // Small delay between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    const totalInserted = results.reduce((sum, r) => sum + r.gamesInserted, 0);
    const totalUpdated = results.reduce((sum, r) => sum + r.gamesUpdated, 0);
    const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);

    console.log(`[OddsCache] Full sync complete: ${totalInserted} inserted, ${totalUpdated} updated, ${totalErrors} errors`);

    return results;
  }

  /**
   * Check if daily sync is needed and run if so
   */
  static async checkAndSync(): Promise<boolean> {
    const today = new Date().toISOString().split('T')[0];

    // Check if we have any odds for today
    const hasAnyOdds = await this.hasOddsForDate('nhl', today);

    if (hasAnyOdds) {
      console.log('[OddsCache] Already synced for today, skipping...');
      return false;
    }

    console.log('[OddsCache] No odds found for today, starting sync...');
    await this.syncAllSports(today);
    return true;
  }

  /**
   * Save pre-fetched games to cache (for The-Odds API results)
   */
  static async saveGames(sport: string, date: string, games: any[]): Promise<{ inserted: number; updated: number; errors: string[] }> {
    const errors: string[] = [];
    let inserted = 0;
    let updated = 0;

    console.log(`[OddsCache] Saving ${games.length} pre-fetched games for ${sport} on ${date}...`);

    for (const game of games) {
      try {
        const record = this.convertGameToRecord(game, sport, date);

        // Try to insert, if duplicate then update
        const { error: insertError } = await getSupabase()
          .from('odds_cache')
          .insert(record);

        if (insertError) {
          if (insertError.code === '23505') { // Duplicate key
            // Update existing
            const { error: updateError } = await getSupabase()
              .from('odds_cache')
              .update({
                ...record,
                updated_at: new Date().toISOString(),
              })
              .eq('external_id', record.external_id)
              .eq('game_date', date)
              .eq('source', record.source);

            if (updateError) {
              errors.push(`Update failed for ${game.id}: ${updateError.message}`);
            } else {
              updated++;
            }
          } else {
            errors.push(`Insert failed for ${game.id}: ${insertError.message}`);
          }
        } else {
          inserted++;
        }
      } catch (e) {
        errors.push(`Processing failed for ${game.id}: ${e}`);
      }
    }

    console.log(`[OddsCache] Saved ${inserted} new, updated ${updated} games for ${sport}`);
    return { inserted, updated, errors };
  }

  /**
   * Convert database record to GameOdds
   */
  private static convertRecordToGameOdds(record: OddsCacheRecord): GameOdds {
    return {
      id: record.id,
      external_id: record.external_id,
      sport: record.sport,
      homeTeam: record.home_team,
      awayTeam: record.away_team,
      homeTeamNormalized: record.home_team_normalized,
      awayTeamNormalized: record.away_team_normalized,
      startTime: record.commence_time,
      gameDate: record.game_date,
      venue: record.venue,
      odds: record.odds_data as any,
      source: record.source,
      bookmaker: record.bookmaker,
      fetchedAt: record.fetched_at,
    };
  }

  /**
   * Convert GameOdds to database record
   */
  private static convertGameToRecord(game: any, sport: string, date: string): Partial<OddsCacheRecord> {
    const now = new Date().toISOString();

    return {
      external_id: game.id,
      sport: sport.toLowerCase(),
      sport_key: game.sport_key || sport,
      home_team: game.homeTeam || game.home_team,
      away_team: game.awayTeam || game.away_team,
      home_team_normalized: game.homeTeamNormalized,
      away_team_normalized: game.awayTeamNormalized,
      commence_time: game.startTime || game.commence_time,
      game_date: date,
      venue: game.venue,
      odds_data: game.odds || {},
      home_moneyline: game.odds?.moneyline?.home || null,
      away_moneyline: game.odds?.moneyline?.away || null,
      home_spread: game.odds?.spread?.home || null,
      away_spread: game.odds?.spread?.away || null,
      spread_line: game.odds?.spread?.line || null,
      over_line: game.odds?.total?.over || null,
      under_line: game.odds?.total?.under || null,
      total_line: game.odds?.total?.line || null,
      source: game.source || 'api-sports',
      bookmaker: game.bookmaker,
      fetched_at: now,
      updated_at: now,
    };
  }

  /**
   * Get sync statistics
   */
  static async getStats(): Promise<{
    totalGames: number;
    oldestOdds: string | null;
    newestOdds: string | null;
    sports: { sport: string; count: number }[];
  }> {
    const { data: count, error: countError } = await getSupabase()
      .from('odds_cache')
      .select('*', { count: 'exact', head: true });

    const { data: dates, error: datesError } = await getSupabase()
      .from('odds_cache')
      .select('game_date')
      .order('game_date', { ascending: true })
      .limit(1);

    const { data: newest, error: newestError } = await getSupabase()
      .from('odds_cache')
      .select('game_date')
      .order('game_date', { ascending: false })
      .limit(1);

    const { data: bySport, error: sportError } = await getSupabase()
      .rpc('get_odds_count_by_sport');

    return {
      totalGames: count?.length || 0,
      oldestOdds: dates?.[0]?.game_date || null,
      newestOdds: newest?.[0]?.game_date || null,
      sports: bySport || [],
    };
  }
}

// Export singleton instance methods for convenience
export const oddsCache = {
  hasOddsForDate: OddsCacheService.hasOddsForDate.bind(OddsCacheService),
  getOdds: OddsCacheService.getOdds.bind(OddsCacheService),
  syncOddsForSport: OddsCacheService.syncOddsForSport.bind(OddsCacheService),
  syncAllSports: OddsCacheService.syncAllSports.bind(OddsCacheService),
  checkAndSync: OddsCacheService.checkAndSync.bind(OddsCacheService),
  getStats: OddsCacheService.getStats.bind(OddsCacheService),
  isOddsStale: OddsCacheService.isOddsStale.bind(OddsCacheService),
  getOddsWithFreshness: OddsCacheService.getOddsWithFreshness.bind(OddsCacheService),
  startupSync: OddsCacheService.startupSync.bind(OddsCacheService),
  saveGames: OddsCacheService.saveGames.bind(OddsCacheService),
};
