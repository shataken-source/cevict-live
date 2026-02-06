'use client'

import { TradingStats } from '@/types/trading'
import { TrendingUp, TrendingDown, DollarSign, Activity, Target, Zap } from 'lucide-react'
import { motion } from 'framer-motion'

interface StatsCardsProps {
  stats: TradingStats
}

export default function StatsCards({ stats }: StatsCardsProps) {
  const cards = [
    {
      title: 'Total Balance',
      value: `$${stats.combined.totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      change: stats.combined.totalPnL,
      icon: DollarSign,
      color: 'from-blue-500 to-cyan-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      title: 'Total P&L',
      value: `$${stats.combined.totalPnL >= 0 ? '+' : ''}${stats.combined.totalPnL.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      change: stats.combined.totalPnL,
      icon: TrendingUp,
      color: stats.combined.totalPnL >= 0 ? 'from-green-500 to-emerald-500' : 'from-red-500 to-rose-500',
      bgColor: stats.combined.totalPnL >= 0 ? 'bg-green-500/10' : 'bg-red-500/10',
    },
    {
      title: 'Total Trades',
      value: stats.combined.totalTrades.toString(),
      change: null,
      icon: Activity,
      color: 'from-purple-500 to-pink-500',
      bgColor: 'bg-purple-500/10',
    },
    {
      title: 'Win Rate',
      value: `${stats.combined.overallWinRate.toFixed(1)}%`,
      change: null,
      icon: Target,
      color: 'from-yellow-500 to-orange-500',
      bgColor: 'bg-yellow-500/10',
    },
    {
      title: 'Wins / Losses',
      value: `${stats.combined.totalWins} / ${stats.combined.totalLosses}`,
      change: null,
      icon: Zap,
      color: 'from-indigo-500 to-blue-500',
      bgColor: 'bg-indigo-500/10',
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      {cards.map((card, index) => {
        const Icon = card.icon
        return (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`${card.bgColor} rounded-xl p-6 border border-gray-700/50 backdrop-blur-sm`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`p-2 rounded-lg bg-gradient-to-br ${card.color} bg-opacity-20`}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              {card.change !== null && (
                <span
                  className={`text-sm font-semibold ${
                    card.change >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}
                >
                  {card.change >= 0 ? '↑' : '↓'}
                </span>
              )}
            </div>
            <h3 className="text-sm text-gray-400 mb-1">{card.title}</h3>
            <p className="text-2xl font-bold text-white">{card.value}</p>
          </motion.div>
        )
      })}
    </div>
  )
}

