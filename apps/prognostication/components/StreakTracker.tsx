'use client';

/**
 * Streak Tracker
 * Track winning/losing streaks with visual calendar
 * Competitor feature: Action Network Bet Tracker
 */

import { useState, useEffect } from 'react';

interface BetResult {
  date: string;
  result: 'W' | 'L' | 'P';
  game: string;
  pick: string;
  odds: number;
  stake: number;
  profit: number;
}

export default function StreakTracker() {
  const [results, setResults] = useState<BetResult[]>([]);
  const [currentStreak, setCurrentStreak] = useState({ count: 0, type: 'W' as 'W' | 'L' });
  const [longestStreak, setLongestStreak] = useState({ count: 0, type: 'W' as 'W' | 'L' });
  const [stats, setStats] = useState({
    totalBets: 0,
    wins: 0,
    losses: 0,
    pushes: 0,
    totalStaked: 0,
    totalProfit: 0,
    roi: 0,
    winRate: 0,
  });

  useEffect(() => {
    loadResults();
  }, []);

  const loadResults = () => {
    // Load from localStorage or API
    const stored = localStorage.getItem('bet-results');
    const data: BetResult[] = stored ? JSON.parse(stored) : getSampleResults();
    setResults(data);
    calculateStats(data);
    calculateStreaks(data);
  };

  const getSampleResults = (): BetResult[] => {
    const sampleGames = [
      { game: 'Chiefs vs Raiders', pick: 'Chiefs -10.5' },
      { game: 'Bills vs Jets', pick: 'Bills -9.5' },
      { game: 'Lakers vs Warriors', pick: 'Over 228.5' },
      { game: 'Eagles vs Cowboys', pick: 'Eagles ML' },
      { game: 'Celtics vs Heat', pick: 'Celtics -7.5' },
    ];

    const results: BetResult[] = [];
    for (let i = 0; i < 30; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const result = Math.random() > 0.4 ? 'W' : Math.random() > 0.1 ? 'L' : 'P';
      const game = sampleGames[Math.floor(Math.random() * sampleGames.length)];
      const stake = [10, 20, 25, 50][Math.floor(Math.random() * 4)];
      
      results.push({
        date: date.toISOString().split('T')[0],
        result: result as 'W' | 'L' | 'P',
        game: game.game,
        pick: game.pick,
        odds: Math.random() > 0.5 ? -110 : Math.floor(Math.random() * 200) - 150,
        stake,
        profit: result === 'W' ? stake * 0.91 : result === 'L' ? -stake : 0,
      });
    }
    return results;
  };

  const calculateStats = (data: BetResult[]) => {
    const wins = data.filter(r => r.result === 'W').length;
    const losses = data.filter(r => r.result === 'L').length;
    const pushes = data.filter(r => r.result === 'P').length;
    const totalStaked = data.reduce((sum, r) => sum + r.stake, 0);
    const totalProfit = data.reduce((sum, r) => sum + r.profit, 0);

    setStats({
      totalBets: data.length,
      wins,
      losses,
      pushes,
      totalStaked,
      totalProfit,
      roi: totalStaked > 0 ? (totalProfit / totalStaked) * 100 : 0,
      winRate: data.length > 0 ? (wins / (wins + losses)) * 100 : 0,
    });
  };

  const calculateStreaks = (data: BetResult[]) => {
    if (data.length === 0) return;

    // Sort by date descending
    const sorted = [...data].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    // Current streak
    let currentCount = 1;
    const currentType = sorted[0].result === 'P' ? 'W' : sorted[0].result;
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].result === currentType || sorted[i].result === 'P') {
        currentCount++;
      } else {
        break;
      }
    }
    setCurrentStreak({ count: currentCount, type: currentType });

    // Longest streak
    let longestW = 0;
    let longestL = 0;
    let tempW = 0;
    let tempL = 0;
    
    for (const bet of sorted) {
      if (bet.result === 'W') {
        tempW++;
        tempL = 0;
        longestW = Math.max(longestW, tempW);
      } else if (bet.result === 'L') {
        tempL++;
        tempW = 0;
        longestL = Math.max(longestL, tempL);
      }
    }
    
    setLongestStreak(
      longestW >= longestL 
        ? { count: longestW, type: 'W' } 
        : { count: longestL, type: 'L' }
    );
  };

  // Generate calendar data for last 30 days
  const getCalendarData = () => {
    const days = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const dayResults = results.filter(r => r.date === dateStr);
      
      days.push({
        date: dateStr,
        dayOfWeek: date.toLocaleDateString('en-US', { weekday: 'short' }),
        dayOfMonth: date.getDate(),
        results: dayResults,
        wins: dayResults.filter(r => r.result === 'W').length,
        losses: dayResults.filter(r => r.result === 'L').length,
        profit: dayResults.reduce((sum, r) => sum + r.profit, 0),
      });
    }
    return days;
  };

  const calendar = getCalendarData();

  return (
    <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl overflow-hidden border border-white/10">
      {/* Header */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🔥</span>
            <h2 className="text-xl font-bold text-white">Streak Tracker</h2>
          </div>
          <div className={`px-3 py-1 rounded-full text-sm font-bold ${
            currentStreak.type === 'W' 
              ? 'bg-emerald-500/20 text-emerald-400' 
              : 'bg-red-500/20 text-red-400'
          }`}>
            {currentStreak.count}{currentStreak.type} Streak
          </div>
        </div>
      </div>

      <div className="p-4">
        {/* Stats Grid */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          <div className="bg-white/5 rounded-xl p-3 text-center">
            <div className="text-2xl font-bold text-white">{stats.wins}</div>
            <div className="text-xs text-emerald-400">Wins</div>
          </div>
          <div className="bg-white/5 rounded-xl p-3 text-center">
            <div className="text-2xl font-bold text-white">{stats.losses}</div>
            <div className="text-xs text-red-400">Losses</div>
          </div>
          <div className="bg-white/5 rounded-xl p-3 text-center">
            <div className={`text-2xl font-bold ${stats.winRate >= 55 ? 'text-emerald-400' : 'text-yellow-400'}`}>
              {stats.winRate.toFixed(1)}%
            </div>
            <div className="text-xs text-white/50">Win Rate</div>
          </div>
          <div className="bg-white/5 rounded-xl p-3 text-center">
            <div className={`text-2xl font-bold ${stats.roi >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {stats.roi >= 0 ? '+' : ''}{stats.roi.toFixed(1)}%
            </div>
            <div className="text-xs text-white/50">ROI</div>
          </div>
        </div>

        {/* Calendar View */}
        <div className="mb-6">
          <div className="text-xs text-white/50 mb-2">LAST 30 DAYS</div>
          <div className="grid grid-cols-10 gap-1">
            {calendar.map((day, i) => (
              <div
                key={i}
                className={`aspect-square rounded-lg flex items-center justify-center text-xs font-bold cursor-pointer transition-all hover:scale-110 ${
                  day.results.length === 0 
                    ? 'bg-white/5 text-white/30' 
                    : day.wins > day.losses
                    ? 'bg-emerald-500/30 text-emerald-400'
                    : day.losses > day.wins
                    ? 'bg-red-500/30 text-red-400'
                    : 'bg-yellow-500/30 text-yellow-400'
                }`}
                title={`${day.date}: ${day.wins}W ${day.losses}L ($${day.profit.toFixed(2)})`}
              >
                {day.dayOfMonth}
              </div>
            ))}
          </div>
          <div className="flex justify-center gap-4 mt-2 text-xs text-white/40">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 bg-emerald-500/30 rounded" /> Winning
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 bg-red-500/30 rounded" /> Losing
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 bg-white/5 rounded" /> No bets
            </span>
          </div>
        </div>

        {/* Profit Chart */}
        <div className="mb-6">
          <div className="text-xs text-white/50 mb-2">CUMULATIVE PROFIT</div>
          <div className="h-24 flex items-end gap-0.5">
            {(() => {
              let cumulative = 0;
              const maxProfit = Math.max(...calendar.map(d => {
                cumulative += d.profit;
                return Math.abs(cumulative);
              }));
              cumulative = 0;
              
              return calendar.map((day, i) => {
                cumulative += day.profit;
                const height = maxProfit > 0 ? Math.abs(cumulative) / maxProfit * 100 : 0;
                
                return (
                  <div
                    key={i}
                    className={`flex-1 rounded-t transition-all ${
                      cumulative >= 0 ? 'bg-emerald-500' : 'bg-red-500'
                    }`}
                    style={{ height: `${Math.max(height, 2)}%` }}
                  />
                );
              });
            })()}
          </div>
          <div className="flex justify-between text-xs text-white/40 mt-1">
            <span>30 days ago</span>
            <span>Today</span>
          </div>
        </div>

        {/* Totals */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white/5 rounded-xl p-4">
            <div className="text-xs text-white/50 mb-1">TOTAL STAKED</div>
            <div className="text-xl font-bold text-white">${stats.totalStaked.toFixed(2)}</div>
          </div>
          <div className={`rounded-xl p-4 ${stats.totalProfit >= 0 ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}>
            <div className="text-xs text-white/50 mb-1">TOTAL PROFIT</div>
            <div className={`text-xl font-bold ${stats.totalProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {stats.totalProfit >= 0 ? '+' : ''}${stats.totalProfit.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Record Streaks */}
        <div className="mt-4 flex gap-3">
          <div className="flex-1 bg-white/5 rounded-xl p-3 text-center">
            <div className="text-xs text-white/50 mb-1">LONGEST WIN STREAK</div>
            <div className="text-xl font-bold text-emerald-400">{longestStreak.type === 'W' ? longestStreak.count : '—'}W</div>
          </div>
          <div className="flex-1 bg-white/5 rounded-xl p-3 text-center">
            <div className="text-xs text-white/50 mb-1">LONGEST LOSS STREAK</div>
            <div className="text-xl font-bold text-red-400">{longestStreak.type === 'L' ? longestStreak.count : '—'}L</div>
          </div>
        </div>
      </div>
    </div>
  );
}

