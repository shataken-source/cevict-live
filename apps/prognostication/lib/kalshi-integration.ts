/**
 * Integration with Alpha Hunter's Kalshi Trading Bot
 * Pulls real predictions from bot_predictions table in Supabase
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface LiveKalshiPick {
  marketId: string;
  title: string;
  category: string;
  prediction: 'yes' | 'no';
  probability: number;
  confidence: number;
  edge: number;
  reasoning: string[];
  factors: string[];
  learnedFrom: string[];
  yesPrice: number;
  noPrice: number;
  expiresAt?: Date;
}

export interface KalshiPickResponse {
  id: string;
  market: string;
  category: string;
  pick: 'YES' | 'NO';
  probability: number;
  edge: number;
  marketPrice: number;
  expires: string;
  reasoning: string;
  confidence: number;
  historicalPattern?: string;
  marketId?: string; // For Kalshi referral links
}

/**
 * Get Supabase client using environment variables from .env.local
 */
function getSupabaseClient(): SupabaseClient | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.warn('âš ï¸ Supabase not configured - NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
    return null;
  }

  try {
    return createClient(supabaseUrl, supabaseServiceKey);
  } catch (error) {
    console.error('Failed to create Supabase client:', error);
    return null;
  }
}

/**
 * Fetch live picks from bot_predictions table in Supabase
 * Uses a 3-second timeout to prevent 503 hangs - returns empty array if query takes too long
 */
export async function fetchLiveKalshiPicks(category?: string): Promise<KalshiPickResponse[]> {
  const supabase = getSupabaseClient();

  if (!supabase) {
    console.error('âŒ Supabase client not available');
    return [];
  }

  try {
    // Query trade_history table for Kalshi trades (where Alpha Hunter stores actual trades)
    // Filter: platform='kalshi', outcome='open' (active trades)
    let query = supabase
      .from('trade_history')
      .select('*')
      .eq('platform', 'kalshi')
      .eq('outcome', 'open') // Only open trades
      .order('opened_at', { ascending: false })
      .limit(100); // Get more to account for duplicates (will deduplicate later, then limit to 20)

    // Filter by category if provided
    if (category && category !== 'all') {
      query = query.eq('bot_category', category.toLowerCase());
    }

    // Add 3-second timeout to prevent hangs
    const queryPromise = query;
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Supabase query timed out after 3 seconds')), 3000)
    );

    let data, error;
    try {
      const result = await Promise.race([queryPromise, timeoutPromise]);
      data = (result as any).data;
      error = (result as any).error;
    } catch (timeoutError: any) {
      console.error('❌ Query timeout:', timeoutError.message);
      return [];
    }

    if (error) {
      console.error('âŒ Error querying bot_predictions:', error);
      return [];
    }

    if (!data || data.length === 0) {
      console.log('ℹ️ No open Kalshi trades found in trade_history table');
      return [];
    }

    // CRITICAL: Deduplicate by market_id - keep only the most recent/highest confidence trade per market
    const marketMap = new Map<string, any>();
    for (const trade of data) {
      const marketId = trade.market_id || trade.id || '';
      if (!marketId) continue;

      const existing = marketMap.get(marketId);
      if (!existing) {
        marketMap.set(marketId, trade);
      } else {
        // Keep the one with higher confidence, or if equal, the more recent one
        const existingDate = new Date(existing.opened_at || existing.created_at || 0);
        const currentDate = new Date(trade.opened_at || trade.created_at || 0);

        if (trade.confidence > existing.confidence ||
          (trade.confidence === existing.confidence && currentDate > existingDate)) {
          marketMap.set(marketId, trade);
        }
      }
    }

    // Convert map back to array, sort by edge (highest first), and limit to top 20
    const uniqueTrades = Array.from(marketMap.values())
      .sort((a: any, b: any) => (b.edge || 0) - (a.edge || 0))
      .slice(0, 20); // Limit to top 20 after deduplication

    // Transform database records to API format
    return uniqueTrades.map((trade: any) => {
      // Map trade_type ('buy'/'sell') to pick ('YES'/'NO')
      // 'buy' means buying YES contracts, 'sell' means buying NO contracts (shorting YES)
      const pick = trade.trade_type === 'buy' ? 'YES' : 'NO';

      // Create reasoning from trade data
      let reasoning = '';
      if (trade.symbol) {
        const confidence = trade.confidence || 50;
        const entryPrice = trade.entry_price || 50;
        reasoning = `${trade.symbol} - ${pick} at ${entryPrice}¢ (confidence: ${confidence}%)`;
      } else {
        reasoning = `${pick} position opened at ${trade.entry_price || 50}¢`;
      }

      // Map category to valid categories
      let category = (trade.bot_category || 'unknown').toLowerCase();
      const categoryMap: Record<string, string> = {
        'kalshi_sports': 'sports',
        'sports': 'sports',
        'nba': 'sports',
        'nfl': 'sports',
        'mlb': 'sports',
        'nhl': 'sports',
        'ncaab': 'sports',
        'ncaaf': 'sports',
        'technology': 'world',
        'tech': 'world',
        'politics': 'politics',
        'economics': 'economics',
        'weather': 'weather',
        'entertainment': 'entertainment',
        'crypto': 'crypto',
        'world': 'world',
      };
      category = categoryMap[category] || 'world';

      // Calculate probability from entry price and edge
      const entryPrice = trade.entry_price || 50;
      const edge = trade.edge || 0;
      let probability = entryPrice + edge;
      if (pick === 'NO') {
        probability = 100 - probability;
      }
      probability = Math.max(0, Math.min(100, Math.round(probability)));

      return {
        id: trade.market_id || trade.id || '',
        marketId: trade.market_id || undefined,
        market: trade.symbol || 'Unknown Market',
        category: category,
        pick: pick as 'YES' | 'NO',
        probability: probability,
        edge: Math.max(0, Math.round((trade.edge || 0) * 100) / 100),
        marketPrice: Math.round(trade.entry_price || 50),
        expires: trade.closed_at || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        reasoning: reasoning,
        confidence: Math.round(trade.confidence || 0),
        historicalPattern: undefined,
        predictedAt: trade.opened_at || trade.created_at || undefined,
        amount: trade.amount || trade.contracts || undefined,
      };
    });
  } catch (error) {
    console.error('âŒ Exception fetching live Kalshi picks from Supabase:', error);
    return [];
  }
}

/**
 * Check if we have fresh live data (< 1 hour old) from Supabase
 */
export async function hasRecentLiveData(): Promise<boolean> {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return false;
  }

  try {
    // Check for predictions created in the last hour
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from('bot_predictions')
      .select('predicted_at')
      .eq('platform', 'kalshi')
      .gte('predicted_at', hourAgo)
      .limit(1);

    if (error) {
      console.error('Error checking recent live data:', error);
      return false;
    }

    return (data && data.length > 0);
  } catch (error) {
    console.error('Exception checking recent live data:', error);
    return false;
  }
}

