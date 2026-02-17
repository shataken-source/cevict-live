'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  ResponsiveContainer,
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
  Download,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  BarChart3,
  PieChart as PieChartIcon,
  LineChart as LineChartIcon,
  Calendar as CalendarIcon,
  Zap,
  Shield,
  Database,
  Settings,
  Clock,
  ChevronRight,
  CheckCircle,
  XCircle,
  AlertCircle,
  Users,
  Filter
} from 'lucide-react';
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isValid, parseISO } from 'date-fns';

// Chart color palette
const COLORS = {
  primary: '#3b82f6',
  secondary: '#10b981',
  accent: '#f59e0b',
  danger: '#ef4444',
  purple: '#8b5cf6',
  pink: '#ec4899',
  cyan: '#06b6d4',
  slate: '#64748b'
};

const CHART_COLORS = [COLORS.primary, COLORS.secondary, COLORS.accent, COLORS.purple, COLORS.pink, COLORS.cyan];

interface DateRange {
  single: string;
  week: { start: string; end: string };
  month: { start: string; end: string };
}

interface ReportData {
  reportType: string;
  generatedAt: string;
  dateRange: { single?: string; all?: number };
  [key: string]: any;
}

interface StatsCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: React.ReactNode;
  color: string;
}

function StatsCard({ title, value, change, changeType, icon, color }: StatsCardProps) {
  const bgColorClass = color === '#3b82f6' ? 'bg-blue-100' :
    color === '#10b981' ? 'bg-green-100' :
      color === '#f59e0b' ? 'bg-amber-100' :
        color === '#ef4444' ? 'bg-red-100' :
          color === '#8b5cf6' ? 'bg-purple-100' :
            color === '#ec4899' ? 'bg-pink-100' :
              color === '#06b6d4' ? 'bg-cyan-100' :
                'bg-slate-100';

  const textColorClass = color === '#3b82f6' ? 'text-blue-600' :
    color === '#10b981' ? 'text-green-600' :
      color === '#f59e0b' ? 'text-amber-600' :
        color === '#ef4444' ? 'text-red-600' :
          color === '#8b5cf6' ? 'text-purple-600' :
            color === '#ec4899' ? 'text-pink-600' :
              color === '#06b6d4' ? 'text-cyan-600' :
                'text-slate-600';

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {change && (
            <p className={`text-sm mt-1 flex items-center ${changeType === 'positive' ? 'text-green-600' :
              changeType === 'negative' ? 'text-red-600' : 'text-gray-600'
              }`}>
              {changeType === 'positive' ? <TrendingUp className="w-4 h-4 mr-1" /> :
                changeType === 'negative' ? <TrendingDown className="w-4 h-4 mr-1" /> : null}
              {change}
            </p>
          )}
        </div>
        <div className={`p-3 rounded-lg ${bgColorClass}`}>
          <div className={textColorClass}>{icon}</div>
        </div>
      </div>
    </div>
  );
}

