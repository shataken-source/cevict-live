/**
 * Auto-Grading Service
 * Automatically grades picks and tracks performance analytics
 */

export interface GradedPick {
  pickId: string;
  gameId: string;
  sport: string;
  pick: string;
  odds: number;
  confidence: number;
  tier: string;
  result: 'win' | 'loss' | 'push' | 'pending';
  profit: number;
  gradedAt: string;
  gameScore?: { home: number; away: number };
}

export interface PerformanceAnalytics {
  byTier: Record<string, {
    wins: number;
    losses: number;
    pushes: number;
    winRate: number;
    roi: number;
    avgOdds: number;
    profit: number;
  }>;
  bySport: Record<string, {
    picks: number;
    winRate: number;
    profit: number;
  }>;
  overall: {
    totalPicks: number;
    winRate: number;
    roi: number;
    totalProfit: number;
    avgConfidence: number;
    streak: number; // positive for win streak, negative for loss streak
  };
  last30Days: {
    picks: number;
    winRate: number;
    profit: number;
  };
}

export class AutoGradingService {
  private gradedPicks: Map<string, GradedPick> = new Map();

  /**
   * Grade a pick based on game result
   */
  gradePick(
    pickId: string,
    gameId: string,
    sport: string,
    pick: string,
    odds: number,
    confidence: number,
    tier: string,
    gameScore: { home: number; away: number },
    homeTeam: string,
    awayTeam: string,
    pickType: 'moneyline' | 'spread' | 'total' = 'moneyline',
    spread?: number,
    total?: number
  ): GradedPick {
    let result: 'win' | 'loss' | 'push';
    let profit = 0;

    // Determine winner
    const homeWon = gameScore.home > gameScore.away;
    const isPush = gameScore.home === gameScore.away;

    if (pickType === 'moneyline') {
      if (isPush) {
        result = 'push';
        profit = 0;
      } else {
        const pickedHome = pick === homeTeam;
        const pickedWinner = (pickedHome && homeWon) || (!pickedHome && !homeWon);
        result = pickedWinner ? 'win' : 'loss';
        profit = pickedWinner ? this.calculateProfit(odds, 100) : -100;
      }
    } else if (pickType === 'spread' && spread !== undefined) {
      const homeCover = (gameScore.home + spread) > gameScore.away;
      const awayCover = (gameScore.away - spread) > gameScore.home;
      const pushSpread = (gameScore.home + spread) === gameScore.away;

      if (pushSpread) {
        result = 'push';
        profit = 0;
      } else {
        const pickedHome = pick === homeTeam;
        result = (pickedHome && homeCover) || (!pickedHome && awayCover) ? 'win' : 'loss';
        profit = result === 'win' ? this.calculateProfit(odds, 100) : -100;
      }
    } else {
      // Total - simplified
      const finalTotal = gameScore.home + gameScore.away;
      const pickedOver = pick.toLowerCase().includes('over');
      
      if (total && finalTotal === total) {
        result = 'push';
        profit = 0;
      } else {
        const overHit = finalTotal > (total || 0);
        result = (pickedOver && overHit) || (!pickedOver && !overHit) ? 'win' : 'loss';
        profit = result === 'win' ? this.calculateProfit(odds, 100) : -100;
      }
    }

    const graded: GradedPick = {
      pickId,
      gameId,
      sport,
      pick,
      odds,
      confidence,
      tier,
      result,
      profit,
      gradedAt: new Date().toISOString(),
      gameScore,
    };

    this.gradedPicks.set(pickId, graded);
    return graded;
  }

