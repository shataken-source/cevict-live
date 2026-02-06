export interface TradingStats {
  kalshi: PlatformStats
  coinbase: PlatformStats
  microcap?: PlatformStats
  combined: CombinedStats
}

export interface PlatformStats {
  balance: number
  totalTrades: number
  wins: number
  losses: number
  buys: number
  sells: number
  totalPnL: number
  winRate: number
  openPositions: number
  portfolio?: any[]
}

export interface CombinedStats {
  totalBalance: number
  totalTrades: number
  totalPnL: number
  totalWins: number
  totalLosses: number
  overallWinRate: number
}

export interface Trade {
  id: string
  platform: 'kalshi' | 'coinbase' | 'microcap'
  type: 'buy' | 'sell'
  marketId?: string
  symbol?: string
  amount: number
  price: number
  profit?: number
  status: 'won' | 'lost' | 'open'
  timestamp: string
  confidence?: number
}

export interface TradingBubble {
  id: string
  platform: string
  type: string
  amount: number
  x: number
  y: number
  delay: number
  profit?: number
}
