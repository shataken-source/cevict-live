'use client'

import { TradingStats } from '@/types/trading'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

interface PerformanceChartProps {
  stats: TradingStats
}

export default function PerformanceChart({ stats }: PerformanceChartProps) {
  // Generate mock historical data (in production, fetch from API)
  const data = Array.from({ length: 30 }, (_, i) => {
    const date = new Date()
    date.setDate(date.getDate() - (29 - i))
    return {
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      kalshi: Math.max(0, stats.kalshi.totalPnL + (Math.random() - 0.5) * 50),
      coinbase: Math.max(0, stats.coinbase.totalPnL + (Math.random() - 0.5) * 100),
      combined: Math.max(0, stats.combined.totalPnL + (Math.random() - 0.5) * 150),
    }
  })

  return (
    <div className="bg-gray-900/50 rounded-xl p-6 border border-gray-700/50 backdrop-blur-sm">
      <h2 className="text-xl font-bold mb-6">Performance Trend</h2>
      
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis 
            dataKey="date" 
            stroke="#9ca3af"
            fontSize={12}
          />
          <YAxis 
            stroke="#9ca3af"
            fontSize={12}
            tickFormatter={(value) => `$${value.toFixed(0)}`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1f2937',
              border: '1px solid #374151',
              borderRadius: '8px',
            }}
            labelStyle={{ color: '#9ca3af' }}
            formatter={(value: number) => [`$${value.toFixed(2)}`, '']}
          />
          <Legend 
            wrapperStyle={{ paddingTop: '20px' }}
          />
          <Line 
            type="monotone" 
            dataKey="kalshi" 
            stroke="#3b82f6" 
            strokeWidth={2}
            name="Kalshi"
            dot={false}
          />
          <Line 
            type="monotone" 
            dataKey="coinbase" 
            stroke="#a855f7" 
            strokeWidth={2}
            name="Coinbase"
            dot={false}
          />
          <Line 
            type="monotone" 
            dataKey="combined" 
            stroke="#10b981" 
            strokeWidth={3}
            name="Combined"
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

