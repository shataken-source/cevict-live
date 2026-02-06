/**
 * AI-POWERED MARKET ANALYSIS
 * Uses Claude to analyze markets intelligently
 * Integrates with category learners and historical knowledge
 */

import Anthropic from '@anthropic-ai/sdk';
import { historicalKnowledge } from '../intelligence/historical-knowledge';
import { getBotPredictions, saveBotPrediction } from '../lib/supabase-memory';

const anthropic = new Anthropic();

// Colors for console
const c = {
  reset: '\x1b[0m',
  brightCyan: '\x1b[96m',
  brightGreen: '\x1b[92m',
  brightYellow: '\x1b[93m',
  brightMagenta: '\x1b[95m',
  dim: '\x1b[2m',
};

interface AIAnalysisResult {
  prediction: 'yes' | 'no' | 'buy' | 'sell';
  confidence: number;
  edge: number;
  reasoning: string[];
  factors: string[];
  riskLevel: 'low' | 'medium' | 'high';
}

interface MarketData {
  id: string;
  title: string;
  yesPrice: number;
  noPrice: number;
  volume?: number;
  expiresAt?: string;
  category?: string;
}

interface CryptoData {
  pair: string;
  price: number;
  change24h: number;
  volume24h?: number;
  high24h?: number;
  low24h?: number;
  candles?: { open: number; high: number; low: number; close: number; volume: number }[];
}

/**
 * AI-powered Kalshi market analysis
 */
export async function analyzeKalshiMarketWithAI(market: MarketData): Promise<AIAnalysisResult | null> {
  try {
    console.log(`   ${c.brightMagenta}🤖 AI analyzing: ${market.title.substring(0, 50)}...${c.reset}`);
    
    // Get historical knowledge for context
    const category = categorizeMarket(market.title);
    const historicalContext = historicalKnowledge.getRelevantKnowledge(market.title.toLowerCase());
    
    // Get past predictions for learning
    const pastPredictions = await getBotPredictions(category, 'kalshi', 20);
    const pastPerformance = analyzePastPerformance(pastPredictions);
    
    const prompt = `You are an expert prediction market analyst. Analyze this Kalshi market and provide a trading recommendation.

MARKET:
- Title: ${market.title}
- Current YES price: ${market.yesPrice}¢ (market thinks ${market.yesPrice}% likely)
- Current NO price: ${market.noPrice}¢
- Category: ${category}
- Expires: ${market.expiresAt || 'Unknown'}

HISTORICAL CONTEXT:
${historicalContext.length > 0 ? historicalContext.map(h => `- ${h}`).join('\n') : '- No specific historical data available'}

PAST PREDICTION PERFORMANCE IN THIS CATEGORY:
- Total predictions: ${pastPerformance.total}
- Win rate: ${pastPerformance.winRate.toFixed(1)}%
- Average edge achieved: ${pastPerformance.avgEdge.toFixed(1)}%

TASK: Analyze whether the market price is accurate or if there's an edge to exploit.

Consider:
1. Is the market overpricing or underpricing the probability?
2. What factors might the market be missing?
3. Are there any biases in how markets typically price similar events?
4. What's the risk/reward profile?

Respond in this exact JSON format:
{
  "prediction": "yes" or "no",
  "confidence": 50-95 (your confidence percentage),
  "estimatedProbability": 0-100 (what you think the true probability is),
  "edge": 0-50 (difference between your estimate and market price),
  "reasoning": ["reason 1", "reason 2", "reason 3"],
  "factors": ["factor 1", "factor 2"],
  "riskLevel": "low", "medium", or "high"
}

Only recommend a trade if you have genuine edge (estimatedProbability differs from market by 5%+ points).
If the market seems efficient, set confidence to 50 and edge to 0.`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = response.content[0];
    if (content.type !== 'text') return null;

    // Parse JSON from response
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const analysis = JSON.parse(jsonMatch[0]);
    
    console.log(`   ${c.brightGreen}✅ AI verdict: ${analysis.prediction.toUpperCase()} @ ${analysis.confidence}% conf, ${analysis.edge}% edge${c.reset}`);
    
    return {
      prediction: analysis.prediction,
      confidence: Math.min(95, Math.max(50, analysis.confidence)),
      edge: Math.min(50, Math.max(0, analysis.edge)),
      reasoning: analysis.reasoning || [],
      factors: analysis.factors || [],
      riskLevel: analysis.riskLevel || 'medium',
    };
  } catch (err: any) {
    console.error(`   ❌ AI analysis error: ${err.message}`);
    return null;
  }
}

/**
 * AI-powered crypto analysis
 */
