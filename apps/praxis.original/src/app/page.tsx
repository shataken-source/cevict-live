'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  TrendingUp, TrendingDown, Upload, BarChart3, Wallet,
  Target, Brain, Settings, Bell, ChevronDown,
  ArrowUpRight, ArrowDownRight, Zap, Shield, Clock, Trophy,
  Download, X, Menu
} from 'lucide-react';
import {
  AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { useTradingStore, useFilteredTrades } from '@/lib/store';
import { parseGenericCSV, exportTradesToCSV } from '@/lib/csv-parser';
import {
  formatCurrency, formatPnL, formatDate, formatDateTime,
  calculatePortfolioStats, calculateDailyStats, filterTradesByTimeRange, cn
} from '@/lib/utils';
import type { Trade, ViewMode, TimeRange } from '@/types';
import { SignedIn, SignedOut, useAuth } from '@clerk/nextjs';
import Link from 'next/link';

import AnalyticsView from '@/components/AnalyticsView';
import AIInsightsView from '@/components/AIInsightsView';
import AlertsView from '@/components/AlertsView';
import ArbitrageView from '@/components/ArbitrageView';
import SettingsView, { AppSettings } from '@/components/SettingsView';

function StatCard({ title, value, change, icon: Icon, trend }: {
  title: string; value: string; change?: string; icon: React.ElementType; trend?: 'up' | 'down' | 'neutral';
}) {
  return (
    <div className="card">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-zinc-400 text-sm">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
          {change && (
            <p className={cn('text-sm mt-1 flex items-center gap-1',
              trend === 'up' ? 'text-green-500' : trend === 'down' ? 'text-red-500' : 'text-zinc-400'
            )}>
              {trend === 'up' ? <ArrowUpRight size={14} /> : trend === 'down' ? <ArrowDownRight size={14} /> : null}
              {change}
            </p>
          )}
        </div>
        <div className={cn('p-3 rounded-lg',
          trend === 'up' ? 'bg-green-500/10 text-green-500' :
            trend === 'down' ? 'bg-red-500/10 text-red-500' : 'bg-zinc-800 text-zinc-400'
        )}>
          <Icon size={20} />
        </div>
      </div>
    </div>
  );
}

function NavItem({ icon: Icon, label, active, onClick, badge }: {
  icon: React.ElementType; label: string; active: boolean; onClick: () => void; badge?: number;
}) {
  return (
    <button onClick={onClick} className={cn(
      'w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-left',
      active ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:bg-zinc-800 hover:text-white'
    )}>
      <Icon size={20} />
      <span className="font-medium">{label}</span>
      {badge && badge > 0 && (
        <span className="ml-auto bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{badge}</span>
      )}
    </button>
  );
}

function TradeRow({ trade }: { trade: Trade }) {
  const pnl = trade.pnl || 0;
  const isProfit = pnl > 0;

  return (
    <div className="flex items-center justify-between py-3 border-b border-zinc-800 last:border-0 hover:bg-zinc-800/50 px-2 -mx-2 rounded">
      <div className="flex items-center gap-3">
        <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold',
          trade.direction === 'YES' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'
        )}>
          {trade.direction === 'YES' ? 'Y' : 'N'}
        </div>
        <div>
          <p className="font-medium text-sm">{trade.market_title.substring(0, 40)}{trade.market_title.length > 40 ? '...' : ''}</p>
          <p className="text-xs text-zinc-500">{trade.ticker} • {formatDateTime(trade.entry_time)}</p>
        </div>
      </div>
      <div className="text-right">
        <p className={cn('font-bold', isProfit ? 'text-green-500' : pnl < 0 ? 'text-red-500' : 'text-zinc-400')}>
          {trade.status === 'settled' ? formatPnL(pnl) : formatCurrency(trade.entry_price * trade.quantity)}
        </p>
        <p className="text-xs text-zinc-500">{trade.quantity} @ {formatCurrency(trade.entry_price, 2)}</p>
      </div>
    </div>
  );
}

