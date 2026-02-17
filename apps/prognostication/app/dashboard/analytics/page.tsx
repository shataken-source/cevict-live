"use client"

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts"
import { TrendingUp, Target, Clock, AlertTriangle } from "lucide-react"

const performanceData = [
  { day: "Mon", ev: 2.3, signals: 12 },
  { day: "Tue", ev: 4.1, signals: 15 },
  { day: "Wed", ev: 1.8, signals: 8 },
  { day: "Thu", ev: 5.2, signals: 18 },
  { day: "Fri", ev: 3.9, signals: 14 },
  { day: "Sat", ev: 6.1, signals: 22 },
  { day: "Sun", ev: 4.5, signals: 16 },
]

const winRateData = [
  { category: "Sports", winRate: 68 },
  { category: "Politics", winRate: 72 },
  { category: "Crypto", winRate: 59 },
  { category: "Entertainment", winRate: 64 },
  { category: "Finance", winRate: 71 },
]

export default function AnalyticsPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold text-text-primary">Analytics</h1>
        <p className="text-text-secondary mt-1">
          Track your performance and signal effectiveness
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-panel border border-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={18} className="text-success" />
            <span className="text-sm text-text-muted">Signals Followed</span>
          </div>
          <div className="text-3xl font-semibold text-text-primary">47</div>
          <div className="text-xs text-text-muted mt-1">This month</div>
        </div>

        <div className="bg-panel border border-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-2">
            <Target size={18} className="text-primary" />
            <span className="text-sm text-text-muted">Win Rate</span>
          </div>
          <div className="text-3xl font-semibold text-success">64.2%</div>
          <div className="text-xs text-text-muted mt-1">+2.1% vs last month</div>
        </div>

        <div className="bg-panel border border-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-2">
            <Clock size={18} className="text-accent" />
            <span className="text-sm text-text-muted">Avg Entry Delay</span>
          </div>
          <div className="text-3xl font-semibold text-text-primary">3.2m</div>
          <div className="text-xs text-text-muted mt-1">From signal release</div>
        </div>

        <div className="bg-panel border border-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={18} className="text-warning" />
            <span className="text-sm text-text-muted">Missed Signals</span>
          </div>
          <div className="text-3xl font-semibold text-warning">12</div>
          <div className="text-xs text-text-muted mt-1">Above your EV threshold</div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* EV Trend */}
        <div className="bg-panel border border-border rounded-xl p-6">
          <h3 className="font-semibold text-text-primary mb-4">Realized EV Trend</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={performanceData}>
                <XAxis dataKey="day" stroke="#6B7280" />
                <YAxis stroke="#6B7280" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0F172A', border: '1px solid #1E293B' }}
                  labelStyle={{ color: '#F1F5F9' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="ev" 
                  stroke="#2563EB" 
                  strokeWidth={3}
                  dot={{ fill: '#2563EB', strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Win Rate by Category */}
        <div className="bg-panel border border-border rounded-xl p-6">
          <h3 className="font-semibold text-text-primary mb-4">Win Rate by Category</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={winRateData}>
                <XAxis dataKey="category" stroke="#6B7280" />
                <YAxis stroke="#6B7280" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0F172A', border: '1px solid #1E293B' }}
                  labelStyle={{ color: '#F1F5F9' }}
                />
                <Bar dataKey="winRate" fill="#16A34A" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Performance Table */}
      <div className="bg-panel border border-border rounded-xl overflow-hidden">
        <div className="p-4 border-b border-border">
          <h3 className="font-semibold text-text-primary">Recent Signal Performance</h3>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-surface text-text-muted">
            <tr>
              <th className="p-4 text-left">Signal</th>
              <th className="p-4 text-left">Entry Edge</th>
              <th className="p-4 text-left">Entry Delay</th>
              <th className="p-4 text-left">Outcome</th>
              <th className="p-4 text-left">Realized EV</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-border hover:bg-surface/50">
              <td className="p-4">Chiefs Win SB</td>
              <td className="p-4 text-success">+7.0%</td>
              <td className="p-4">2.1m</td>
              <td className="p-4 text-success">Won</td>
              <td className="p-4 text-success">+6.8%</td>
            </tr>
            <tr className="border-t border-border hover:bg-surface/50">
              <td className="p-4">BTC &gt; $100K</td>
              <td className="p-4 text-success">+11.0%</td>
              <td className="p-4">1.5m</td>
              <td className="p-4 text-text-muted">Pending</td>
              <td className="p-4 text-text-muted">—</td>
            </tr>
            <tr className="border-t border-border hover:bg-surface/50">
              <td className="p-4">Fed Rate Cut</td>
              <td className="p-4 text-danger">-5.0%</td>
              <td className="p-4">4.2m</td>
              <td className="p-4 text-danger">Lost</td>
              <td className="p-4 text-danger">-4.8%</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
