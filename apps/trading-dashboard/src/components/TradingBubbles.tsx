'use client'

import { Trade, TradingBubble } from '@/types/trading'
import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { TrendingUp, TrendingDown } from 'lucide-react'

interface TradingBubblesProps {
  trades: Trade[]
}

export default function TradingBubbles({ trades }: TradingBubblesProps) {
  const [bubbles, setBubbles] = useState<TradingBubble[]>([])

  useEffect(() => {
    // Generate bubbles from recent trades
    const newBubbles: TradingBubble[] = trades.slice(0, 20).map((trade, index) => ({
      id: trade.id,
      platform: trade.platform,
      type: trade.type,
      amount: trade.amount,
      x: Math.random() * 80 + 10, // 10-90%
      y: Math.random() * 60 + 20, // 20-80%
      delay: index * 0.1,
      profit: trade.profit,
    }))
    setBubbles(newBubbles)
  }, [trades])

  return (
    <div className="relative bg-gray-900/50 rounded-xl p-8 border border-gray-700/50 backdrop-blur-sm min-h-[400px] overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-pink-500/5"></div>
      
      <div className="relative z-10">
        <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
          <span className="text-2xl">🎈</span>
          Live Trading Activity
        </h2>
        
        <div className="relative w-full h-[350px]">
          {bubbles.map((bubble) => (
            <motion.div
              key={bubble.id}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ 
                opacity: 1, 
                scale: 1,
                x: `${bubble.x}%`,
                y: `${bubble.y}%`,
              }}
              transition={{ 
                delay: bubble.delay,
                type: 'spring',
                stiffness: 100,
              }}
              className="absolute transform -translate-x-1/2 -translate-y-1/2"
            >
              <motion.div
                animate={{
                  y: [0, -10, 0],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                className={`
                  relative px-4 py-2 rounded-full text-white text-sm font-semibold
                  shadow-lg backdrop-blur-sm border-2
                  ${bubble.type === 'buy' 
                    ? 'bg-gradient-to-r from-green-500 to-emerald-500 border-green-400' 
                    : 'bg-gradient-to-r from-red-500 to-rose-500 border-red-400'
                  }
                  ${bubble.platform === 'kalshi' ? 'ring-2 ring-blue-400/50' : 'ring-2 ring-purple-400/50'}
                `}
              >
                <div className="flex items-center gap-2">
                  {bubble.type === 'buy' ? (
                    <TrendingUp className="w-4 h-4" />
                  ) : (
                    <TrendingDown className="w-4 h-4" />
                  )}
                  <span>${bubble.amount.toFixed(0)}</span>
                  {bubble.profit !== undefined && bubble.profit > 0 && (
                    <span className="text-xs opacity-90">+${bubble.profit.toFixed(2)}</span>
                  )}
                </div>
                <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-xs text-gray-400 whitespace-nowrap">
                  {bubble.platform}
                </div>
              </motion.div>
            </motion.div>
          ))}
        </div>

        {/* Legend */}
        <div className="mt-8 flex items-center justify-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-gradient-to-r from-green-500 to-emerald-500"></div>
            <span className="text-gray-300">Buy Orders</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-gradient-to-r from-red-500 to-rose-500"></div>
            <span className="text-gray-300">Sell Orders</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-blue-500 ring-2 ring-blue-400/50"></div>
            <span className="text-gray-300">Kalshi</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-purple-500 ring-2 ring-purple-400/50"></div>
            <span className="text-gray-300">Coinbase</span>
          </div>
        </div>
      </div>
    </div>
  )
}

