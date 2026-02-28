/**
 * Live Betting Monitor Service
 * Monitors live games for value opportunities and hedging
 */

export interface LiveGameState {
  gameId: string;
  sport: string;
  status: 'in_progress' | 'halftime' | 'finished';
  quarter: number;
  timeRemaining: number; // seconds
  homeScore: number;
  awayScore: number;
  momentum: number; // -1 to 1, positive favors home
  liveOdds: {
    moneyline: { home: number; away: number };
    spread: { line: number; home: number; away: number };
    total: { line: number; over: number; under: number };
  };
  lastUpdated: string;
}

export interface LiveValueOpportunity {
  gameId: string;
  type: 'live_entry' | 'hedge' | 'middle';
  pregamePick: string;
  recommendation: string;
  currentOdds: number;
  pregameOdds: number;
  valuePercent: number;
  urgency: 'now' | 'soon' | 'watch';
  reason: string;
}

export class LiveBettingMonitor {
  private games: Map<string, LiveGameState> = new Map();
  private pregamePicks: Map<string, { pick: string; odds: number }> = new Map();

  /**
   * Register a pregame pick for monitoring
   */
  registerPregamePick(
    gameId: string,
    pick: string,
    odds: number
  ): void {
    this.pregamePicks.set(gameId, { pick, odds });
  }

  /**
   * Update live game state
   */
  updateGameState(state: LiveGameState): void {
    this.games.set(state.gameId, state);
    this.analyzeOpportunities(state);
  }

  /**
   * Analyze live betting opportunities
   */
  analyzeOpportunities(state: LiveGameState): LiveValueOpportunity[] {
    const opportunities: LiveValueOpportunity[] = [];
    const pregame = this.pregamePicks.get(state.gameId);

    if (!pregame) return opportunities;

    // Check for hedge opportunity
    const hedge = this.checkHedgeOpportunity(state, pregame);
    if (hedge) opportunities.push(hedge);

    // Check for live entry
    const liveEntry = this.checkLiveEntry(state, pregame);
    if (liveEntry) opportunities.push(liveEntry);

    // Check for middle opportunity
    const middle = this.checkMiddleOpportunity(state, pregame);
    if (middle) opportunities.push(middle);

    return opportunities;
  }

  private checkHedgeOpportunity(
    state: LiveGameState,
    pregame: { pick: string; odds: number }
  ): LiveValueOpportunity | null {
    // Determine if pregame pick is winning
    const pickedHome = pregame.pick === (state as any).homeTeam || pregame.pick.includes((state as any).homeTeam);
    const isWinning = pickedHome
      ? state.homeScore > state.awayScore
      : state.awayScore > state.homeScore;

    const lead = Math.abs(state.homeScore - state.awayScore);
    const timeRemaining = state.timeRemaining;

    // Hedge if winning significantly with little time left
    if (isWinning && lead >= 10 && timeRemaining <= 600) { // 10+ lead, under 10 min
      const hedgeOdds = pickedHome
        ? state.liveOdds.moneyline.away
        : state.liveOdds.moneyline.home;

      return {
        gameId: state.gameId,
        type: 'hedge',
        pregamePick: pregame.pick,
        recommendation: `Hedge ${(100 / Math.abs(hedgeOdds) * 100).toFixed(0)}% of stake on opponent`,
        currentOdds: hedgeOdds,
        pregameOdds: pregame.odds,
        valuePercent: 15,
        urgency: 'soon',
        reason: `Up by ${lead} with ${Math.floor(timeRemaining / 60)} min left - lock in profit`,
      };
    }

    return null;
  }

  private checkLiveEntry(
    state: LiveGameState,
    pregame: { pick: string; odds: number }
  ): LiveValueOpportunity | null {
    // Look for favorable live odds
    const currentOdds = pregame.pick === (state as any).homeTeam || pregame.pick.includes((state as any).homeTeam)
      ? state.liveOdds.moneyline.home
      : state.liveOdds.moneyline.away;

    // If odds improved by 50+ points
    const oddsImprovement = currentOdds - pregame.odds;
    if (oddsImprovement >= 50) {
      return {
        gameId: state.gameId,
        type: 'live_entry',
        pregamePick: pregame.pick,
        recommendation: 'Double down at better odds',
        currentOdds,
        pregameOdds: pregame.odds,
        valuePercent: Math.abs(oddsImprovement) / 10,
        urgency: oddsImprovement > 100 ? 'now' : 'soon',
        reason: `Line moved +${oddsImprovement} points in your favor`,
      };
    }

    return null;
  }

  private checkMiddleOpportunity(
    state: LiveGameState,
    pregame: { pick: string; odds: number }
  ): LiveValueOpportunity | null {
    // Check if we can hit the middle (win both bets)
    const score = state.homeScore + state.awayScore;
    const spreadDiff = Math.abs(state.homeScore - state.awayScore);

    // If we're within range to hit both spread and total
    if (spreadDiff <= 3 && Math.abs(score - state.liveOdds.total.line) <= 5) {
      return {
        gameId: state.gameId,
        type: 'middle',
        pregamePick: pregame.pick,
        recommendation: 'Monitor for middle opportunity',
        currentOdds: 0,
        pregameOdds: pregame.odds,
        valuePercent: 20,
        urgency: 'watch',
        reason: `Close game and total - potential to win both bets`,
      };
    }

    return null;
  }

  get homeTeam(): string {
    return '';
  }

  /**
   * Get all active monitoring
   */
  getActiveGames(): LiveGameState[] {
    return Array.from(this.games.values())
      .filter(g => g.status === 'in_progress')
      .sort((a, b) => b.timeRemaining - a.timeRemaining);
  }
}

export default LiveBettingMonitor;