function CSVUpload({ onUpload }: { onUpload: (trades: Trade[]) => void }) {
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const trades = parseGenericCSV(text);
      onUpload(trades);
    };
    reader.readAsText(file);
  }, [onUpload]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith('.csv')) handleFile(file);
  }, [handleFile]);

  return (
    <div onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)} onDrop={handleDrop}
      className={cn('border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer',
        isDragging ? 'border-indigo-500 bg-indigo-500/10' : 'border-zinc-700 hover:border-zinc-500'
      )}>
      <input type="file" accept=".csv" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        className="hidden" id="csv-upload" />
      <label htmlFor="csv-upload" className="cursor-pointer">
        <Upload className="mx-auto mb-3 text-zinc-400" size={32} />
        <p className="text-zinc-300 font-medium">Drop CSV here or click to upload</p>
        <p className="text-zinc-500 text-sm mt-1">Supports Kalshi & Polymarket exports</p>
      </label>
    </div>
  );
}

function PnLChart({ dailyStats }: { dailyStats: ReturnType<typeof calculateDailyStats> }) {
  if (dailyStats.length === 0) {
    return <div className="h-64 flex items-center justify-center text-zinc-500">Upload trades to see your P&L chart</div>;
  }
  const data = dailyStats.map(d => ({ date: formatDate(d.date), pnl: d.cumulative_pnl }));
  const isProfit = data[data.length - 1]?.pnl >= 0;

  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="pnlGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={isProfit ? '#22c55e' : '#ef4444'} stopOpacity={0.3} />
            <stop offset="95%" stopColor={isProfit ? '#22c55e' : '#ef4444'} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
        <XAxis dataKey="date" stroke="#71717a" fontSize={12} />
        <YAxis stroke="#71717a" fontSize={12} tickFormatter={(v) => `$${v}`} />
        <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '8px' }}
          formatter={(value: number) => [`$${value.toFixed(2)}`, 'Cumulative P&L']} />
        <Area type="monotone" dataKey="pnl" stroke={isProfit ? '#22c55e' : '#ef4444'} fill="url(#pnlGradient)" strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function WinRateChart({ stats }: { stats: ReturnType<typeof calculatePortfolioStats> }) {
  const data = [
    { name: 'Wins', value: stats.winning_trades, color: '#22c55e' },
    { name: 'Losses', value: stats.losing_trades, color: '#ef4444' },
  ];
  if (stats.total_trades === 0) return <div className="h-48 flex items-center justify-center text-zinc-500">No trades yet</div>;

  return (
    <div className="flex items-center justify-between">
      <ResponsiveContainer width={120} height={120}>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={35} outerRadius={50} paddingAngle={2} dataKey="value">
            {data.map((entry, i) => <Cell key={i} fill={entry.color} />)}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="flex-1 pl-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span className="text-sm text-zinc-400">{stats.winning_trades} Wins</span>
        </div>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <span className="text-sm text-zinc-400">{stats.losing_trades} Losses</span>
        </div>
        <div className="pt-2 border-t border-zinc-700">
          <span className="text-lg font-bold">{stats.win_rate.toFixed(1)}%</span>
          <span className="text-sm text-zinc-500 ml-2">win rate</span>
        </div>
      </div>
    </div>
  );
}

