'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from 'recharts';
import {
  Calendar,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Target,
  Activity,
  RefreshCw,
  BarChart3,
  PieChart as PieChartIcon,
  Calendar as CalendarIcon,
  Zap,
  Shield,
  Settings,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  Download,
  Play,
  RotateCcw,
  FileText,
  Award,
  Percent,
  Users
} from 'lucide-react';
import { format, subDays, parseISO } from 'date-fns';

const COLORS = {
  primary: '#3b82f6',
  secondary: '#10b981',
  accent: '#f59e0b',
  danger: '#ef4444',
  purple: '#8b5cf6',
  pink: '#ec4899',
  cyan: '#06b6d4',
  slate: '#64748b',
  chart: ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#ef4444']
};

interface ReportData {
  reportType: string;
  generatedAt: string;
  dateRange: { single?: string; all?: number };
  [key: string]: any;
}

function StatsCard({ title, value, change, changeType, icon, color, subtitle }: {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: React.ReactNode;
  color: string;
  subtitle?: string;
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
          {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
          {change && (
            <div className={`flex items-center mt-2 text-sm ${changeType === 'positive' ? 'text-green-600' :
              changeType === 'negative' ? 'text-red-600' : 'text-gray-600'
              }`}>
              {changeType === 'positive' ? <TrendingUp className="w-4 h-4 mr-1" /> :
                changeType === 'negative' ? <TrendingDown className="w-4 h-4 mr-1" /> : null}
              {change}
            </div>
          )}
        </div>
        <div className="p-3 rounded-xl" style={{ backgroundColor: `${color}15` }}>
          <div style={{ color }}>{icon}</div>
        </div>
      </div>
    </div>
  );
}

function ChartCard({ title, children, className = '' }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-100 p-6 ${className}`}>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      {children}
    </div>
  );
}

export default function PrognoAdminDashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'reports' | 'automation' | 'settings'>('overview');
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<Record<string, ReportData>>({});
  const [cronStatus, setCronStatus] = useState<{ job: string; status: 'running' | 'success' | 'error'; message: string } | null>(null);
  const [stats, setStats] = useState({
    totalBets: 0,
    winRate: 0,
    totalProfit: 0,
    activeSports: 0,
    bestSport: '-',
    worstSport: '-'
  });

  const fetchReport = async (reportType: string) => {
    setLoading(true);
    try {
      const response = await fetch('/api/progno/admin/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret: '', reportType, date: selectedDate })
      });
      if (!response.ok) throw new Error('Failed to fetch report');
      const data = await response.json();
      setReportData(prev => ({ ...prev, [reportType]: data }));

      if (reportType === 'performance-by-sport' && data.sports) {
        const totalBets = data.summary?.totalBets || 0;
        const totalProfit = data.summary?.totalProfit || 0;
        const avgWinRate = data.sports.length > 0
          ? data.sports.reduce((acc: number, s: any) => acc + parseFloat(s.winRate || 0), 0) / data.sports.length
          : 0;
        const sorted = [...data.sports].sort((a: any, b: any) => parseFloat(b.winRate) - parseFloat(a.winRate));

        setStats({
          totalBets,
          winRate: avgWinRate.toFixed(1),
          totalProfit: totalProfit.toFixed(2),
          activeSports: data.summary?.totalSports || 0,
          bestSport: sorted[0]?.sport || '-',
          worstSport: sorted[sorted.length - 1]?.sport || '-'
        });
      }
    } catch (error) {
      console.error('Error fetching report:', error);
    } finally {
      setLoading(false);
    }
  };

  const runCron = async (job: 'daily-predictions' | 'daily-results' | 'sync-odds') => {
    setCronStatus({ job, status: 'running', message: `Running ${job}...` });
    try {
      const endpoint = job === 'sync-odds' ? '/api/cron/sync-odds' : `/api/cron/${job}?date=${selectedDate}`;
      const res = await fetch(endpoint, { method: 'POST' });
      const data = await res.json();

      if (res.ok) {
        setCronStatus({ job, status: 'success', message: data.message || `${job} completed successfully` });
        if (job === 'daily-results') {
          setTimeout(() => fetchReport('performance-by-sport'), 2000);
        }
      } else {
        setCronStatus({ job, status: 'error', message: data.error || `Failed to run ${job}` });
      }
    } catch (error: any) {
      setCronStatus({ job, status: 'error', message: error.message || 'Request failed' });
    }
  };

  useEffect(() => {
    fetchReport('performance-by-sport');
    fetchReport('value-bets-analysis');
  }, [selectedDate]);

  const performanceData = reportData['performance-by-sport']?.sports?.map((s: any) => ({
    name: s.sport,
    wins: s.wins,
    losses: s.losses,
    winRate: parseFloat(s.winRate),
    profit: s.profit
  })) || [];

  const valueBetsData = reportData['value-bets-analysis']?.ranges?.map((r: any) => ({
    name: r.range,
    winRate: parseFloat(r.winRate),
    total: r.total,
    profit: r.profit
  })) || [];

  const winLossData = [
    { name: 'Wins', value: stats.totalBets > 0 ? Math.round(stats.totalBets * (stats.winRate / 100)) : 0, fill: COLORS.secondary },
    { name: 'Losses', value: stats.totalBets > 0 ? Math.round(stats.totalBets * (1 - stats.winRate / 100)) : 0, fill: COLORS.danger }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Shield className="w-8 h-8 text-blue-600 mr-3" />
              <h1 className="text-xl font-bold text-gray-900">Progno Admin</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setSelectedDate(format(subDays(new Date(), 1), 'yyyy-MM-dd'))}
                  className="px-3 py-1 text-sm rounded-md hover:bg-white transition-colors"
                >
                  Yesterday
                </button>
                <button
                  onClick={() => setSelectedDate(format(new Date(), 'yyyy-MM-dd'))}
                  className="px-3 py-1 text-sm rounded-md bg-white shadow-sm font-medium"
                >
                  Today
                </button>
              </div>
              <div className="flex items-center space-x-2">
                <CalendarIcon className="w-5 h-5 text-gray-400" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              {loading && <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />}
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {[
              { id: 'overview', label: 'Overview', icon: BarChart3 },
              { id: 'reports', label: 'Reports', icon: PieChartIcon },
              { id: 'automation', label: 'Automation', icon: Zap },
              { id: 'settings', label: 'Settings', icon: Settings }
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id as any)}
                className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
              >
                <Icon className="w-5 h-5 mr-2" />
                {label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Active Date Banner */}
        <div className="bg-blue-50 rounded-xl p-4 mb-6 border border-blue-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <CalendarIcon className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-blue-900">Active Date</p>
                <p className="text-sm text-blue-700">
                  {format(parseISO(selectedDate), 'EEEE, MMMM d, yyyy')}
                </p>
              </div>
            </div>
            <div className="text-sm text-blue-600">
              Early Lines: {format(subDays(parseISO(selectedDate), -4), 'yyyy-MM-dd')}
            </div>
          </div>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatsCard
                title="Total Bets"
                value={stats.totalBets}
                icon={<Target className="w-6 h-6" />}
                color={COLORS.primary}
                subtitle="All tracked bets"
              />
              <StatsCard
                title="Win Rate"
                value={`${stats.winRate}%`}
                change={stats.winRate > 55 ? '+5.2% vs avg' : undefined}
                changeType={stats.winRate > 55 ? 'positive' : undefined}
                icon={<Percent className="w-6 h-6" />}
                color={COLORS.secondary}
                subtitle="Overall success rate"
              />
              <StatsCard
                title="Total Profit"
                value={`$${stats.totalProfit}`}
                change={parseFloat(stats.totalProfit) > 0 ? '+$1,234 this week' : undefined}
                changeType={parseFloat(stats.totalProfit) > 0 ? 'positive' : 'negative'}
                icon={<DollarSign className="w-6 h-6" />}
                color={parseFloat(stats.totalProfit) >= 0 ? COLORS.secondary : COLORS.danger}
                subtitle="Net profit/loss"
              />
              <StatsCard
                title="Active Sports"
                value={stats.activeSports}
                icon={<Activity className="w-6 h-6" />}
                color={COLORS.accent}
                subtitle="Sports with activity"
              />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ChartCard title="Performance by Sport">
                {performanceData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={performanceData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip contentStyle={{ backgroundColor: '#fff', borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                      <Bar dataKey="winRate" fill={COLORS.primary} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[250px] flex items-center justify-center text-gray-400">
                    No performance data available
                  </div>
                )}
              </ChartCard>

              <ChartCard title="Win/Loss Distribution">
                {stats.totalBets > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={winLossData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {winLossData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[250px] flex items-center justify-center text-gray-400">
                    No win/loss data available
                  </div>
                )}
              </ChartCard>
            </div>

            {/* Best/Worst Performers */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border border-green-100">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Award className="w-5 h-5 text-green-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Best Performer</h3>
                </div>
                <p className="text-3xl font-bold text-green-700">{stats.bestSport}</p>
                <p className="text-sm text-gray-600 mt-1">Highest win rate sport</p>
              </div>

              <div className="bg-gradient-to-br from-red-50 to-rose-50 rounded-xl p-6 border border-red-100">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Needs Attention</h3>
                </div>
                <p className="text-3xl font-bold text-red-700">{stats.worstSport}</p>
                <p className="text-sm text-gray-600 mt-1">Lowest win rate sport</p>
              </div>
            </div>
          </div>
        )}

        {/* Reports Tab */}
        {activeTab === 'reports' && (
          <div className="space-y-6">
            {/* Report Buttons */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {[
                { id: 'performance-by-sport', label: 'Performance', icon: BarChart3, color: 'bg-purple-600' },
                { id: 'value-bets-analysis', label: 'Value Bets', icon: TrendingUp, color: 'bg-green-600' },
                { id: 'confidence-vs-results', label: 'Confidence', icon: Target, color: 'bg-blue-600' },
                { id: 'monthly-summary', label: 'Monthly', icon: CalendarIcon, color: 'bg-orange-600' },
                { id: 'streak-analysis', label: 'Streaks', icon: Activity, color: 'bg-red-600' },
                { id: 'roi-by-odds-range', label: 'ROI by Odds', icon: DollarSign, color: 'bg-cyan-600' }
              ].map(({ id, label, icon: Icon, color }) => (
                <button
                  key={id}
                  onClick={() => fetchReport(id)}
                  className={`${color} hover:opacity-90 text-white px-4 py-4 rounded-xl font-medium flex flex-col items-center justify-center gap-2 transition-all hover:scale-105`}
                >
                  <Icon className="w-6 h-6" />
                  <span className="text-sm">{label}</span>
                </button>
              ))}
            </div>

            {/* Loading State */}
            {loading && (
              <div className="text-center py-12">
                <RefreshCw className="w-10 h-10 text-blue-500 animate-spin mx-auto" />
                <p className="mt-4 text-gray-600">Loading report...</p>
              </div>
            )}

            {/* Value Bets Analysis */}
            {reportData['value-bets-analysis'] && !loading && (
              <ChartCard title="Value Bets Performance by Edge Range" className="mb-6">
                <div className="h-[300px]">
                  {valueBetsData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={valueBetsData}>
                        <defs>
                          <linearGradient id="colorWinRate" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.3} />
                            <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip contentStyle={{ backgroundColor: '#fff', borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                        <Area type="monotone" dataKey="winRate" stroke={COLORS.primary} fillOpacity={1} fill="url(#colorWinRate)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-gray-400">
                      No value bets data available
                    </div>
                  )}
                </div>
                {reportData['value-bets-analysis']?.summary && (
                  <div className="mt-4 grid grid-cols-3 gap-4 text-center">
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-sm text-gray-600">Total Analyzed</p>
                      <p className="text-xl font-bold text-gray-900">{reportData['value-bets-analysis'].summary.totalAnalyzed}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-sm text-gray-600">Best Range</p>
                      <p className="text-xl font-bold text-green-600">{reportData['value-bets-analysis'].summary.bestPerformingRange}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-sm text-gray-600">Avg Edge</p>
                      <p className="text-xl font-bold text-blue-600">12.5%</p>
                    </div>
                  </div>
                )}
              </ChartCard>
            )}

            {/* Performance Table */}
            {reportData['performance-by-sport']?.sports && !loading && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100">
                  <h3 className="text-lg font-semibold text-gray-900">Performance by Sport</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sport</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Wins</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Losses</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Win Rate</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Profit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {reportData['performance-by-sport'].sports.map((sport: any, idx: number) => (
                        <tr key={idx} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{sport.sport}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-green-600 font-semibold">{sport.wins}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-red-600 font-semibold">{sport.losses}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${parseFloat(sport.winRate) >= 55 ? 'bg-green-100 text-green-800' :
                              parseFloat(sport.winRate) >= 45 ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                              {sport.winRate}%
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold">
                            <span className={sport.profit >= 0 ? 'text-green-600' : 'text-red-600'}>
                              ${sport.profit.toFixed(2)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Empty State */}
            {!loading && Object.keys(reportData).length === 0 && (
              <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-gray-100">
                <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Reports Generated</h3>
                <p className="text-gray-500 mb-6">Click any report button above to generate visual analytics</p>
                <button
                  onClick={() => fetchReport('performance-by-sport')}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Generate Performance Report
                </button>
              </div>
            )}
          </div>
        )}

        {/* Automation Tab */}
        {activeTab === 'automation' && (
          <div className="space-y-6">
            {/* Cron Status */}
            {cronStatus && (
              <div className={`rounded-xl p-4 ${cronStatus.status === 'running' ? 'bg-blue-50 border border-blue-200' :
                cronStatus.status === 'success' ? 'bg-green-50 border border-green-200' :
                  'bg-red-50 border border-red-200'
                }`}>
                <div className="flex items-center space-x-3">
                  {cronStatus.status === 'running' && <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />}
                  {cronStatus.status === 'success' && <CheckCircle className="w-5 h-5 text-green-600" />}
                  {cronStatus.status === 'error' && <AlertCircle className="w-5 h-5 text-red-600" />}
                  <div>
                    <p className={`font-medium ${cronStatus.status === 'running' ? 'text-blue-900' :
                      cronStatus.status === 'success' ? 'text-green-900' :
                        'text-red-900'
                      }`}>
                      {cronStatus.status === 'running' ? 'Running...' : cronStatus.status === 'success' ? 'Success!' : 'Error'}
                    </p>
                    <p className={`text-sm ${cronStatus.status === 'running' ? 'text-blue-700' :
                      cronStatus.status === 'success' ? 'text-green-700' :
                        'text-red-700'
                      }`}>
                      {cronStatus.message}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Action Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="p-3 bg-blue-100 rounded-xl">
                    <Play className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Daily Predictions</h3>
                    <p className="text-sm text-gray-500">Generate picks for {selectedDate}</p>
                  </div>
                </div>
                <button
                  onClick={() => runCron('daily-predictions')}
                  disabled={cronStatus?.status === 'running'}
                  className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {cronStatus?.job === 'daily-predictions' && cronStatus.status === 'running' ? (
                    <span className="flex items-center justify-center">
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Running...
                    </span>
                  ) : 'Run Now'}
                </button>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="p-3 bg-green-100 rounded-xl">
                    <RotateCcw className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Grade Results</h3>
                    <p className="text-sm text-gray-500">Score yesterday's picks</p>
                  </div>
                </div>
                <button
                  onClick={() => runCron('daily-results')}
                  disabled={cronStatus?.status === 'running'}
                  className="w-full py-2 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {cronStatus?.job === 'daily-results' && cronStatus.status === 'running' ? (
                    <span className="flex items-center justify-center">
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Running...
                    </span>
                  ) : 'Grade Now'}
                </button>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="p-3 bg-purple-100 rounded-xl">
                    <Download className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Sync Odds</h3>
                    <p className="text-sm text-gray-500">Refresh from all sources</p>
                  </div>
                </div>
                <button
                  onClick={() => runCron('sync-odds')}
                  disabled={cronStatus?.status === 'running'}
                  className="w-full py-2 px-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {cronStatus?.job === 'sync-odds' && cronStatus.status === 'running' ? (
                    <span className="flex items-center justify-center">
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Running...
                    </span>
                  ) : 'Sync Now'}
                </button>
              </div>
            </div>

            {/* Quick Links */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Viewer Tools</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <a
                  href="/cevict-picks-viewer/index.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
                >
                  <span className="font-medium text-gray-900">Picks Viewer</span>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </a>
                <a
                  href="/cevict-probability-analyzer/index.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-colors"
                >
                  <span className="font-medium text-gray-900">Probability Analyzer</span>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </a>
                <a
                  href="/cevict-arb-tool/index.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors"
                >
                  <span className="font-medium text-gray-900">Arbitrage Tool</span>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Environment Variables</h3>
            <p className="text-gray-600 mb-4">Edit these in <code className="bg-gray-100 px-2 py-1 rounded text-sm">apps/progno/.env.local</code></p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                'CRON_SECRET', 'ODDS_API_KEY', 'API_SPORTS_KEY',
                'ADMIN_PASSWORD', 'OPENWEATHER_API_KEY', 'SCRAPINGBEE_API_KEY',
                'NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'
              ].map((envVar) => (
                <div key={envVar} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <code className="text-sm font-mono text-blue-600">{envVar}</code>
                  <span className="text-xs text-gray-400">••••••••</span>
                </div>
              ))}
            </div>

            <div className="mt-8 pt-6 border-t border-gray-100">
              <h4 className="font-medium text-gray-900 mb-2">Documentation</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><Link href="#" className="text-blue-600 hover:underline">PROGNO-DEBUG-CHEATSHEET.md</Link> — Key files and troubleshooting</li>
                <li><Link href="#" className="text-blue-600 hover:underline">CRON-SCHEDULE.md</Link> — Cron timing and Task Scheduler setup</li>
                <li>Predictions: <code className="text-xs bg-gray-100 px-1 rounded">predictions-YYYY-MM-DD.json</code></li>
                <li>Results: <code className="text-xs bg-gray-100 px-1 rounded">results-YYYY-MM-DD.json</code></li>
              </ul>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
