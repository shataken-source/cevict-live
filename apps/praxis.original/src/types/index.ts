/**
 * PRAXIS Trading Platform - Type Definitions
 * PROPRIETARY AND CONFIDENTIAL - Personal use only
 */

// ============ CORE TRADE TYPES ============

export type Platform = 'kalshi' | 'polymarket' | 'coinbase' | 'manual';
export type TradeDirection = 'YES' | 'NO' | 'BUY' | 'SELL';
export type TradeStatus = 'open' | 'closed' | 'settled' | 'expired';

export interface Trade {
  id: string;
  platform: Platform;
  ticker: string;
  market_title: string;
  direction: TradeDirection;
  entry_price: number;
  exit_price?: number;
  quantity: number;
  entry_time: Date;
  exit_time?: Date;
  status: TradeStatus;
  settlement_price?: number;
  pnl?: number;
  pnl_percent?: number;
  fees: number;
  tags?: string[];
  notes?: string;
  category?: string;
}

export interface Position {
  id: string;
  platform: Platform;
  ticker: string;
  market_title: string;
  direction: TradeDirection;
  quantity: number;
  avg_entry_price: number;
  current_price: number;
  unrealized_pnl: number;
  unrealized_pnl_percent: number;
  market_close_time?: Date;
  last_updated: Date;
}

export interface Market {
  id: string;
  platform: Platform;
  ticker: string;
  title: string;
  category: string;
  yes_price: number;
  no_price: number;
  volume_24h: number;
  open_interest: number;
  close_time?: Date;
  status: 'open' | 'closed' | 'settled';
  last_updated: Date;
}

// ============ ANALYTICS TYPES ============

export interface PortfolioStats {
  total_value: number;
  cash_balance: number;
  positions_value: number;
  total_pnl: number;
  total_pnl_percent: number;
  day_pnl: number;
  day_pnl_percent: number;
  win_rate: number;
  total_trades: number;
  winning_trades: number;
  losing_trades: number;
  avg_win: number;
  avg_loss: number;
  profit_factor: number;
  sharpe_ratio: number;
  sortino_ratio: number;
  max_drawdown: number;
  max_drawdown_date?: Date;
  current_drawdown: number;
  best_trade: number;
  worst_trade: number;
  avg_hold_time_hours: number;
  kelly_fraction: number;
}

export interface DailyStats {
  date: Date;
  pnl: number;
  cumulative_pnl: number;
  trades_count: number;
  win_rate: number;
  portfolio_value: number;
}

export interface CategoryStats {
  category: string;
  trades: number;
  pnl: number;
  win_rate: number;
  avg_return: number;
}

// ============ ARBITRAGE TYPES ============

export interface ArbitrageOpportunity {
  id: string;
  kalshi_ticker?: string;
  polymarket_id?: string;
  title: string;
  kalshi_yes_price?: number;
  kalshi_no_price?: number;
  poly_yes_price?: number;
  poly_no_price?: number;
  spread: number;
  spread_percent: number;
  expected_value: number;
  recommended_action: string;
  confidence: number;
  detected_at: Date;
  expires_at?: Date;
}

// ============ ALERT TYPES ============

export type AlertType = 'price' | 'pnl' | 'drawdown' | 'arbitrage' | 'settlement' | 'custom';
export type AlertPriority = 'low' | 'medium' | 'high' | 'critical';

export interface Alert {
  id: string;
  type: AlertType;
  priority: AlertPriority;
  title: string;
  message: string;
  triggered_at: Date;
  acknowledged: boolean;
  data?: Record<string, unknown>;
}

// ============ AI ANALYSIS TYPES ============

export interface AIInsight {
  id: string;
  type: 'pattern' | 'warning' | 'opportunity' | 'summary';
  title: string;
  content: string;
  confidence: number;
  relevant_trades?: string[];
  generated_at: Date;
  expires_at?: Date;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

// ============ IMPORT/EXPORT TYPES ============

export interface KalshiCSVRow {
  created_time: string;
  action: string;
  ticker: string;
  market: string;
  type: string;
  yes_price?: string;
  no_price?: string;
  count: string;
  total_cost?: string;
  fees?: string;
}

export interface PolymarketCSVRow {
  timestamp: string;
  market: string;
  outcome: string;
  side: string;
  price: string;
  shares: string;
  total: string;
  fees: string;
}

// ============ UI STATE TYPES ============

export type TimeRange = '1D' | '1W' | '1M' | '3M' | '6M' | '1Y' | 'ALL';
export type ViewMode = 'dashboard' | 'trades' | 'positions' | 'analytics' | 'arbitrage' | 'ai' | 'alerts' | 'settings';

export interface FilterState {
  platform: Platform | 'all';
  status: TradeStatus | 'all';
  direction: TradeDirection | 'all';
  dateRange: TimeRange;
  searchQuery: string;
  tags: string[];
}

// ============ SETTINGS TYPES ============

export interface UserSettings {
  theme: 'dark' | 'light' | 'system';
  currency: 'USD' | 'EUR' | 'GBP';
  timezone: string;
  notifications: {
    email: boolean;
    push: boolean;
    sms: boolean;
  };
  risk_limits: {
    max_position_size: number;
    max_daily_loss: number;
    max_drawdown: number;
  };
  api_keys: {
    kalshi?: { key: string; secret: string };
    polymarket?: { key: string };
    coinbase?: { key: string; secret: string };
  };
}