export async function analyzeCryptoWithAI(data: CryptoData): Promise<AIAnalysisResult | null> {
  try {
    console.log(`   ${c.brightMagenta}🤖 AI analyzing: ${data.pair}...${c.reset}`);
    
    // Build candle summary
    let candleSummary = 'No candle data available';
    if (data.candles && data.candles.length > 0) {
      const recent = data.candles.slice(-10);
      const opens = recent.map(c => c.open);
      const closes = recent.map(c => c.close);
      const highs = recent.map(c => c.high);
      const lows = recent.map(c => c.low);
      
      const avgVolume = recent.reduce((sum, c) => sum + c.volume, 0) / recent.length;
      const priceRange = Math.max(...highs) - Math.min(...lows);
      const trend = closes[closes.length - 1] > opens[0] ? 'UPWARD' : 'DOWNWARD';
      
      candleSummary = `
- Recent trend: ${trend}
- Price range (last 10 candles): $${priceRange.toFixed(2)}
- Average volume: ${avgVolume.toFixed(0)}
- Latest candle: Open $${opens[opens.length-1]?.toFixed(2)}, Close $${closes[closes.length-1]?.toFixed(2)}`;
    }

    // Get historical crypto knowledge
    const historicalContext = historicalKnowledge.getRelevantKnowledge(data.pair.toLowerCase());
    
    const prompt = `You are an expert crypto trader. Analyze this cryptocurrency and provide a short-term trading recommendation (1-4 hour timeframe).

ASSET: ${data.pair}
CURRENT PRICE: $${data.price.toFixed(2)}
24H CHANGE: ${data.change24h.toFixed(2)}%
24H HIGH: $${data.high24h?.toFixed(2) || 'N/A'}
24H LOW: $${data.low24h?.toFixed(2) || 'N/A'}
24H VOLUME: $${data.volume24h?.toLocaleString() || 'N/A'}

RECENT CANDLE DATA:
${candleSummary}

HISTORICAL CONTEXT:
${historicalContext.length > 0 ? historicalContext.map(h => `- ${h}`).join('\n') : '- Standard crypto volatility patterns apply'}

TASK: Determine if there's a short-term trading opportunity.

Consider:
1. Is there momentum that could continue?
2. Are we near support/resistance levels?
3. Is volume confirming the move?
4. What's the risk/reward for a small position?

Respond in this exact JSON format:
{
  "prediction": "buy" or "sell",
  "confidence": 50-80 (your confidence - crypto is volatile so cap at 80),
  "edge": 0-10 (expected edge percentage),
  "reasoning": ["reason 1", "reason 2", "reason 3"],
  "factors": ["factor 1", "factor 2"],
  "riskLevel": "low", "medium", or "high",
  "suggestedStopLoss": percentage as number (e.g., 2.5),
  "suggestedTakeProfit": percentage as number (e.g., 1.5)
}

Be conservative - only recommend trades with clear setups. If sideways/unclear, set confidence to 50 and edge to 0.`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = response.content[0];
    if (content.type !== 'text') return null;

    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const analysis = JSON.parse(jsonMatch[0]);
    
    console.log(`   ${c.brightGreen}✅ AI verdict: ${analysis.prediction.toUpperCase()} @ ${analysis.confidence}% conf${c.reset}`);
    
    return {
      prediction: analysis.prediction,
      confidence: Math.min(80, Math.max(50, analysis.confidence)),
      edge: Math.min(10, Math.max(0, analysis.edge)),
      reasoning: analysis.reasoning || [],
      factors: analysis.factors || [],
      riskLevel: analysis.riskLevel || 'high',
    };
  } catch (err: any) {
    console.error(`   ❌ AI analysis error: ${err.message}`);
    return null;
  }
}

/**
 * Batch analyze multiple Kalshi markets efficiently
 */
export async function batchAnalyzeKalshiMarkets(markets: MarketData[]): Promise<Map<string, AIAnalysisResult>> {
  const results = new Map<string, AIAnalysisResult>();
  
  console.log(`\n${c.brightCyan}🤖 AI BATCH ANALYSIS - ${markets.length} markets${c.reset}`);
  
  // Analyze up to 5 markets per batch to control costs
  const marketsToAnalyze = markets.slice(0, 5);
  
  for (const market of marketsToAnalyze) {
    const analysis = await analyzeKalshiMarketWithAI(market);
    if (analysis && analysis.confidence >= 55 && analysis.edge >= 2) {
      results.set(market.id, analysis);
    }
    // Small delay between API calls
    await new Promise(r => setTimeout(r, 500));
  }
  
  console.log(`   ${c.dim}Analyzed ${marketsToAnalyze.length} markets, found ${results.size} opportunities${c.reset}`);
  
  return results;
}

/**
 * Helper: Categorize market by title
 */
function categorizeMarket(title: string): string {
  const lower = title.toLowerCase();
  if (['bitcoin', 'crypto', 'btc', 'eth', 'ethereum'].some(k => lower.includes(k))) return 'crypto';
  if (['election', 'president', 'congress', 'vote', 'senate', 'democrat', 'republican'].some(k => lower.includes(k))) return 'politics';
  if (['fed', 'gdp', 'inflation', 'recession', 'unemployment', 'rate'].some(k => lower.includes(k))) return 'economics';
  if (['temperature', 'hurricane', 'storm', 'weather', 'rain', 'snow'].some(k => lower.includes(k))) return 'weather';
  if (['oscar', 'movie', 'emmy', 'grammy', 'netflix', 'disney'].some(k => lower.includes(k))) return 'entertainment';
  if (['nfl', 'nba', 'mlb', 'game', 'score', 'win', 'championship'].some(k => lower.includes(k))) return 'sports';
  return 'world';
}

/**
 * Helper: Analyze past prediction performance
 */
function analyzePastPerformance(predictions: any[]): { total: number; winRate: number; avgEdge: number } {
  if (!predictions || predictions.length === 0) {
    return { total: 0, winRate: 50, avgEdge: 0 };
  }
  
  const resolved = predictions.filter(p => p.actual_outcome !== null);
  const wins = resolved.filter(p => p.actual_outcome === 'win').length;
  const totalEdge = predictions.reduce((sum, p) => sum + (p.edge || 0), 0);
  
  return {
    total: predictions.length,
    winRate: resolved.length > 0 ? (wins / resolved.length) * 100 : 50,
    avgEdge: predictions.length > 0 ? totalEdge / predictions.length : 0,
  };
}

export { categorizeMarket };
