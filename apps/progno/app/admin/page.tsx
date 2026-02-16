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
        <div className="p-3 rounded-lg" style={{ backgroundColor: `${color}15` }}>
          <div style={{ color }}>{icon}</div>
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

  // Quick date selectors
  const setQuickDate = useCallback((type: 'today' | 'yesterday' | 'last7' | 'last30') => {
    const today = new Date();
    let targetDate: Date;
    switch (type) {
      case 'today': targetDate = today; break;
      case 'yesterday': targetDate = subDays(today, 1); break;
      case 'last7': targetDate = subDays(today, 7); break;
      case 'last30': targetDate = subDays(today, 30); break;
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
          <div className="text-center py-12">
            <BarChart3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900">Reports Loading...</h3>
            <p className="text-sm text-gray-500 mt-2">Charts and visualizations will appear here</p>
          </div>
        )}

        {activeTab === 'automation' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {['friday', 'monday', 'daily'].map((action) => (
              <div key={action} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-semibold capitalize">{action} Run</h3>
                <button className="mt-4 w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  Run Now
                </button>
              </div>
            ))}
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
