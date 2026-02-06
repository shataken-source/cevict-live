'use client'

import { Trade } from '@/types/trading'
import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown, Clock, CheckCircle, XCircle } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface RecentTradesProps {
  trades: Trade[]
}

export default function RecentTrades({ trades }: RecentTradesProps) {
  const getStatusIcon = (status: Trade['status']) => {
    switch (status) {
      case 'won':
        return <CheckCircle className="w-4 h-4 text-green-400" />
      case 'lost':
        return <XCircle className="w-4 h-4 text-red-400" />
      case 'open':
        return <Clock className="w-4 h-4 text-yellow-400" />
      default:
        return <Clock className="w-4 h-4 text-gray-400" />
    }
  }

  const getStatusColor = (status: Trade['status']) => {
    switch (status) {
      case 'won':
        return 'bg-green-500/10 border-green-500/30'
      case 'lost':
        return 'bg-red-500/10 border-red-500/30'
      case 'open':
        return 'bg-yellow-500/10 border-yellow-500/30'
      default:
        return 'bg-gray-500/10 border-gray-500/30'
    }
  }

  return (
    <div className="bg-gray-900/50 rounded-xl p-6 border border-gray-700/50 backdrop-blur-sm">
      <h2 className="text-xl font-bold mb-6">Recent Trades</h2>
      
      <div className="space-y-3">
        {trades.length === 0 ? (
          <p className="text-center text-gray-400 py-8">No recent trades</p>
        ) : (
          trades.map((trade, index) => (
            <motion.div
              key={trade.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`${getStatusColor(trade.status)} rounded-lg p-4 border flex items-center justify-between`}
            >
              <div className="flex items-center gap-4">
                <div className={`p-2 rounded-lg ${
                  trade.platform === 'kalshi' 
                    ? 'bg-blue-500/20' 
                    : 'bg-purple-500/20'
                }`}>
                  {trade.type === 'buy' ? (
                    <TrendingUp className="w-5 h-5 text-green-400" />
                  ) : (
                    <TrendingDown className="w-5 h-5 text-red-400" />
                  )}
                </div>
                
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-white capitalize">
                      {trade.type} {trade.platform}
                    </span>
                    {getStatusIcon(trade.status)}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-400">
                    <span>{trade.symbol || trade.marketId || 'N/A'}</span>
                    {trade.confidence && (
                      <span className="text-xs bg-gray-700 px-2 py-0.5 rounded">
                        {trade.confidence}% conf
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="text-right">
                <p className="font-bold text-white">
                  ${trade.amount.toFixed(2)}
                </p>
                {trade.profit !== undefined && (
                  <p className={`text-sm font-semibold ${
                    trade.profit >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {trade.profit >= 0 ? '+' : ''}${trade.profit.toFixed(2)}
                  </p>
                )}
                <p className="text-xs text-gray-400 mt-1">
                  {formatDistanceToNow(new Date(trade.timestamp), { addSuffix: true })}
                </p>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  )
}

