/**
 * Supabase Memory System for Prognostication
 * Minimal version for bot configuration
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseClient: SupabaseClient | null = null;

function getClient(): SupabaseClient | null {
  if (supabaseClient) return supabaseClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    return null;
  }

  try {
    supabaseClient = createClient(url, key);
    return supabaseClient;
  } catch (error) {
    console.warn('⚠️ Failed to connect to Supabase');
    return null;
  }
}

export async function getBotConfig(): Promise<{
  trading: {
    maxTradeSize: number;
    minConfidence: number;
    minEdge: number;
    dailySpendingLimit: number;
    dailyLossLimit: number;
    maxOpenPositions: number;
    cryptoInterval: number;
    kalshiInterval: number;
  };
  picks: {
    maxPicksDisplay: number;
    minConfidenceDisplay: number;
  };
}> {
  const client = getClient();
  if (!client) {
    // Return defaults if Supabase unavailable
    return {
      trading: {
        maxTradeSize: 5,
        minConfidence: 55,
        minEdge: 2,
        dailySpendingLimit: 50,
        dailyLossLimit: 25,
        maxOpenPositions: 5,
        cryptoInterval: 30000,
        kalshiInterval: 60000,
      },
      picks: {
        maxPicksDisplay: 20,
        minConfidenceDisplay: 50,
      },
    };
  }

  try {
    const { data, error } = await client
      .from('bot_config')
      .select('*');

    if (error) {
      throw error;
    }

    const tradingConfig = data?.find(c => c.config_key === 'trading')?.config_value || {};
    const picksConfig = data?.find(c => c.config_key === 'picks')?.config_value || {};

    return {
      trading: {
        maxTradeSize: tradingConfig.maxTradeSize ?? 5,
        minConfidence: tradingConfig.minConfidence ?? 55,
        minEdge: tradingConfig.minEdge ?? 2,
        dailySpendingLimit: tradingConfig.dailySpendingLimit ?? 50,
        dailyLossLimit: tradingConfig.dailyLossLimit ?? 25,
        maxOpenPositions: tradingConfig.maxOpenPositions ?? 5,
        cryptoInterval: tradingConfig.cryptoInterval ?? 30000,
        kalshiInterval: tradingConfig.kalshiInterval ?? 60000,
      },
      picks: {
        maxPicksDisplay: picksConfig.maxPicksDisplay ?? 20,
        minConfidenceDisplay: picksConfig.minConfidenceDisplay ?? 50,
      },
    };
  } catch (e) {
    console.error('Exception fetching bot config:', e);
    return {
      trading: {
        maxTradeSize: 5,
        minConfidence: 55,
        minEdge: 2,
        dailySpendingLimit: 50,
        dailyLossLimit: 25,
        maxOpenPositions: 5,
        cryptoInterval: 30000,
        kalshiInterval: 60000,
      },
      picks: {
        maxPicksDisplay: 20,
        minConfidenceDisplay: 50,
      },
    };
  }
}