function DashboardView({
  trades,
  stats,
  dailyStats,
  filteredTrades,
  addTrades,
  clearTrades,
  handleExport,
  selectedTimeRange,
  setTimeRange,
  onViewAllTrades,
}: {
  trades: Trade[];
  stats: ReturnType<typeof calculatePortfolioStats>;
  dailyStats: ReturnType<typeof calculateDailyStats>;
  filteredTrades: Trade[];
  addTrades: (trades: Trade[]) => void;
  clearTrades: () => void;
  handleExport: () => void;
  selectedTimeRange: TimeRange;
  setTimeRange: (range: TimeRange) => void;
  onViewAllTrades?: () => void;
}) {
  return (
    <>
      <header className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">Dashboard</h2>
          <p className="text-zinc-500">Welcome back, trader</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleExport} className="btn-secondary flex items-center gap-2">
            <Download size={16} />Export
          </button>
          {trades.length > 0 && (
            <button onClick={clearTrades} className="btn-secondary flex items-center gap-2 text-red-400 hover:text-red-300">
              <X size={16} />Clear
            </button>
          )}
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Total P&L" value={formatPnL(stats.total_pnl)} change={`${stats.total_trades} trades`}
          icon={TrendingUp} trend={stats.total_pnl >= 0 ? 'up' : 'down'} />
        <StatCard title="Win Rate" value={`${stats.win_rate.toFixed(1)}%`} change={`${stats.winning_trades}W / ${stats.losing_trades}L`}
          icon={Trophy} trend={stats.win_rate >= 50 ? 'up' : 'down'} />
        <StatCard title="Sharpe Ratio" value={stats.sharpe_ratio.toFixed(2)} change="Risk-adjusted return"
          icon={Shield} trend={stats.sharpe_ratio >= 1 ? 'up' : stats.sharpe_ratio >= 0 ? 'neutral' : 'down'} />
        <StatCard title="Max Drawdown" value={formatCurrency(stats.max_drawdown)}
          change={stats.max_drawdown_date ? formatDate(stats.max_drawdown_date) : 'N/A'} icon={TrendingDown} trend="down" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Cumulative P&L</h3>
            <div className="flex gap-2">
              {(['1W', '1M', '3M', 'ALL'] as TimeRange[]).map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={cn(
                    'px-3 py-1 text-sm rounded-lg transition',
                    selectedTimeRange === range ? 'bg-indigo-600 text-white' : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
                  )}
                >
                  {range}
                </button>
              ))}
            </div>
          </div>
          <PnLChart dailyStats={dailyStats} />
        </div>

        <div className="card">
          <h3 className="font-semibold mb-4">Win/Loss Ratio</h3>
          <WinRateChart stats={stats} />
        </div>

        <div className="card">
          <h3 className="font-semibold mb-4">Import Trades</h3>
          <CSVUpload onUpload={addTrades} />
        </div>

        <div className="lg:col-span-2 card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Recent Trades</h3>
            <button
              type="button"
              onClick={onViewAllTrades}
              className="text-sm text-indigo-400 hover:text-indigo-300"
            >
              View All →
            </button>
          </div>
          <div className="space-y-1">
            {filteredTrades.length === 0 ? (
              <p className="text-zinc-500 text-center py-8">No trades yet. Import your CSV to get started.</p>
            ) : filteredTrades.slice(0, 5).map((trade) => <TradeRow key={trade.id} trade={trade} />)}
          </div>
        </div>

        <div className="card">
          <h3 className="font-semibold mb-4">Performance Metrics</h3>
          <div className="space-y-4">
            <div className="flex justify-between"><span className="text-zinc-400">Profit Factor</span>
              <span className="font-medium">{stats.profit_factor === Infinity ? '∞' : stats.profit_factor.toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-zinc-400">Sortino Ratio</span>
              <span className="font-medium">{stats.sortino_ratio.toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-zinc-400">Avg Win</span>
              <span className="font-medium text-green-500">{formatCurrency(stats.avg_win)}</span></div>
            <div className="flex justify-between"><span className="text-zinc-400">Avg Loss</span>
              <span className="font-medium text-red-500">{formatCurrency(stats.avg_loss)}</span></div>
            <div className="flex justify-between"><span className="text-zinc-400">Best Trade</span>
              <span className="font-medium text-green-500">{formatCurrency(stats.best_trade)}</span></div>
            <div className="flex justify-between"><span className="text-zinc-400">Worst Trade</span>
              <span className="font-medium text-red-500">{formatCurrency(stats.worst_trade)}</span></div>
            <div className="flex justify-between"><span className="text-zinc-400">Avg Hold Time</span>
              <span className="font-medium">{stats.avg_hold_time_hours.toFixed(1)}h</span></div>
            <div className="flex justify-between pt-3 border-t border-zinc-700">
              <span className="text-zinc-400">Kelly Fraction</span>
              <span className="font-medium text-indigo-400">{(stats.kelly_fraction * 100).toFixed(1)}%</span></div>
          </div>
        </div>
      </div>
    </>
  );
}

function TradesView({ trades }: { trades: Trade[] }) {
  const [filter, setFilter] = useState<'all' | 'open' | 'settled'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'pnl'>('date');

  const filteredTrades = useMemo(() => {
    let result = [...trades];
    if (filter !== 'all') result = result.filter(t => t.status === filter);
    result.sort((a, b) => sortBy === 'pnl'
      ? (b.pnl || 0) - (a.pnl || 0)
      : new Date(b.entry_time).getTime() - new Date(a.entry_time).getTime()
    );
    return result;
  }, [trades, filter, sortBy]);

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div><h2 className="text-2xl font-bold">All Trades</h2><p className="text-zinc-500">{trades.length} total trades</p></div>
        <div className="flex gap-2">
          <select value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)}
            className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm">
            <option value="all">All Trades</option><option value="open">Open</option><option value="settled">Settled</option>
          </select>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm">
            <option value="date">Sort by Date</option><option value="pnl">Sort by P&L</option>
          </select>
        </div>
      </div>
      <div className="card">
        {filteredTrades.length === 0
          ? <p className="text-zinc-500 text-center py-8">No trades match your filters</p>
          : filteredTrades.map((trade) => <TradeRow key={trade.id} trade={trade} />)}
      </div>
    </>
  );
}