  /**
   * Calculate performance analytics
   */
  calculateAnalytics(): PerformanceAnalytics {
    const picks = Array.from(this.gradedPicks.values());
    const completed = picks.filter(p => p.result !== 'pending');

    // By tier
    const byTier: PerformanceAnalytics['byTier'] = {};
    const tiers = ['elite', 'pro', 'free'];
    
    for (const tier of tiers) {
      const tierPicks = completed.filter(p => p.tier === tier);
      const wins = tierPicks.filter(p => p.result === 'win').length;
      const losses = tierPicks.filter(p => p.result === 'loss').length;
      const pushes = tierPicks.filter(p => p.result === 'push').length;
      const totalStaked = (wins + losses + pushes) * 100;
      const totalProfit = tierPicks.reduce((sum, p) => sum + p.profit, 0);

      byTier[tier] = {
        wins,
        losses,
        pushes,
        winRate: tierPicks.length > 0 ? (wins / (wins + losses)) * 100 : 0,
        roi: totalStaked > 0 ? (totalProfit / totalStaked) * 100 : 0,
        avgOdds: tierPicks.length > 0 ? tierPicks.reduce((s, p) => s + p.odds, 0) / tierPicks.length : 0,
        profit: totalProfit,
      };
    }

    // By sport
    const bySport: PerformanceAnalytics['bySport'] = {};
    const sports = [...new Set(completed.map(p => p.sport))];
    
    for (const sport of sports) {
      const sportPicks = completed.filter(p => p.tier === sport);
      const wins = sportPicks.filter(p => p.result === 'win').length;
      const losses = sportPicks.filter(p => p.result === 'loss').length;
      
      bySport[sport] = {
        picks: sportPicks.length,
        winRate: sportPicks.length > 0 ? (wins / (wins + losses)) * 100 : 0,
        profit: sportPicks.reduce((s, p) => s + p.profit, 0),
      };
    }

    // Overall
    const wins = completed.filter(p => p.result === 'win').length;
    const losses = completed.filter(p => p.result === 'loss').length;
    const pushes = completed.filter(p => p.result === 'push').length;
    const totalProfit = completed.reduce((s, p) => s + p.profit, 0);
    const totalStaked = (wins + losses + pushes) * 100;

    // Calculate streak
    let streak = 0;
    const sorted = [...completed].sort((a, b) => 
      new Date(b.gradedAt).getTime() - new Date(a.gradedAt).getTime()
    );
    
    for (const pick of sorted) {
      if (pick.result === 'win') {
        if (streak >= 0) streak++;
        else break;
      } else if (pick.result === 'loss') {
        if (streak <= 0) streak--;
        else break;
      }
    }

    // Last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const last30 = completed.filter(p => new Date(p.gradedAt) >= thirtyDaysAgo);
    const last30Wins = last30.filter(p => p.result === 'win').length;
    const last30Losses = last30.filter(p => p.result === 'loss').length;

    return {
      byTier,
      bySport,
      overall: {
        totalPicks: completed.length,
        winRate: completed.length > 0 ? (wins / (wins + losses)) * 100 : 0,
        roi: totalStaked > 0 ? (totalProfit / totalStaked) * 100 : 0,
        totalProfit,
        avgConfidence: completed.length > 0 ? completed.reduce((s, p) => s + p.confidence, 0) / completed.length : 0,
        streak,
      },
      last30Days: {
        picks: last30.length,
        winRate: last30.length > 0 ? (last30Wins / (last30Wins + last30Losses)) * 100 : 0,
        profit: last30.reduce((s, p) => s + p.profit, 0),
      },
    };
  }

  private calculateProfit(americanOdds: number, stake: number): number {
    if (americanOdds > 0) {
      return (americanOdds / 100) * stake;
    } else {
      return (100 / Math.abs(americanOdds)) * stake;
    }
  }

  /**
   * Export graded picks to file
   */
  async exportToFile(date: string): Promise<string> {
    const fs = require('fs');
    const path = require('path');

    const prognoDir = path.join(process.cwd(), '.progno');
    if (!fs.existsSync(prognoDir)) {
      fs.mkdirSync(prognoDir, { recursive: true });
    }

    const file = path.join(prognoDir, `graded-picks-${date}.json`);
    const picks = Array.from(this.gradedPicks.values());
    fs.writeFileSync(file, JSON.stringify(picks, null, 2));

    return file;
  }
}

export default AutoGradingService;
