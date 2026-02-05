// History Tracker Module for Progno Sports Prediction Platform

export interface HistoricalBet {
  id: string;
  game: string;
  betType: 'moneyline' | 'spread' | 'total' | 'prop';
  selection: string;
  odds: number;
  amount: number;
  result: 'win' | 'lose' | 'pending';
  actualOutcome?: string;
  confidence: number;
  date: Date;
  payout?: number;
}

export interface BettingStats {
  totalBets: number;
  wins: number;
  losses: number;
  pending: number;
  winRate: number;
  totalWagered: number;
  totalPayout: number;
  profit: number;
  roi: number;
  averageOdds: number;
  bestStreak: number;
  currentStreak: number;
}

// In-memory storage (in production, use a database)
let historicalBets: HistoricalBet[] = [];

// Get betting history
export function getHistory(limit?: number): HistoricalBet[] {
  const sortedBets = historicalBets.sort((a, b) => b.date.getTime() - a.date.getTime());
  return limit ? sortedBets.slice(0, limit) : sortedBets;
}

// Add a new bet to history
export function addBet(bet: Omit<HistoricalBet, 'id' | 'date'>): HistoricalBet {
  const newBet: HistoricalBet = {
    ...bet,
    id: generateId(),
    date: new Date()
  };

  historicalBets.push(newBet);
  return newBet;
}

// Update bet result
export function updateBetResult(betId: string, result: 'win' | 'lose', actualOutcome?: string): boolean {
  const betIndex = historicalBets.findIndex(bet => bet.id === betId);
  if (betIndex === -1) return false;

  historicalBets[betIndex].result = result;
  historicalBets[betIndex].actualOutcome = actualOutcome;

  // Calculate payout
  if (result === 'win') {
    const bet = historicalBets[betIndex];
    let payout = 0;

    if (bet.odds > 0) {
      payout = bet.amount + (bet.amount * bet.odds / 100);
    } else {
      payout = bet.amount + (bet.amount / Math.abs(bet.odds) * 100);
    }

    historicalBets[betIndex].payout = payout;
  } else {
    historicalBets[betIndex].payout = 0;
  }

  return true;
}

// Get betting statistics
export function getBettingStats(): BettingStats {
  const totalBets = historicalBets.length;
  const wins = historicalBets.filter(bet => bet.result === 'win').length;
  const losses = historicalBets.filter(bet => bet.result === 'lose').length;
  const pending = historicalBets.filter(bet => bet.result === 'pending').length;

  const winRate = totalBets > 0 ? wins / totalBets : 0;
  const totalWagered = historicalBets.reduce((sum, bet) => sum + bet.amount, 0);
  const totalPayout = historicalBets.reduce((sum, bet) => sum + (bet.payout || 0), 0);
  const profit = totalPayout - totalWagered;
  const roi = totalWagered > 0 ? profit / totalWagered : 0;

  const averageOdds = totalBets > 0
    ? historicalBets.reduce((sum, bet) => sum + Math.abs(bet.odds), 0) / totalBets
    : 0;

  const streaks = calculateStreaks();

  return {
    totalBets,
    wins,
    losses,
    pending,
    winRate,
    totalWagered,
    totalPayout,
    profit,
    roi,
    averageOdds,
    bestStreak: streaks.best,
    currentStreak: streaks.current
  };
}

// Calculate win/loss streaks
function calculateStreaks(): { best: number; current: number } {
  let bestStreak = 0;
  let currentStreak = 0;
  let tempStreak = 0;

  const sortedBets = historicalBets.sort((a, b) => a.date.getTime() - b.date.getTime());

  for (const bet of sortedBets) {
    if (bet.result === 'win') {
      tempStreak++;
      currentStreak = tempStreak;
    } else if (bet.result === 'lose') {
      if (tempStreak > bestStreak) {
        bestStreak = tempStreak;
      }
      tempStreak = 0;
      currentStreak = 0;
    }
    // Pending bets don't affect streaks
  }

  if (tempStreak > bestStreak) {
    bestStreak = tempStreak;
  }

  return { best: bestStreak, current: currentStreak };
}