function PositionsView({ trades }: { trades: Trade[] }) {
  const openPositions = useMemo(() => trades.filter(t => t.status === 'open'), [trades]);
  const totalExposure = useMemo(() => openPositions.reduce((sum, t) => sum + (t.entry_price * t.quantity), 0), [openPositions]);

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div><h2 className="text-2xl font-bold">Open Positions</h2><p className="text-zinc-500">{openPositions.length} active positions</p></div>
        <div className="card py-3 px-4"><p className="text-sm text-zinc-400">Total Exposure</p><p className="text-xl font-bold">{formatCurrency(totalExposure)}</p></div>
      </div>
      <div className="card">
        {openPositions.length === 0
          ? <p className="text-zinc-500 text-center py-8">No open positions</p>
          : openPositions.map((trade) => <TradeRow key={trade.id} trade={trade} />)}
      </div>
    </>
  );
}

export default function Dashboard() {
  const {
    trades,
    viewMode,
    setViewMode,
    addTrades,
    clearTrades,
    alerts,
    selectedTimeRange,
    setTimeRange,
    filterState,
    addAlert,
  } = useTradingStore();
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const drawdownAlertSent = useRef(false);

  useEffect(() => {
    const saved = localStorage.getItem('praxis-settings');
    if (saved) setSettings(JSON.parse(saved));
  }, []);

  const timeFilteredTrades = useMemo(
    () => filterTradesByTimeRange(trades, selectedTimeRange),
    [trades, selectedTimeRange]
  );
  const stats = useMemo(() => calculatePortfolioStats(timeFilteredTrades), [timeFilteredTrades]);
  const dailyStats = useMemo(() => calculateDailyStats(timeFilteredTrades), [timeFilteredTrades]);

  const filteredTradesForDashboard = useMemo(() => {
    let r = timeFilteredTrades;
    if (filterState.platform !== 'all') r = r.filter((t) => t.platform === filterState.platform);
    if (filterState.status !== 'all') r = r.filter((t) => t.status === filterState.status);
    if (filterState.direction !== 'all') r = r.filter((t) => t.direction === filterState.direction);
    if (filterState.searchQuery) {
      const q = filterState.searchQuery.toLowerCase();
      r = r.filter(
        (t) =>
          t.market_title.toLowerCase().includes(q) || t.ticker.toLowerCase().includes(q)
      );
    }
    return r;
  }, [timeFilteredTrades, filterState]);

  const unacknowledgedAlerts = alerts.filter((a) => !a.acknowledged).length;

  useEffect(() => {
    const thresholdPct = settings?.alertThresholds?.drawdownPct ?? 10;
    if (
      stats.total_trades > 0 &&
      stats.max_drawdown > 0 &&
      !drawdownAlertSent.current &&
      thresholdPct > 0
    ) {
      const peak = stats.total_pnl + stats.max_drawdown;
      const drawdownPct = peak !== 0 ? (stats.max_drawdown / Math.abs(peak)) * 100 : 0;
      if (drawdownPct >= thresholdPct) {
        drawdownAlertSent.current = true;
        addAlert({
          id: `drawdown-${Date.now()}`,
          type: 'drawdown',
          priority: drawdownPct >= 20 ? 'high' : 'medium',
          title: 'Drawdown alert',
          message: `Max drawdown reached $${stats.max_drawdown.toFixed(2)} (${drawdownPct.toFixed(1)}% of peak).`,
          triggered_at: new Date(),
          acknowledged: false,
        });
      }
    }
  }, [stats.max_drawdown, stats.total_pnl, stats.total_trades, settings?.alertThresholds?.drawdownPct, addAlert]);

  const handleExport = () => {
    const csv = exportTradesToCSV(trades);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `praxis-trades-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const renderView = () => {
    switch (viewMode) {
      case 'dashboard':
        return (
          <DashboardView
            trades={trades}
            stats={stats}
            dailyStats={dailyStats}
            filteredTrades={filteredTradesForDashboard}
            addTrades={addTrades}
            clearTrades={clearTrades}
            handleExport={handleExport}
            selectedTimeRange={selectedTimeRange}
            setTimeRange={setTimeRange}
            onViewAllTrades={() => setViewMode('trades')}
          />
        );
      case 'trades':
        return <TradesView trades={trades} />;
      case 'positions':
        return <PositionsView trades={trades} />;
      case 'analytics':
        return <AnalyticsView trades={timeFilteredTrades} stats={stats} />;
      case 'arbitrage':
        return (
          <ArbitrageView
            kalshiApiKey={settings?.kalshiApiKey}
            polymarketConnected={!!settings?.polymarketWallet}
          />
        );
      case 'ai':
        return (
          <AIInsightsView
            trades={trades}
            stats={stats}
            apiKey={settings?.anthropicApiKey}
          />
        );
      case 'alerts':
        return <AlertsView />;
      case 'settings':
        return (
          <SettingsView
            onSave={setSettings}
            initialSettings={settings || undefined}
          />
        );
      default:
        return null;
    }
  };

  return (
    <>
      <SignedOut>
        <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f] p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 max-w-md w-full text-center">
            <h1 className="text-2xl font-bold mb-2">Welcome to PRAXIS</h1>
            <p className="text-zinc-400 mb-6">
              Sign in to access your trading dashboard, arbitrage scanner, and AI insights.
            </p>
            <Link
              href="/sign-in"
              className="block w-full bg-indigo-600 hover:bg-indigo-700 text-center py-3 rounded-lg font-medium transition"
            >
              Sign in
            </Link>
            <p className="text-sm text-zinc-500 mt-4">
              Don&apos;t have an account?{' '}
              <Link href="/sign-up" className="text-indigo-400 hover:text-indigo-300">
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </SignedOut>
      <SignedIn>
        <div className="min-h-screen flex">
          <button
            className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-zinc-800 rounded-lg"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <Menu size={20} />
          </button>

          <aside
            className={cn(
              'w-64 bg-[#0d0d12] border-r border-zinc-800 p-4 flex flex-col fixed h-full z-40 transition-transform lg:translate-x-0',
              sidebarOpen ? 'translate-x-0' : '-translate-x-full'
            )}
          >
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                <Zap size={20} className="text-white" />
              </div>
              <div>
                <h1 className="font-bold text-lg">PRAXIS</h1>
                <p className="text-xs text-zinc-500">cevict.ai</p>
              </div>
            </div>

            <nav className="space-y-1 flex-1">
              <NavItem
                icon={BarChart3}
                label="Dashboard"
                active={viewMode === 'dashboard'}
                onClick={() => setViewMode('dashboard')}
              />
              <NavItem
                icon={TrendingUp}
                label="Trades"
                active={viewMode === 'trades'}
                onClick={() => setViewMode('trades')}
              />
              <NavItem
                icon={Wallet}
                label="Positions"
                active={viewMode === 'positions'}
                onClick={() => setViewMode('positions')}
              />
              <NavItem
                icon={Target}
                label="Analytics"
                active={viewMode === 'analytics'}
                onClick={() => setViewMode('analytics')}
              />
              <NavItem
                icon={Zap}
                label="Arbitrage"
                active={viewMode === 'arbitrage'}
                onClick={() => setViewMode('arbitrage')}
              />
              <NavItem
                icon={Brain}
                label="AI Insights"
                active={viewMode === 'ai'}
                onClick={() => setViewMode('ai')}
              />
              <NavItem
                icon={Bell}
                label="Alerts"
                active={viewMode === 'alerts'}
                onClick={() => setViewMode('alerts')}
                badge={unacknowledgedAlerts}
              />
              <NavItem
                icon={Settings}
                label="Settings"
                active={viewMode === 'settings'}
                onClick={() => setViewMode('settings')}
              />
            </nav>

            <div className="pt-4 border-t border-zinc-800">
              <p className="text-xs text-zinc-600 text-center">v0.1.0 • Your Trading Edge</p>
            </div>
          </aside>

          <main className="flex-1 p-6 overflow-auto lg:ml-64">{renderView()}</main>
        </div>
      </SignedIn>
    </>
  );
}
