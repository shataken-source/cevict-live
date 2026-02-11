'use client';

import { useMemo } from 'react';
import { 
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ScatterChart, Scatter, Cell, ReferenceLine
} from 'recharts';
import { 
  TrendingUp, TrendingDown, Target, Shield, Zap, 
  Activity, BarChart2, PieChart as PieIcon, AlertTriangle
} from 'lucide-react';
import type { Trade, PortfolioStats } from '@/types';
import { formatCurrency, formatPercent, cn } from '@/lib/utils';

interface AnalyticsViewProps {
  trades: Trade[];
  stats: PortfolioStats;
}

// Kelly Criterion Calculator
function KellyCalculator({ stats }: { stats: PortfolioStats }) {
  const winRate = stats.win_rate / 100;
  const avgWin = stats.avg_win || 1;
  const avgLoss = Math.abs(stats.avg_loss) || 1;
  const winLossRatio = avgWin / avgLoss;
  
  // Full Kelly
  const fullKelly = winRate - ((1 - winRate) / winLossRatio);
  // Half Kelly (safer)
  const halfKelly = fullKelly / 2;
  // Quarter Kelly (conservative)
  const quarterKelly = fullKelly / 4;
  
  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-4">
        <Target className="text-indigo-400" size={20} />
        <h3 className="font-semibold">Kelly Criterion Position Sizing</h3>
      </div>
      
      <div className="space-y-4">
        <div className="p-4 bg-zinc-800/50 rounded-lg">
          <div className="flex justify-between items-center mb-2">
            <span className="text-zinc-400">Your Win Rate</span>
            <span className="font-bold text-lg">{(winRate * 100).toFixed(1)}%</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-zinc-400">Win/Loss Ratio</span>
            <span className="font-bold text-lg">{winLossRatio.toFixed(2)}x</span>
          </div>
        </div>
        
        <div className="space-y-3">
          <div className="flex justify-between items-center p-3 bg-red-500/10 rounded-lg border border-red-500/20">
            <div>
              <p className="font-medium text-red-400">Full Kelly</p>
              <p className="text-xs text-zinc-500">Maximum growth (high risk)</p>
            </div>
            <span className="text-xl font-bold text-red-400">
              {fullKelly > 0 ? `${(fullKelly * 100).toFixed(1)}%` : 'Don\'t bet'}
            </span>
          </div>
          
          <div className="flex justify-between items-center p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
            <div>
              <p className="font-medium text-yellow-400">Half Kelly</p>
              <p className="text-xs text-zinc-500">Balanced approach (recommended)</p>
            </div>
            <span className="text-xl font-bold text-yellow-400">
              {halfKelly > 0 ? `${(halfKelly * 100).toFixed(1)}%` : 'Don\'t bet'}
            </span>
          </div>
          
          <div className="flex justify-between items-center p-3 bg-green-500/10 rounded-lg border border-green-500/20">
            <div>
              <p className="font-medium text-green-400">Quarter Kelly</p>
              <p className="text-xs text-zinc-500">Conservative (lower variance)</p>
            </div>
            <span className="text-xl font-bold text-green-400">
              {quarterKelly > 0 ? `${(quarterKelly * 100).toFixed(1)}%` : 'Don\'t bet'}
            </span>
          </div>
        </div>
        
        <p className="text-xs text-zinc-500 mt-4">
          💡 Based on your {stats.total_trades} trades. Half Kelly typically offers the best risk-adjusted returns for most traders.
        </p>
      </div>
    </div>
  );
}

