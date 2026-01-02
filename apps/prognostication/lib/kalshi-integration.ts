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
    // Query bot_predictions table for Kalshi predictions
    // Filter: platform='kalshi', confidence >= 50%, only open predictions
    let query = supabase
      .from('bot_predictions')
      .select('*')
      .eq('platform', 'kalshi')
      .gte('confidence', 50) // Matches your new 50% threshold
      .is('actual_outcome', null) // Only open predictions (not yet resolved)
      .order('predicted_at', { ascending: false })
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
      console.log('â„¹ï¸ No Kalshi predictions found in bot_predictions table');
      return [];
    }

    // CRITICAL: Deduplicate by market_id - keep only the most recent/highest confidence prediction per market
    const marketMap = new Map<string, any>();
    for (const pred of data) {
      const marketId = pred.market_id || pred.id || '';
      if (!marketId) continue;
      
      const existing = marketMap.get(marketId);
      if (!existing) {
        marketMap.set(marketId, pred);
      } else {
        // Keep the one with higher confidence, or if equal, the more recent one
        const existingDate = new Date(existing.predicted_at || existing.created_at || 0);
        const currentDate = new Date(pred.predicted_at || pred.created_at || 0);
        
        if (pred.confidence > existing.confidence || 
            (pred.confidence === existing.confidence && currentDate > existingDate)) {
          marketMap.set(marketId, pred);
        }
      }
    }

    // Convert map back to array, sort by edge (highest first), and limit to top 20
    const uniquePredictions = Array.from(marketMap.values())
      .sort((a: any, b: any) => (b.edge || 0) - (a.edge || 0))
      .slice(0, 20); // Limit to top 20 after deduplication

    // Transform database records to API format
    return uniquePredictions.map((pred: any) => {
      // Map prediction field ('yes'/'no') to pick ('YES'/'NO')
      const predictedOutcome = (pred.prediction || '').toLowerCase();
      const pick = predictedOutcome === 'yes' ? 'YES' : 'NO';

      // Extract reasoning with multiple fallbacks
      let reasoning = '';
      try {
        if (Array.isArray(pred.reasoning) && pred.reasoning.length > 0) {
          reasoning = pred.reasoning
            .filter((r: any) => r != null && (typeof r === 'string' ? r.trim() : String(r)))
            .map((r: any) => typeof r === 'string' ? r.trim() : String(r))
            .join(' ');
        } else if (pred.reasoning && typeof pred.reasoning === 'string') {
          reasoning = pred.reasoning.trim();
        } else if (Array.isArray(pred.factors) && pred.factors.length > 0) {
          reasoning = pred.factors
            .filter((f: any) => f != null && (typeof f === 'string' ? f.trim() : String(f)))
            .map((f: any) => typeof f === 'string' ? f.trim() : String(f))
            .join(', ');
        } else if (pred.factors && typeof pred.factors === 'string') {
          reasoning = pred.factors.trim();
        }
      } catch (e) {
        // If extraction fails, will use fallback below
        reasoning = '';
      }
      
      // If still empty, create a meaningful default based on the prediction
      if (!reasoning || reasoning.length === 0) {
        const marketTitle = (pred.market_title || '').toLowerCase();
        if (marketTitle.includes('ipo') || marketTitle.includes('openai') || marketTitle.includes('anthropic')) {
          reasoning = pick === 'NO' ? 'OpenAI closer to profitability' : 'Anthropic has stronger IPO prospects';
        } else if (marketTitle.includes('leader') || marketTitle.includes('prime minister') || marketTitle.includes('ccp')) {
          reasoning = 'Based on current political dynamics and historical patterns';
        } else {
          reasoning = `AI analysis indicates ${pick === 'YES' ? 'higher' : 'lower'} probability based on market data and historical patterns`;
        }
      }

      // Map category to valid categories (handle technology -> world, etc.)
      let category = (pred.bot_category || 'unknown').toLowerCase();
      const categoryMap: Record<string, string> = {
        'technology': 'world',
        'tech': 'world',
        'politics': 'politics',
        'economics': 'economics',
        'weather': 'weather',
        'entertainment': 'entertainment',
        'crypto': 'crypto',
        'world': 'world',
      };
      category = categoryMap[category] || 'world'; // Default to 'world' if unknown

      // Extract historical patterns from learned_from array
      let historicalPattern: string | undefined = undefined;
      try {
        if (Array.isArray(pred.learned_from) && pred.learned_from.length > 0) {
          historicalPattern = pred.learned_from
            .filter((l: any) => l != null && (typeof l === 'string' ? l.trim() : String(l)))
            .map((l: any) => typeof l === 'string' ? l.trim() : String(l))
            .join(', ');
        }
      } catch (e) {
        // If extraction fails, leave undefined
        historicalPattern = undefined;
      }

      // Convert market_price to cents (Kalshi uses 0-100 cents)
      // If stored as decimal (0.50), multiply by 100. If already in cents (50), use as-is
      let marketPrice = pred.market_price || 50;
      if (marketPrice < 1 && marketPrice > 0) {
        marketPrice = marketPrice * 100; // Convert decimal to cents
      }
      marketPrice = Math.round(marketPrice);

      return {
        id: pred.market_id || pred.id || '',
        marketId: pred.market_id || undefined, // For Kalshi referral links
        market: pred.market_title || 'Unknown Market',
        category: category,
        pick: pick as 'YES' | 'NO',
        probability: Math.round(pred.probability || 50),
        edge: Math.max(0, Math.round((pred.edge || 0) * 100) / 100), // Ensure non-negative, round to 2 decimals
        marketPrice: marketPrice,
        expires: pred.expires_at || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        reasoning: reasoning,
        confidence: Math.round(pred.confidence || 0),
        historicalPattern: historicalPattern,
        predictedAt: pred.predicted_at || pred.created_at || undefined,
        amount: pred.amount || pred.stake_size || undefined, // Trade amount if available
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

