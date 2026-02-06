import { TradingStats, Trade } from '@/types/trading'

export async function fetchTradingStats(): Promise<TradingStats> {
  try {
    // Fetch from local API that reads the live data file
    const response = await fetch('/api/update', {
      cache: 'no-store',
    })

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`)
    }

    const data = await response.json()
    return data.stats || getEmptyStats()
  } catch (error) {
    console.error('Failed to fetch stats:', error)
    return getEmptyStats()
  }
}

export async function fetchRecentTrades(): Promise<Trade[]> {
  try {
    const response = await fetch('/api/update', {
      cache: 'no-store',
    })

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`)
    }

    const data = await response.json()
    return data.trades || []
  } catch (error) {
    console.error('Failed to fetch trades:', error)
    return []
  }
}

function getEmptyStats(): TradingStats {
  return {
    kalshi: {
      balance: 0,
      totalTrades: 0,
      wins: 0,
      losses: 0,
      buys: 0,
      sells: 0,
      totalPnL: 0,
      winRate: 0,
      openPositions: 0,
    },
    coinbase: {
      balance: 0,
      totalTrades: 0,
      wins: 0,
      losses: 0,
      buys: 0,
      sells: 0,
      totalPnL: 0,
      winRate: 0,
      openPositions: 0,
    },
    combined: {
      totalBalance: 0,
      totalTrades: 0,
      totalPnL: 0,
      totalWins: 0,
      totalLosses: 0,
      overallWinRate: 0,
    },
  }
}


