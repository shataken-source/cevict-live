'use client'

import { TradingStats } from '@/types/trading'
import { motion } from 'framer-motion'
import { Coins, TrendingUp } from 'lucide-react'

interface PlatformBreakdownProps {
  stats: TradingStats
}

export default function PlatformBreakdown({ stats }: PlatformBreakdownProps) {
  const platforms = [
    {
      name: 'Kalshi',
      icon: TrendingUp,
      color: 'from-blue-500 to-cyan-500',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/30',
      stats: stats.kalshi,
    },
    {
      name: 'Coinbase',
      icon: Coins,
      color: 'from-purple-500 to-pink-500',
      bgColor: 'bg-purple-500/10',
      borderColor: 'border-purple-500/30',
      stats: stats.coinbase,
    },
  ]

  return (
    <div className="bg-gray-900/50 rounded-xl p-6 border border-gray-700/50 backdrop-blur-sm">
      <h2 className="text-xl font-bold mb-6">Platform Breakdown</h2>
      
      <div className="space-y-4">
        {platforms.map((platform, index) => {
          const Icon = platform.icon
          return (
            <motion.div
              key={platform.name}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`${platform.bgColor} ${platform.borderColor} rounded-lg p-4 border`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg bg-gradient-to-br ${platform.color} bg-opacity-20`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white">{platform.name}</h3>
                    <p className="text-xs text-gray-400">
                      {platform.stats.openPositions} open positions
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-white">
                    ${platform.stats.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <p className={`text-sm font-semibold ${platform.stats.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {platform.stats.totalPnL >= 0 ? '+' : ''}${platform.stats.totalPnL.toFixed(2)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4 text-center">
                <div>
                  <p className="text-xs text-gray-400 mb-1">Trades</p>
                  <p className="text-lg font-bold text-white">{platform.stats.totalTrades}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1">Wins</p>
                  <p className="text-lg font-bold text-green-400">{platform.stats.wins}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1">Losses</p>
                  <p className="text-lg font-bold text-red-400">{platform.stats.losses}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1">Win Rate</p>
                  <p className="text-lg font-bold text-white">{platform.stats.winRate.toFixed(1)}%</p>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-700/50 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-400 mb-1">Buys</p>
                  <p className="text-sm font-semibold text-green-400">{platform.stats.buys}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1">Sells</p>
                  <p className="text-sm font-semibold text-red-400">{platform.stats.sells}</p>
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

