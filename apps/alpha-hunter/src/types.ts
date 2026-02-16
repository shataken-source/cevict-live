/**
 * Alpha Hunter Types
 * Type definitions for the autonomous profit-hunting system
 */

export interface Opportunity {
  id: string;
  type: 'sports_bet' | 'prediction_market' | 'arbitrage' | 'news_play' | 'crypto' | 'event';
  source: string;
  title: string;
  description: string;
  confidence: number; // 0-100
  expectedValue: number; // Expected profit in $
  riskLevel: 'low' | 'medium' | 'high';
  timeframe: string; // e.g., "2 hours", "Today", "This week"
  requiredCapital: number;
  potentialReturn: number;
  reasoning: string[];
  dataPoints: DataPoint[];
  action: RecommendedAction;
  expiresAt: string;
  createdAt: string;
}

export interface DataPoint {
  source: string;
  metric: string;
  value: string | number;
  relevance: number; // 0-100
  timestamp: string;
}

export interface RecommendedAction {
  platform: 'kalshi' | 'progno' | 'manual' | 'crypto_exchange' | 'polymarket';
  actionType: 'buy' | 'sell' | 'bet' | 'wait';
  amount: number;
  target: string;
  instructions: string[];
  autoExecute: boolean;
  metadata?: Record<string, any>; // For additional data like token IDs
}

export interface FundAccount {
  id: string;
  balance: number;
  allocatedFunds: number;
  availableFunds: number;
  dailyLimit: number;
  maxRiskPerTrade: number;
  todaySpent: number;
  todayProfit: number;
  totalProfit: number;
  lastUpdated: string;
}

export interface Trade {
  id: string;
  opportunityId: string;
  type: Opportunity['type'];
  platform: string;
  amount: number;
  target: string;
  entryPrice?: number;
  exitPrice?: number;
  status: 'pending' | 'active' | 'won' | 'lost' | 'cancelled';
  profit: number;
  reasoning: string;
  executedAt: string;
  settledAt?: string;
}

export interface DailyReport {
  date: string;
  opportunitiesFound: number;
  opportunitiesTaken: number;
  tradesExecuted: number;
  winRate: number;
  totalProfit: number;
  bestOpportunity: Opportunity | null;
  topRecommendation: Opportunity | null;
  marketConditions: string;
  newsImpact: string[];
  learnings: string[];
}

export interface NewsItem {
  title: string;
  source: string;
  url: string;
  summary: string;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  relevantTo: string[];
  publishedAt: string;
}

export interface MarketData {
  symbol: string;
  price: number;
  change24h: number;
  volume: number;
  sentiment: number;
  source: string;
}

export interface PredictionMarket {
  id: string;
  platform: string;
  title: string;
  category: string;
  yesPrice: number;
  noPrice: number;
  volume: number;
  expiresAt: string;
  aiPrediction: number; // Our predicted probability
  edge: number; // Difference between our prediction and market price
}

export interface BotConfig {
  dailyProfitTarget: number;
  maxDailyRisk: number;
  maxTradeSize: number;
  minConfidence: number;
  minExpectedValue: number;
  autoExecute: boolean;
  preferredPlatforms: string[];
  smsEnabled: boolean;
  phoneNumber: string;
}

export interface LearningData {
  opportunityType: string;
  confidence: number;
  outcome: 'success' | 'failure';
  actualReturn: number;
  expectedReturn: number;
  factors: string[];
  timestamp: string;
}