export default function PrognoAdminDashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'reports' | 'automation' | 'system'>('overview');
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [dateRange, setDateRange] = useState<DateRange>({
    single: format(new Date(), 'yyyy-MM-dd'),
    week: { start: format(startOfWeek(new Date()), 'yyyy-MM-dd'), end: format(endOfWeek(new Date()), 'yyyy-MM-dd') },
    month: { start: format(startOfMonth(new Date()), 'yyyy-MM-dd'), end: format(endOfMonth(new Date()), 'yyyy-MM-dd') }
  });
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<Record<string, ReportData>>({});

  // Update all date ranges when single date changes
  const handleDateChange = useCallback((newDate: string) => {
    if (!newDate) return;
    const date = parseISO(newDate);
    if (!isValid(date)) return;

    setSelectedDate(newDate);
    setDateRange({
      single: newDate,
      week: {
        start: format(startOfWeek(date), 'yyyy-MM-dd'),
        end: format(endOfWeek(date), 'yyyy-MM-dd')
      },
      month: {
        start: format(startOfMonth(date), 'yyyy-MM-dd'),
        end: format(endOfMonth(date), 'yyyy-MM-dd')
      }
    });
  }, []);

  // Calculate early lines date (4 days ahead)
  const earlyDate = useCallback(() => {
    const date = parseISO(selectedDate);
    const early = new Date(date);
    early.setDate(early.getDate() + 4);
    return format(early, 'yyyy-MM-dd');
  }, [selectedDate]);

  // Quick date selectors
  const setQuickDate = useCallback((type: 'today' | 'yesterday' | 'last7' | 'last30' | 'early') => {
    const today = new Date();
    let targetDate: Date;
    switch (type) {
      case 'today': targetDate = today; break;
      case 'yesterday': targetDate = subDays(today, 1); break;
      case 'last7': targetDate = subDays(today, 7); break;
      case 'last30': targetDate = subDays(today, 30); break;
      case 'early':
        targetDate = new Date(today);
        targetDate.setDate(targetDate.getDate() + 4);
        break;
      default: targetDate = today;
    }
    handleDateChange(format(targetDate, 'yyyy-MM-dd'));
  }, [handleDateChange]);

  const fetchReport = async (reportType: string) => {
    setLoading(true);
    try {
      const response = await fetch('/api/progno/admin/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          secret: process.env.NEXT_PUBLIC_ADMIN_PASSWORD || '',
          reportType,
          date: dateRange.single
        })
      });
      if (!response.ok) throw new Error('Failed to fetch report');
      const data = await response.json();
      setReportData(prev => ({ ...prev, [reportType]: data }));
    } catch (error) {
      console.error('Error fetching report:', error);
    } finally {
      setLoading(false);
    }
  };

  // Auto-fetch when date or tab changes
  useEffect(() => {
    if (activeTab === 'reports') {
      fetchReport('performance-by-sport');
      fetchReport('value-bets-analysis');
      fetchReport('confidence-vs-results');
    }
  }, [dateRange.single, activeTab]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with Date Controls */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Shield className="w-8 h-8 text-blue-600 mr-3" />
              <h1 className="text-xl font-bold text-gray-900">Progno Admin Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              {/* Quick Date Buttons */}
              <div className="flex items-center bg-gray-100 rounded-lg p-1">
                <button onClick={() => setQuickDate('today')} className="px-3 py-1 text-sm rounded-md hover:bg-white transition-colors">Today</button>
                <button onClick={() => setQuickDate('yesterday')} className="px-3 py-1 text-sm rounded-md hover:bg-white transition-colors">Yesterday</button>
                <button onClick={() => setQuickDate('last7')} className="px-3 py-1 text-sm rounded-md hover:bg-white transition-colors">7 Days</button>
                <button onClick={() => setQuickDate('last30')} className="px-3 py-1 text-sm rounded-md hover:bg-white transition-colors">30 Days</button>
                <button onClick={() => setQuickDate('early')} className="px-3 py-1 text-sm rounded-md hover:bg-white transition-colors text-blue-600 font-medium">Early (+4)</button>
              </div>
              {/* Date Input - Single source of truth */}
              <div className="flex items-center space-x-2">
                <CalendarIcon className="w-5 h-5 text-gray-400" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => handleDateChange(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  aria-label="Select date"
                  title="Select date"
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
              { id: 'system', label: 'System', icon: Settings }
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
        <div className="bg-blue-50 rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <CalendarIcon className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-blue-900">Active Date Range (Auto-Updated)</p>
                <p className="text-sm text-blue-700">
                  Day: {dateRange.single} | Week: {dateRange.week.start} → {dateRange.week.end} | Month: {dateRange.month.start} → {dateRange.month.end}
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  Early Lines: {earlyDate()} (+4 days ahead)
                </p>
              </div>
            </div>
          </div>
        </div>

        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatsCard title="Total Bets" value="0" icon={<Target className="w-6 h-6" />} color={COLORS.primary} />
            <StatsCard title="Win Rate" value="0.0%" icon={<TrendingUp className="w-6 h-6" />} color={COLORS.secondary} />
            <StatsCard title="Total Profit" value="$0.00" icon={<DollarSign className="w-6 h-6" />} color={COLORS.secondary} />
            <StatsCard title="Active Sports" value="0" icon={<Activity className="w-6 h-6" />} color={COLORS.accent} />
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <button
                onClick={() => fetchReport('performance-by-sport')}
                className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-4 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
              >
                <BarChart3 className="w-5 h-5" />
                Performance by Sport
              </button>
              <button
                onClick={() => fetchReport('value-bets-analysis')}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-4 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
              >
                <TrendingUp className="w-5 h-5" />
                Value Bets Analysis
              </button>
              <button
                onClick={() => fetchReport('confidence-vs-results')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-4 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
              >
                <PieChartIcon className="w-5 h-5" />
                Confidence vs Results
              </button>
              <button
                onClick={() => fetchReport('monthly-summary')}
                className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-4 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
              >
                <Calendar className="w-5 h-5" />
                Monthly Summary
              </button>
              <button
                onClick={() => fetchReport('streak-analysis')}
                className="bg-red-600 hover:bg-red-700 text-white px-6 py-4 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
              >
                <Activity className="w-5 h-5" />
                Streak Analysis
              </button>
              <button
                onClick={() => fetchReport('roi-by-odds')}
                className="bg-cyan-600 hover:bg-cyan-700 text-white px-6 py-4 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
              >
                <DollarSign className="w-5 h-5" />
                ROI by Odds Range
              </button>
            </div>

            {loading && (
              <div className="text-center py-8">
                <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mx-auto" />
                <p className="mt-4 text-gray-600">Loading report...</p>
              </div>
            )}

            {Object.keys(reportData).length > 0 && !loading && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-semibold mb-4">Report Results</h3>
                <pre className="bg-gray-50 p-4 rounded-lg overflow-auto max-h-96 text-sm">
                  {JSON.stringify(reportData, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}

        {activeTab === 'automation' && (
          <div className="space-y-6">
            {/* Viewer Buttons */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-semibold mb-4">Viewers</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <a
                  href="/cevict-picks-viewer/index.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
                >
                  <BarChart3 className="w-5 h-5" />
                  Open Picks Viewer
                </a>
                <a
                  href="/cevict-probability-analyzer/index.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
                >
                  <PieChartIcon className="w-5 h-5" />
                  Probability Analyzer
                </a>
                <a
                  href="/cevict-arb-tool/index.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
                >
                  <DollarSign className="w-5 h-5" />
                  Arbitrage Tool
                </a>
              </div>
            </div>

            {/* Automation Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-semibold capitalize">Daily Predictions</h3>
                <p className="text-sm text-gray-500 mt-1">Generate picks for {dateRange.single}</p>
                <button
                  onClick={() => window.open(`/api/cron/daily-predictions?date=${dateRange.single}`, '_blank')}
                  className="mt-4 w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Run Now
                </button>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-semibold capitalize">Early Lines</h3>
                <p className="text-sm text-gray-500 mt-1">Generate early lines for {earlyDate()}</p>
                <button
                  onClick={() => window.open(`/api/cron/daily-predictions?earlyLines=1&date=${earlyDate()}`, '_blank')}
                  className="mt-4 w-full py-2 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Run Early Lines
                </button>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-semibold capitalize">Sync Odds</h3>
                <p className="text-sm text-gray-500 mt-1">Refresh odds from all sources</p>
                <button
                  onClick={() => window.open('/api/cron/sync-odds', '_blank')}
                  className="mt-4 w-full py-2 px-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  Sync Now
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'system' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold mb-4">System Status</h3>
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span>All systems operational</span>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