// Get performance by bet type
export function getPerformanceByBetType(): { [type: string]: { bets: number; wins: number; winRate: number } } {
  const performance: { [type: string]: { bets: number; wins: number; winRate: number } } = {};

  const betTypes = ['moneyline', 'spread', 'total', 'prop'];

  betTypes.forEach(type => {
    const typeBets = historicalBets.filter(bet => bet.betType === type && bet.result !== 'pending');
    const wins = typeBets.filter(bet => bet.result === 'win').length;
    const winRate = typeBets.length > 0 ? wins / typeBets.length : 0;

    performance[type] = {
      bets: typeBets.length,
      wins,
      winRate
    };
  });

  return performance;
}

// Get performance by confidence level
export function getPerformanceByConfidence(): { [range: string]: { bets: number; wins: number; winRate: number } } {
  const ranges = [
    { label: '90-100%', min: 0.9, max: 1.0 },
    { label: '80-90%', min: 0.8, max: 0.9 },
    { label: '70-80%', min: 0.7, max: 0.8 },
    { label: '60-70%', min: 0.6, max: 0.7 },
    { label: '50-60%', min: 0.5, max: 0.6 },
    { label: 'Below 50%', min: 0, max: 0.5 }
  ];

  const performance: { [range: string]: { bets: number; wins: number; winRate: number } } = {};

  ranges.forEach(range => {
    const rangeBets = historicalBets.filter(bet =>
      bet.confidence >= range.min &&
      bet.confidence < range.max &&
      bet.result !== 'pending'
    );
    const wins = rangeBets.filter(bet => bet.result === 'win').length;
    const winRate = rangeBets.length > 0 ? wins / rangeBets.length : 0;

    performance[range.label] = {
      bets: rangeBets.length,
      wins,
      winRate
    };
  });

  return performance;
}

// Get recent performance (last 10 bets)
export function getRecentPerformance(): {
  bets: HistoricalBet[];
  stats: BettingStats;
} {
  const recentBets = getHistory(10);
  const recentStats = calculateStatsForBets(recentBets);

  return {
    bets: recentBets,
    stats: recentStats
  };
}

// Calculate stats for a subset of bets
function calculateStatsForBets(bets: HistoricalBet[]): BettingStats {
  const totalBets = bets.length;
  const wins = bets.filter(bet => bet.result === 'win').length;
  const losses = bets.filter(bet => bet.result === 'lose').length;
  const pending = bets.filter(bet => bet.result === 'pending').length;

  const winRate = totalBets > 0 ? wins / totalBets : 0;
  const totalWagered = bets.reduce((sum, bet) => sum + bet.amount, 0);
  const totalPayout = bets.reduce((sum, bet) => sum + (bet.payout || 0), 0);
  const profit = totalPayout - totalWagered;
  const roi = totalWagered > 0 ? profit / totalWagered : 0;

  const averageOdds = totalBets > 0
    ? bets.reduce((sum, bet) => sum + Math.abs(bet.odds), 0) / totalBets
    : 0;

  return {
    totalBets,
    wins,
    losses,
    pending,
    winRate,
    totalWagered,
    totalPayout,
    profit,
    roi,
    averageOdds,
    bestStreak: 0, // Not calculated for subsets
    currentStreak: 0
  };
}

// Export history to CSV
export function exportHistoryToCSV(): string {
  const headers = ['Date', 'Game', 'Bet Type', 'Selection', 'Odds', 'Amount', 'Result', 'Payout', 'Confidence'];
  const rows = historicalBets.map(bet => [
    bet.date.toISOString().split('T')[0],
    bet.game,
    bet.betType,
    bet.selection,
    bet.odds.toString(),
    bet.amount.toString(),
    bet.result,
    (bet.payout || 0).toString(),
    bet.confidence.toString()
  ]);

  return [headers, ...rows].map(row => row.join(',')).join('\n');
}

// Clear all history (for testing)
export function clearHistory(): void {
  historicalBets = [];
}

// Import history from array
export function importHistory(bets: HistoricalBet[]): void {
  historicalBets = bets;
}

// Generate unique ID
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}
