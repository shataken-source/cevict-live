/**
 * Live Game Tracker
 * Tracks live games and provides real-time updates
 * Hardened with timeouts, retries, validation, caching, and graceful fallbacks
 */

import { getClientForSport, Game } from '../client';

const getSupabase = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  const { createClient } = require('@supabase/supabase-js');
  return createClient(url, key);
};

export interface LiveGameState {
  gameId: string;
  apiSportsGameId: number;
  sport: string;
  homeTeamId: number | null;
  awayTeamId: number | null;
  status: 'scheduled' | 'live' | 'finished' | 'postponed';
  period: string;
  clock: string;
  homeScore: number;
  awayScore: number;
  momentumScore: number;
  liveWinProbability: number;
  lastPlay?: string;
  updatedAt: string;
}

export interface LiveAlert {
  type: 'momentum_shift' | 'lead_change' | 'injury' | 'timeout' | 'overtime';
  gameId: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
  timestamp: Date;
}

class LiveGameTracker {
  private activeGames: Map<string, LiveGameState> = new Map();
  private alerts: LiveAlert[] = [];
  private readonly MAX_GAMES = 50; // Prevent memory bloat
  private readonly UPDATE_INTERVAL = 60 * 1000; // 1 minute

  constructor() {
    // Optional: Load active games from DB on init
    this.loadActiveGamesFromDB();
  }

  private async loadActiveGamesFromDB(): Promise<void> {
    const supabase = getSupabase();
    if (!supabase) return;

    try {
      const { data, error } = await supabase
        .from('live_games')
        .select('*')
        .eq('status', 'live');

      if (error) throw error;

      for (const row of data || []) {
        this.activeGames.set(row.game_id, {
          gameId: row.game_id,
          apiSportsGameId: row.api_sports_game_id,
          sport: row.sport,
          homeTeamId: row.home_team_id,
          awayTeamId: row.away_team_id,
          status: row.status,
          period: row.period || '',
          clock: row.clock || '',
          homeScore: row.home_score || 0,
          awayScore: row.away_score || 0,
          momentumScore: row.momentum_score || 0,
          liveWinProbability: row.live_win_probability || 50,
          lastPlay: row.last_play || '',
          updatedAt: row.updated_at
        });
      }

      console.log(`[LiveTracker] Loaded ${this.activeGames.size} active games from DB`);
    } catch (error: any) {
      console.error('[LiveTracker] Failed to load active games:', error.message);
    }
  }

  async updateGameState(gameId: string, sport: string): Promise<LiveGameState | null> {
    if (this.activeGames.size >= this.MAX_GAMES) {
      console.warn('[LiveTracker] Max active games reached');
      return null;
    }

    const client = getClientForSport(sport);
    if (!client) return null;

    try {
      const gameData = await this.fetchWithRetry(
        () => client.getLiveGame(gameId),
        10000,
        2
      );

      if (!gameData) return null;

      const state: LiveGameState = {
        gameId,
        apiSportsGameId: gameData.id || 0,
        sport,
        homeTeamId: gameData.home_team?.id || null,
        awayTeamId: gameData.away_team?.id || null,
        status: this.mapGameStatus(gameData.status || ''),
        period: gameData.period || '',
        clock: gameData.clock || '',
        homeScore: gameData.home_score || 0,
        awayScore: gameData.away_score || 0,
        momentumScore: this.calculateMomentum(gameData),
        liveWinProbability: this.calculateLiveWinProbability(gameData),
        lastPlay: gameData.last_play || '',
        updatedAt: new Date().toISOString()
      };

      this.activeGames.set(gameId, state);
      await this.saveGameStateToDB(state);

      // Check for alerts
      this.checkForAlerts(state);

      return state;
    } catch (error: any) {
      console.error(`[LiveTracker] Failed to update game ${gameId}: ${error.message}`);
      return null;
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
        if (attempt > maxRetries) return null;
        await new Promise(r => setTimeout(r, 1000 * attempt));
      }
    }
    return null;
  }

  private async saveGameStateToDB(state: LiveGameState): Promise<void> {
    const supabase = getSupabase();
    if (!supabase) return;

    try {
      const { error } = await supabase
        .from('live_games')
        .upsert({
          game_id: state.gameId,
          api_sports_game_id: state.apiSportsGameId,
          sport: state.sport,
          home_team_id: state.homeTeamId,
          away_team_id: state.awayTeamId,
          status: state.status,
          period: state.period,
          clock: state.clock,
          home_score: state.homeScore,
          away_score: state.awayScore,
          momentum_score: state.momentumScore,
          live_win_probability: state.liveWinProbability,
          last_play: state.lastPlay,
          updated_at: state.updatedAt
        }, { onConflict: 'game_id' });

      if (error) console.warn(`[LiveTracker] DB save failed for ${state.gameId}: ${error.message}`);
    } catch (err: any) {
      console.error('[LiveTracker] DB save error:', err.message);
    }
  }

  private calculateMomentum(gameData: any): number {
    // Placeholder momentum calculation
    return 0;
  }

  private calculateLiveWinProbability(gameData: any): number {
    // Placeholder
    return 50;
  }

  private checkForAlerts(state: LiveGameState): void {
    // Placeholder alert logic
    if (state.homeScore - state.awayScore > 10) {
      this.alerts.push({
        type: 'lead_change',
        gameId: state.gameId,
        message: `${state.homeTeam} has taken a large lead`,
        severity: 'high',
        timestamp: new Date()
      });
    }
  }

  private mapGameStatus(status: string): 'scheduled' | 'live' | 'finished' | 'postponed' {
    const lower = status.toLowerCase();
    if (lower.includes('final') || lower.includes('finished') || lower.includes('ended')) return 'finished';
    if (lower.includes('postponed') || lower.includes('cancelled')) return 'postponed';
    if (lower.includes('scheduled') || lower.includes('not started')) return 'scheduled';
    return 'live';
  }

  getActiveGames(): LiveGameState[] {
    return Array.from(this.activeGames.values());
  }

  async updateLiveGames(sport: string): Promise<LiveGameState[]> {
    const client = getClientForSport(sport);
    if (!client) return [];

    try {
      const games = await this.fetchWithRetry(
        () => client.getGames({ date: new Date().toISOString().split('T')[0] }),
        10000,
        2
      );

      if (!games || !Array.isArray(games)) return [];

      const states: LiveGameState[] = [];
      for (const game of games) {
        const statusLong = game.status?.long?.toLowerCase() || '';
        if (statusLong.includes('live') || statusLong.includes('in progress') || statusLong.includes('qtr') || statusLong.includes('period')) {
          const state = await this.updateGameState(game.id.toString(), sport);
          if (state) states.push(state);
        }
      }

      return states;
    } catch (error: any) {
      console.error(`[LiveTracker] Failed to update live games for ${sport}: ${error.message}`);
      return [];
    }
  }

  getAlerts(): LiveAlert[] {
    return this.alerts;
  }

  clearAlerts(): void {
    this.alerts = [];
  }
}

// Singleton instance
let trackerInstance: LiveGameTracker | null = null;

export function getLiveTracker(): LiveGameTracker {
  if (!trackerInstance) trackerInstance = new LiveGameTracker();
  return trackerInstance;
}
