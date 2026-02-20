/**
 * Polymarket Integration for Prognostication
 * Serves Polymarket picks from Supabase polymarket_predictions table
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface PolymarketPickResponse {
  id: string;
  market: string;
  marketSlug: string;
  category: string;
  pick: 'YES' | 'NO';
  probability: number;
  edge: number;
  marketPrice: number;
  expires: string;
  reasoning: string;
  confidence: number;
  historicalPattern?: string;
  marketId?: string;
}

/**
 * Get Supabase client using environment variables
 */
function getSupabaseClient(): SupabaseClient | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.warn('⚠️ Supabase not configured for Polymarket');
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
 * Fetch live Polymarket picks from Supabase
 */
export async function fetchLivePolymarketPicks(category?: string): Promise<PolymarketPickResponse[]> {
  const supabase = getSupabaseClient();

  if (!supabase) {
    console.error('❌ Supabase client not available');
    return [];
  }

  try {
    let query = supabase
      .from('polymarket_predictions')
      .select('*')
      .is('actual_outcome', null) // Only open predictions
      .gte('confidence', 50)
      .order('predicted_at', { ascending: false })
      .limit(50);

    if (category && category !== 'all') {
      query = query.ilike('market_title', `%${category}%`);
    }

    // Add 3-second timeout
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Query timeout')), 3000)
    );

    const result = await Promise.race([query, timeoutPromise]) as any;
    const { data, error } = result;

    if (error) {
      console.error('❌ Error querying polymarket_predictions:', error);
      return [];
    }

    if (!data || data.length === 0) {
      console.log('ℹ️ No Polymarket predictions found');
      return [];
    }

    // Deduplicate by market_id
    const marketMap = new Map<string, any>();
    for (const pred of data) {
      const marketId = pred.market_id || pred.id || '';
      if (!marketId) continue;

      const existing = marketMap.get(marketId);
      if (!existing || pred.confidence > existing.confidence) {
        marketMap.set(marketId, pred);
      }
    }

    // Transform to response format
    return Array.from(marketMap.values())
      .sort((a: any, b: any) => (b.edge || 0) - (a.edge || 0))
      .slice(0, 20)
      .map((pred: any) => {
        const reasoning = Array.isArray(pred.reasoning)
          ? pred.reasoning.join(' ')
          : (pred.reasoning || 'AI analysis indicates favorable probability');

        return {
          id: pred.market_id || pred.id || '',
          marketId: pred.market_id || pred.id,
          market: pred.market_title || 'Unknown Market',
          marketSlug: pred.market_slug || pred.market_id || '',
          category: 'politics', // Default, can be extracted from title
          pick: pred.prediction?.toUpperCase() || 'YES',
          probability: Math.round((pred.probability || 0.5) * 100),
          edge: Math.round((pred.edge || 0) * 100) / 100,
          marketPrice: Math.round((pred.market_price || 0.5) * 100),
          expires: pred.expires_at || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          reasoning: reasoning,
          confidence: Math.round(pred.confidence || 0),
          historicalPattern: Array.isArray(pred.learned_from) ? pred.learned_from.join(', ') : undefined,
        };
      });
  } catch (error) {
    console.error('❌ Exception fetching Polymarket picks:', error);
    return [];
  }
}

/**
 * Check if recent Polymarket data exists
 */
export async function hasRecentPolymarketData(): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;

  try {
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from('polymarket_predictions')
      .select('predicted_at')
      .gte('predicted_at', hourAgo)
      .limit(1);

    return !error && data && data.length > 0;
  } catch {
    return false;
  }
}