// Drawdown Analysis
function DrawdownChart({ trades }: { trades: Trade[] }) {
  const settledTrades = trades
    .filter(t => t.status === 'settled' && t.pnl !== null)
    .sort((a, b) => new Date(a.exit_time || a.entry_time).getTime() - new Date(b.exit_time || b.entry_time).getTime());
  
  if (settledTrades.length === 0) {
    return (
      <div className="card">
        <h3 className="font-semibold mb-4">Drawdown Analysis</h3>
        <div className="h-48 flex items-center justify-center text-zinc-500">
          No settled trades for drawdown analysis
        </div>
      </div>
    );
  }
  
  let peak = 0;
  let cumulative = 0;
  const drawdownData = settledTrades.map((trade, i) => {
    cumulative += trade.pnl || 0;
    peak = Math.max(peak, cumulative);
    const drawdown = peak > 0 ? ((peak - cumulative) / peak) * 100 : 0;
    
    return {
      trade: i + 1,
      equity: cumulative,
      peak,
      drawdown: -drawdown,
      date: trade.exit_time || trade.entry_time
    };
  });
  
  const maxDrawdown = Math.min(...drawdownData.map(d => d.drawdown));
  
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <TrendingDown className="text-red-400" size={20} />
          <h3 className="font-semibold">Drawdown Analysis</h3>
        </div>
        <span className="text-red-400 font-bold">{maxDrawdown.toFixed(1)}% max</span>
      </div>
      
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={drawdownData}>
          <defs>
            <linearGradient id="drawdownGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
          <XAxis dataKey="trade" stroke="#71717a" fontSize={12} />
          <YAxis stroke="#71717a" fontSize={12} tickFormatter={(v) => `${v}%`} />
          <Tooltip
            contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px' }}
            labelStyle={{ color: '#a1a1aa' }}
            formatter={(value: number) => [`${value.toFixed(2)}%`, 'Drawdown']}
          />
          <ReferenceLine y={0} stroke="#52525b" />
          <Area
            type="monotone"
            dataKey="drawdown"
            stroke="#ef4444"
            fill="url(#drawdownGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// Return Distribution Histogram
function ReturnDistribution({ trades }: { trades: Trade[] }) {
  const settledTrades = trades.filter(t => t.status === 'settled' && t.pnl !== null);
  
  if (settledTrades.length < 5) {
    return (
      <div className="card">
        <h3 className="font-semibold mb-4">Return Distribution</h3>
        <div className="h-48 flex items-center justify-center text-zinc-500">
          Need at least 5 settled trades
        </div>
      </div>
    );
  }
  
  // Create histogram bins
  const pnls = settledTrades.map(t => t.pnl || 0);
  const min = Math.min(...pnls);
  const max = Math.max(...pnls);
  const range = max - min;
  const binCount = 15;
  const binSize = range / binCount;
  
  const bins: { range: string; count: number; isPositive: boolean }[] = [];
  for (let i = 0; i < binCount; i++) {
    const binStart = min + (i * binSize);
    const binEnd = binStart + binSize;
    const count = pnls.filter(p => p >= binStart && p < binEnd).length;
    bins.push({
      range: `${formatCurrency(binStart)}`,
      count,
      isPositive: binStart >= 0
    });
  }
  
  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-4">
        <BarChart2 className="text-indigo-400" size={20} />
        <h3 className="font-semibold">Return Distribution</h3>
      </div>
      
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={bins}>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
          <XAxis dataKey="range" stroke="#71717a" fontSize={10} interval={2} />
          <YAxis stroke="#71717a" fontSize={12} />
          <Tooltip
            contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px' }}
            labelStyle={{ color: '#a1a1aa' }}
          />
          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
            {bins.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.isPositive ? '#22c55e' : '#ef4444'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// Win/Loss Streak Analysis
function StreakAnalysis({ trades }: { trades: Trade[] }) {
  const settledTrades = trades
    .filter(t => t.status === 'settled' && t.pnl !== null)
    .sort((a, b) => new Date(a.exit_time || a.entry_time).getTime() - new Date(b.exit_time || b.entry_time).getTime());
  
  if (settledTrades.length < 3) {
    return null;
  }
  
  // Calculate streaks
  let currentStreak = 0;
  let maxWinStreak = 0;
  let maxLoseStreak = 0;
  let isWinning = true;
  
  settledTrades.forEach((trade) => {
    const isWin = (trade.pnl || 0) > 0;
    if (isWin === isWinning) {
      currentStreak++;
    } else {
      currentStreak = 1;
      isWinning = isWin;
    }
    if (isWin) maxWinStreak = Math.max(maxWinStreak, currentStreak);
    else maxLoseStreak = Math.max(maxLoseStreak, currentStreak);
  });
  
  // Current streak
  const lastTrade = settledTrades[settledTrades.length - 1];
  const lastIsWin = (lastTrade?.pnl || 0) > 0;
  
  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-4">
        <Activity className="text-indigo-400" size={20} />
        <h3 className="font-semibold">Streak Analysis</h3>
      </div>
      
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="p-3 bg-green-500/10 rounded-lg text-center">
          <p className="text-2xl font-bold text-green-400">{maxWinStreak}</p>
          <p className="text-xs text-zinc-500">Best Win Streak</p>
        </div>
        <div className="p-3 bg-red-500/10 rounded-lg text-center">
          <p className="text-2xl font-bold text-red-400">{maxLoseStreak}</p>
          <p className="text-xs text-zinc-500">Worst Lose Streak</p>
        </div>
      </div>
      
      <div className={cn(
        'p-3 rounded-lg text-center',
        lastIsWin ? 'bg-green-500/10' : 'bg-red-500/10'
      )}>
        <p className="text-sm text-zinc-400">Current Streak</p>
        <p className={cn('text-xl font-bold', lastIsWin ? 'text-green-400' : 'text-red-400')}>
          {currentStreak} {lastIsWin ? 'Wins' : 'Losses'}
        </p>
      </div>
    </div>
  );
}

// Risk Metrics Card
function RiskMetrics({ stats }: { stats: PortfolioStats }) {
  const riskRating = 
    stats.sharpe_ratio >= 2 && stats.max_drawdown < 500 ? 'Low' :
    stats.sharpe_ratio >= 1 && stats.max_drawdown < 1000 ? 'Medium' :
    'High';
  
  const riskColor = 
    riskRating === 'Low' ? 'text-green-400' :
    riskRating === 'Medium' ? 'text-yellow-400' :
    'text-red-400';
  
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Shield className="text-indigo-400" size={20} />
          <h3 className="font-semibold">Risk Profile</h3>
        </div>
        <span className={cn('font-bold', riskColor)}>{riskRating} Risk</span>
      </div>
      
      <div className="space-y-4">
        <div>
          <div className="flex justify-between mb-1">
            <span className="text-zinc-400 text-sm">Sharpe Ratio</span>
            <span className="font-medium">{stats.sharpe_ratio.toFixed(2)}</span>
          </div>
          <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
            <div 
              className={cn(
                'h-full rounded-full',
                stats.sharpe_ratio >= 2 ? 'bg-green-500' :
                stats.sharpe_ratio >= 1 ? 'bg-yellow-500' : 'bg-red-500'
              )}
              style={{ width: `${Math.min(stats.sharpe_ratio * 33.33, 100)}%` }}
            />
          </div>
          <p className="text-xs text-zinc-600 mt-1">Target: &gt;2.0</p>
        </div>
        
        <div>
          <div className="flex justify-between mb-1">
            <span className="text-zinc-400 text-sm">Sortino Ratio</span>
            <span className="font-medium">{stats.sortino_ratio.toFixed(2)}</span>
          </div>
          <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
            <div 
              className={cn(
                'h-full rounded-full',
                stats.sortino_ratio >= 2 ? 'bg-green-500' :
                stats.sortino_ratio >= 1 ? 'bg-yellow-500' : 'bg-red-500'
              )}
              style={{ width: `${Math.min(stats.sortino_ratio * 33.33, 100)}%` }}
            />
          </div>
          <p className="text-xs text-zinc-600 mt-1">Target: &gt;2.0</p>
        </div>
        
        <div>
          <div className="flex justify-between mb-1">
            <span className="text-zinc-400 text-sm">Profit Factor</span>
            <span className="font-medium">
              {stats.profit_factor === Infinity ? '∞' : stats.profit_factor.toFixed(2)}
            </span>
          </div>
          <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
            <div 
              className={cn(
                'h-full rounded-full',
                stats.profit_factor >= 2 ? 'bg-green-500' :
                stats.profit_factor >= 1.5 ? 'bg-yellow-500' : 'bg-red-500'
              )}
              style={{ width: `${Math.min((stats.profit_factor / 3) * 100, 100)}%` }}
            />
          </div>
          <p className="text-xs text-zinc-600 mt-1">Target: &gt;1.5</p>
        </div>
      </div>
    </div>
  );
}

// Main Analytics View
export default function AnalyticsView({ trades, stats }: AnalyticsViewProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Advanced Analytics</h2>
        <p className="text-zinc-500">Deep dive into your trading performance</p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <KellyCalculator stats={stats} />
        <RiskMetrics stats={stats} />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DrawdownChart trades={trades} />
        <ReturnDistribution trades={trades} />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <StreakAnalysis trades={trades} />
        
        {/* Time-based Analysis */}
        <div className="card lg:col-span-2">
          <h3 className="font-semibold mb-4">Performance by Day of Week</h3>
          <DayOfWeekAnalysis trades={trades} />
        </div>
      </div>
    </div>
  );
}

