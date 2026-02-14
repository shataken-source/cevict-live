/**
 * Live Score Integration Service
 * Real-time game updates for hedging and live betting
 */

import { createClient } from '@supabase/supabase-js';

export interface LiveGameScore {
  gameId: string;
  sport: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  quarter: string;
  timeRemaining: string;
  status: 'live' | 'halftime' | 'final' | 'upcoming';
  lastUpdate: string;
  possession?: string;
  spread?: number;
  total?: number;
}

export interface HedgeOpportunity {
  gameId: string;
  originalPick: string;
  currentScore: LiveGameScore;
  hedgeRecommendation: 'strong' | 'moderate' | 'weak' | 'none';
  hedgeAmount: number;
  potentialProfit: number;
  potentialLoss: number;
  reasoning: string;
}

export class LiveScoreService {
  private supabase: ReturnType<typeof createClient>;
  private activeGames: Map<string, LiveGameScore> = new Map();
  private updateInterval: NodeJS.Timeout | null = null;

  constructor() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) {
      throw new Error('Supabase credentials required');
    }
    this.supabase = createClient(url, key);
  }

  /**
   * Start live score polling
   */
  startLiveUpdates(intervalSeconds: number = 30): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }

    this.updateInterval = setInterval(async () => {
      await this.fetchLiveScores();
    }, intervalSeconds * 1000);

    // Initial fetch
    this.fetchLiveScores();
    console.log(`[LiveScore] Started live updates every ${intervalSeconds}s`);
  }

  /**
   * Stop live updates
   */
  stopLiveUpdates(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  /**
   * Fetch live scores from API
   */
  private async fetchLiveScores(): Promise<void> {
    try {
      // Try ESPN API first
      const response = await fetch(
        'https://site.api.espn.com/apis/v2/scoreboard?dates=' + new Date().toISOString().split('T')[0]
      );
      
      if (!response.ok) return;
      
      const data = await response.json();
      
      for (const event of data.events || []) {
        const game = this.parseESPNEvent(event);
        if (game) {
          this.activeGames.set(game.gameId, game);
          await this.updateGameInDatabase(game);
        }
      }
    } catch (error) {
      console.error('[LiveScore] Error fetching scores:', error);
    }
  }

  /**
   * Parse ESPN event data
   */
  private parseESPNEvent(event: any): LiveGameScore | null {
    try {
      const competitors = event.competitions?.[0]?.competitors || [];
      if (competitors.length < 2) return null;

      const home = competitors.find((c: any) => c.homeAway === 'home');
      const away = competitors.find((c: any) => c.homeAway === 'away');

      if (!home || !away) return null;

      const status = event.status?.type?.state || 'upcoming';
      const isLive = status === 'in';
      const isFinal = status === 'post';

      return {
        gameId: event.id,
        sport: event.competitions?.[0]?.league?.abbreviation || 'unknown',
        homeTeam: home.team?.displayName || home.team?.name,
        awayTeam: away.team?.displayName || away.team?.name,
        homeScore: parseInt(home.score) || 0,
        awayScore: parseInt(away.score) || 0,
        quarter: event.status?.period || '1',
        timeRemaining: event.status?.displayClock || '0:00',
        status: isLive ? 'live' : isFinal ? 'final' : 'upcoming',
        lastUpdate: new Date().toISOString(),
        possession: home.possession ? home.team?.abbreviation : away.possession ? away.team?.abbreviation : undefined,
      };
    } catch (e) {
      return null;
    }
  }

  /**
   * Update game score in Supabase
   */
  private async updateGameInDatabase(game: LiveGameScore): Promise<void> {
    const { error } = await this.supabase
      .from('live_games')
      .upsert({
        game_id: game.gameId,
        sport: game.sport,
        home_team: game.homeTeam,
        away_team: game.awayTeam,
        home_score: game.homeScore,
        away_score: game.awayScore,
        quarter: game.quarter,
        time_remaining: game.timeRemaining,
        status: game.status,
        last_update: game.lastUpdate,
        possession: game.possession,
      });

    if (error) {
      console.error('[LiveScore] Error updating database:', error);
    }
  }

  /**
   * Get current score for a game
   */
  getGameScore(gameId: string): LiveGameScore | undefined {
    return this.activeGames.get(gameId);
  }

  /**
   * Analyze hedge opportunity for an active pick
   */
  analyzeHedgeOpportunity(
    gameId: string,
    originalPick: string,
    originalOdds: number,
    stake: number,
    targetProfit?: number
  ): HedgeOpportunity | null {
    const score = this.activeGames.get(gameId);
    if (!score || score.status !== 'live') {
      return null;
    }

    const isHomeTeam = originalPick === score.homeTeam;
    const isWinning = isHomeTeam 
      ? score.homeScore > score.awayScore 
      : score.awayScore > score.homeScore;
    
    const isLosing = isHomeTeam 
      ? score.homeScore < score.awayScore 
      : score.awayScore > score.homeScore;

    const margin = Math.abs(score.homeScore - score.awayScore);
    const timeRemaining = this.parseTimeRemaining(score.timeRemaining);
    const quarter = parseInt(score.quarter) || 1;

    let hedgeRecommendation: HedgeOpportunity['hedgeRecommendation'] = 'none';
    let hedgeAmount = 0;
    let reasoning = '';

    // Strong hedge: Winning big with little time left
    if (isWinning && margin >= 10 && quarter >= 4 && timeRemaining <= 300) {
      hedgeRecommendation = 'strong';
      hedgeAmount = stake * 0.5;
      reasoning = `Up by ${margin} with ${score.timeRemaining} left - lock in profits`;
    }
    // Moderate hedge: Close game in final quarter
    else if (quarter >= 4 && Math.abs(margin) <= 7) {
      hedgeRecommendation = 'moderate';
      hedgeAmount = stake * 0.3;
      reasoning = `Close game (${score.homeScore}-${score.awayScore}) late - reduce variance`;
    }
    // Weak hedge: Losing but close
    else if (isLosing && margin <= 3 && quarter >= 3) {
      hedgeRecommendation = 'weak';
      hedgeAmount = stake * 0.2;
      reasoning = `Trailing by ${margin} - small hedge to minimize loss`;
    }

    if (hedgeRecommendation === 'none') {
      return null;
    }

    // Calculate P&L
    const originalPayout = stake * (originalOdds > 0 ? originalOdds / 100 : 100 / Math.abs(originalOdds));
    const potentialProfit = isWinning ? originalPayout - stake - hedgeAmount : -hedgeAmount;
    const potentialLoss = -stake + (hedgeAmount * 0.9); // Assuming -110 on hedge

    return {
      gameId,
      originalPick,
      currentScore: score,
      hedgeRecommendation,
      hedgeAmount: Math.round(hedgeAmount * 100) / 100,
      potentialProfit: Math.round(potentialProfit * 100) / 100,
      potentialLoss: Math.round(potentialLoss * 100) / 100,
      reasoning,
    };
  }

  /**
   * Get all active hedge opportunities
   */
  async getAllHedgeOpportunities(
    activePicks: Array<{
      gameId: string;
      pick: string;
      odds: number;
      stake: number;
    }>
  ): Promise<HedgeOpportunity[]> {
    const opportunities: HedgeOpportunity[] = [];

    for (const pick of activePicks) {
      const hedge = this.analyzeHedgeOpportunity(
        pick.gameId,
        pick.pick,
        pick.odds,
        pick.stake
      );

      if (hedge && hedge.hedgeRecommendation !== 'none') {
        opportunities.push(hedge);
      }
    }

    return opportunities.sort((a, b) => {
      const recOrder = { strong: 3, moderate: 2, weak: 1, none: 0 };
      return recOrder[b.hedgeRecommendation] - recOrder[a.hedgeRecommendation];
    });
  }

  /**
   * Subscribe to live score updates via WebSocket
   */
  subscribeToUpdates(
    gameIds: string[],
    callback: (game: LiveGameScore) => void
  ): () => void {
    const channel = this.supabase
      .channel('live-games')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'live_games',
          filter: `game_id=in.(${gameIds.join(',')})`,
        },
        (payload) => {
          const game = this.mapDatabaseToScore(payload.new);
          callback(game);
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }

  /**
   * Get games that are about to start (next 30 min)
   */
  async getUpcomingGames(): Promise<Array<{ gameId: string; startTime: string; teams: string }>> {
    const thirtyMinutesFromNow = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    
    const { data, error } = await this.supabase
      .from('live_games')
      .select('game_id, start_time, home_team, away_team')
      .eq('status', 'upcoming')
      .lte('start_time', thirtyMinutesFromNow)
      .order('start_time', { ascending: true });

    if (error || !data) return [];

    return data.map(g => ({
      gameId: g.game_id,
      startTime: g.start_time,
      teams: `${g.away_team} @ ${g.home_team}`,
    }));
  }

  private parseTimeRemaining(timeStr: string): number {
    const parts = timeStr.split(':');
    if (parts.length === 2) {
      return parseInt(parts[0]) * 60 + parseInt(parts[1]);
    }
    return 0;
  }

  private mapDatabaseToScore(data: any): LiveGameScore {
    return {
      gameId: data.game_id,
      sport: data.sport,
      homeTeam: data.home_team,
      awayTeam: data.away_team,
      homeScore: data.home_score,
      awayScore: data.away_score,
      quarter: data.quarter,
      timeRemaining: data.time_remaining,
      status: data.status,
      lastUpdate: data.last_update,
      possession: data.possession,
    };
  }
}

export default LiveScoreService;
