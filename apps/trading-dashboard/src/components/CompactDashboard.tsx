'use client'

import { useEffect, useState } from 'react'
import { TradingStats, Trade } from '@/types/trading'
import { fetchTradingStats, fetchRecentTrades } from '@/lib/api'
import { RefreshCw } from 'lucide-react'

export default function CompactDashboard() {
  const [stats, setStats] = useState<TradingStats | null>(null)
  const [trades, setTrades] = useState<Trade[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())

  const loadData = async () => {
    try {
      const [statsData, tradesData] = await Promise.all([
        fetchTradingStats(),
        fetchRecentTrades(),
      ])
      setStats(statsData)
      setTrades(tradesData)
      setLastUpdate(new Date())
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 3000) // Refresh every 3 seconds
    return () => clearInterval(interval)
  }, [])

  if (loading || !stats) {
    return (
      <div className="h-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-400 mx-auto mb-2"></div>
          <p className="text-gray-500 text-sm">Loading...</p>
        </div>
      </div>
    )
  }

  const safeStats = stats || {
    kalshi: { balance: 0, totalTrades: 0, wins: 0, losses: 0, buys: 0, sells: 0, totalPnL: 0, winRate: 0, openPositions: 0 },
    coinbase: { balance: 0, totalTrades: 0, wins: 0, losses: 0, buys: 0, sells: 0, totalPnL: 0, winRate: 0, openPositions: 0 },
    combined: { totalBalance: 0, totalTrades: 0, totalPnL: 0, totalWins: 0, totalLosses: 0, overallWinRate: 0 },
  };

  const recentTrades = trades.slice(0, 12);

  return (
    <div className="h-screen bg-black text-green-400 font-mono overflow-hidden flex flex-col">
      {/* Compact Header */}
      <div className="bg-gray-900 border-b border-gray-800 px-3 py-1.5 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-lg font-bold text-green-400">💎 ALPHA HUNTER</span>
          <div className="flex items-center gap-1 bg-green-500/20 px-1.5 py-0.5 rounded text-xs">
            <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></div>
            <span>LIVE</span>
          </div>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="text-gray-400">{lastUpdate.toLocaleTimeString()}</span>
          <button onClick={loadData} className="text-green-400 hover:text-green-300">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Content - Single Screen Grid */}
      <div className="flex-1 grid grid-cols-12 gap-1.5 p-1.5 overflow-hidden">

        {/* Left Column - Balances */}
        <div className="col-span-3 flex flex-col gap-1.5 overflow-y-auto">

          {/* Total Balance */}
          <div className="bg-gray-900 border border-gray-800 p-2 flex-shrink-0">
            <div className="text-[10px] text-gray-500 mb-0.5">TOTAL</div>
            <div className="text-xl font-bold text-green-400">
              ${safeStats.combined.totalBalance.toFixed(2)}
            </div>
            <div className={`text-xs mt-0.5 ${safeStats.combined.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {safeStats.combined.totalPnL >= 0 ? '+' : ''}${safeStats.combined.totalPnL.toFixed(2)}
            </div>
          </div>

          {/* Kalshi */}
          <div className="bg-gray-900 border border-purple-800/30 p-2 flex-shrink-0">
            <div className="text-[10px] text-purple-400 mb-0.5">🎯 KALSHI</div>
            <div className="text-base font-bold">${safeStats.kalshi.balance.toFixed(2)}</div>
            <div className="flex justify-between text-[10px] mt-0.5">
              <span className="text-gray-500">Open: {safeStats.kalshi.openPositions}</span>
              <span className={safeStats.kalshi.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}>
                {safeStats.kalshi.totalPnL >= 0 ? '+' : ''}${safeStats.kalshi.totalPnL.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-[10px] text-gray-500 mt-0.5">
              <span>W:{safeStats.kalshi.wins}</span>
              <span>L:{safeStats.kalshi.losses}</span>
              <span>{safeStats.kalshi.winRate.toFixed(0)}%</span>
            </div>
          </div>

          {/* Coinbase */}
          <div className="bg-gray-900 border border-blue-800/30 p-2 flex-shrink-0">
            <div className="text-[10px] text-blue-400 mb-0.5">₿ COINBASE</div>
            <div className="text-base font-bold">${safeStats.coinbase.balance.toFixed(2)}</div>
            <div className="flex justify-between text-[10px] mt-0.5">
              <span className="text-gray-500">Open: {safeStats.coinbase.openPositions}</span>
              <span className={safeStats.coinbase.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}>
                {safeStats.coinbase.totalPnL >= 0 ? '+' : ''}${safeStats.coinbase.totalPnL.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-[10px] text-gray-500 mt-0.5">
              <span>W:{safeStats.coinbase.wins}</span>
              <span>L:{safeStats.coinbase.losses}</span>
              <span>{safeStats.coinbase.winRate.toFixed(0)}%</span>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-1.5 flex-shrink-0">
            <div className="bg-gray-900 border border-green-800/30 p-1.5">
              <div className="text-[10px] text-gray-500">WINS</div>
              <div className="text-lg font-bold text-green-400">{safeStats.combined.totalWins}</div>
            </div>
            <div className="bg-gray-900 border border-red-800/30 p-1.5">
              <div className="text-[10px] text-gray-500">LOSS</div>
              <div className="text-lg font-bold text-red-400">{safeStats.combined.totalLosses}</div>
            </div>
            <div className="bg-gray-900 border border-blue-800/30 p-1.5">
              <div className="text-[10px] text-gray-500">RATE</div>
              <div className="text-lg font-bold text-blue-400">{safeStats.combined.overallWinRate.toFixed(0)}%</div>
            </div>
            <div className="bg-gray-900 border border-purple-800/30 p-1.5">
              <div className="text-[10px] text-gray-500">TRDS</div>
              <div className="text-lg font-bold text-purple-400">{safeStats.combined.totalTrades}</div>
            </div>
          </div>

        </div>

        {/* Middle Column - Recent Trades Table */}
        <div className="col-span-6 bg-gray-900 border border-gray-800 overflow-hidden flex flex-col">
          <div className="text-[10px] text-gray-500 px-2 py-1 border-b border-gray-800 flex-shrink-0">RECENT TRADES</div>
          <div className="flex-1 overflow-y-auto">
            {recentTrades.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-600 text-xs">
                No trades yet
              </div>
            ) : (
              <table className="w-full text-[10px]">
                <thead className="sticky top-0 bg-gray-900 border-b border-gray-800">
                  <tr className="text-gray-500">
                    <th className="text-left px-2 py-1">Time</th>
                    <th className="text-left px-2 py-1">Plat</th>
                    <th className="text-left px-2 py-1">Type</th>
                    <th className="text-right px-2 py-1">Amt</th>
                    <th className="text-right px-2 py-1">Price</th>
                    <th className="text-right px-2 py-1">P&L</th>
                    <th className="text-center px-2 py-1">St</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTrades.map((trade, idx) => (
                    <tr key={idx} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                      <td className="px-2 py-1 text-gray-400">{new Date(trade.timestamp).toLocaleTimeString('en-US', {hour: '2-digit', minute: '2-digit'})}</td>
                      <td className="px-2 py-1">
                        <span className={`${
                          trade.platform === 'kalshi' ? 'text-purple-400' :
                          trade.platform === 'coinbase' ? 'text-blue-400' : 'text-yellow-400'
                        }`}>
                          {trade.platform.slice(0,3).toUpperCase()}
                        </span>
                      </td>
                      <td className="px-2 py-1">
                        <span className={`${trade.type === 'buy' ? 'text-green-400' : 'text-red-400'}`}>
                          {trade.type === 'buy' ? 'BUY' : 'SEL'}
                        </span>
                      </td>
                      <td className="px-2 py-1 text-right">${trade.amount.toFixed(2)}</td>
                      <td className="px-2 py-1 text-right">${trade.price.toFixed(2)}</td>
                      <td className="px-2 py-1 text-right">
                        {trade.profit !== undefined ? (
                          <span className={trade.profit >= 0 ? 'text-green-400' : 'text-red-400'}>
                            {trade.profit >= 0 ? '+' : ''}${trade.profit.toFixed(2)}
                          </span>
                        ) : '-'}
                      </td>
                      <td className="px-2 py-1 text-center">
                        <span className={`inline-block w-1.5 h-1.5 rounded-full ${
                          trade.status === 'open' ? 'bg-yellow-400' :
                          trade.status === 'won' ? 'bg-green-400' : 'bg-red-400'
                        }`}></span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right Column - Activity & Breakdown */}
        <div className="col-span-3 flex flex-col gap-1.5 overflow-y-auto">

          {/* Platform Breakdown */}
          <div className="bg-gray-900 border border-gray-800 p-2 flex-shrink-0">
            <div className="text-[10px] text-gray-500 mb-1.5">PLATFORM %</div>
            <div className="space-y-1.5">
              <div>
                <div className="flex justify-between text-[10px] mb-0.5">
                  <span className="text-purple-400">Kalshi</span>
                  <span className="text-gray-400">
                    {safeStats.combined.totalTrades > 0
                      ? ((safeStats.kalshi.totalTrades / safeStats.combined.totalTrades) * 100).toFixed(0)
                      : 0}%
                  </span>
                </div>
                <div className="h-1.5 bg-gray-800 rounded overflow-hidden">
                  <div
                    className="h-full bg-purple-500"
                    style={{width: `${safeStats.combined.totalTrades > 0 ? (safeStats.kalshi.totalTrades / safeStats.combined.totalTrades) * 100 : 0}%`}}
                  ></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-[10px] mb-0.5">
                  <span className="text-blue-400">Coinbase</span>
                  <span className="text-gray-400">
                    {safeStats.combined.totalTrades > 0
                      ? ((safeStats.coinbase.totalTrades / safeStats.combined.totalTrades) * 100).toFixed(0)
                      : 0}%
                  </span>
                </div>
                <div className="h-1.5 bg-gray-800 rounded overflow-hidden">
                  <div
                    className="h-full bg-blue-500"
                    style={{width: `${safeStats.combined.totalTrades > 0 ? (safeStats.coinbase.totalTrades / safeStats.combined.totalTrades) * 100 : 0}%`}}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          {/* Live Activity Feed */}
          <div className="bg-gray-900 border border-gray-800 p-2 flex-1 overflow-hidden flex flex-col">
            <div className="text-[10px] text-gray-500 mb-1.5">LIVE FEED</div>
            <div className="space-y-1 text-[10px] overflow-y-auto flex-1">
              {recentTrades.slice(0, 8).map((trade, idx) => (
                <div key={idx} className="flex items-center gap-1.5 py-0.5 border-b border-gray-800/50">
                  <div className={`w-1 h-1 rounded-full flex-shrink-0 ${
                    trade.type === 'buy' ? 'bg-green-400' : 'bg-red-400'
                  }`}></div>
                  <span className="text-gray-400 flex-1 truncate text-[9px]">
                    {trade.type === 'buy' ? '↗' : '↘'} {(trade.symbol || trade.marketId || 'Trade').slice(0, 20)}
                  </span>
                  <span className={`flex-shrink-0 ${trade.profit && trade.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {trade.profit !== undefined ? `${trade.profit >= 0 ? '+' : ''}$${trade.profit.toFixed(2)}` : '-'}
                  </span>
                </div>
              ))}
              {recentTrades.length === 0 && (
                <div className="text-gray-600 text-center py-4 text-[10px]">
                  Waiting for trades...
                </div>
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  )
}