// Day of Week Analysis
function DayOfWeekAnalysis({ trades }: { trades: Trade[] }) {
  const settledTrades = trades.filter(t => t.status === 'settled' && t.pnl !== null);
  
  if (settledTrades.length < 7) {
    return (
      <div className="h-48 flex items-center justify-center text-zinc-500">
        Need more trades for day-of-week analysis
      </div>
    );
  }
  
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dayStats = days.map((day, i) => {
    const dayTrades = settledTrades.filter(t => new Date(t.entry_time).getDay() === i);
    const pnl = dayTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
    const winRate = dayTrades.length > 0 
      ? (dayTrades.filter(t => (t.pnl || 0) > 0).length / dayTrades.length) * 100 
      : 0;
    
    return { day, pnl, trades: dayTrades.length, winRate };
  });
  
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={dayStats}>
        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
        <XAxis dataKey="day" stroke="#71717a" fontSize={12} />
        <YAxis stroke="#71717a" fontSize={12} tickFormatter={(v) => `$${v}`} />
        <Tooltip
          contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px' }}
          labelStyle={{ color: '#a1a1aa' }}
          formatter={(value: number, name: string) => [
            name === 'pnl' ? formatCurrency(value) : `${value.toFixed(1)}%`,
            name === 'pnl' ? 'P&L' : 'Win Rate'
          ]}
        />
        <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
          {dayStats.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.pnl >= 0 ? '#22c55e' : '#ef4444'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
