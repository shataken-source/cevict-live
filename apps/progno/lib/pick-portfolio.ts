/**
 * PickPortfolio Service - Track Progno picks like a stock portfolio
 * Integrates with NEW pickportfolio migration (pick_portfolios, portfolio_picks, etc.)
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });

let supabase: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (!supabase) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error('Supabase credentials missing for PickPortfolio');
    }
    supabase = createClient(url, key);
  }
  return supabase;
}

// ============================================================================
// TYPES
// ============================================================================

export interface Portfolio {
  id: string;
  user_id: string;
  name: string;
  starting_bankroll: number;
  current_bankroll: number;
  total_profit_loss: number;
  roi: number;
  total_picks: number;
  wins: number;
  losses: number;
  pending: number;
  win_rate: number;
  sharpe_ratio: number;
  max_drawdown: number;
  longest_win_streak: number;
  longest_loss_streak: number;
  is_public: boolean;
  strategy_description?: string;
  created_at: Date;
  updated_at: Date;
}

export interface PortfolioPick {
  id: string;
  portfolio_id: string;
  game_id: string;
  game_title: string;
  league: string;
  pick_type: 'spread' | 'moneyline' | 'total';
  pick_side: string;
  pick_value: number;
  odds: number;
  stake: number;
  predicted_probability: number;
  edge: number;
  status: 'pending' | 'won' | 'lost' | 'push';
  pnl?: number;
  placed_at: Date;
  settled_at?: Date;
}

// ============================================================================
// CREATE PORTFOLIO
// ============================================================================

export async function createPortfolio(params: {
  userId: string;
  name: string;
  startingBankroll: number;
  strategyDescription?: string;
  isPublic?: boolean;
}): Promise<Portfolio | null> {
  try {
    const client = getClient();

    const { data, error } = await client
      .from('pick_portfolios')
      .insert({
        user_id: params.userId,
        name: params.name,
        starting_bankroll: params.startingBankroll,
        current_bankroll: params.startingBankroll,
        is_public: params.isPublic || false,
        strategy_description: params.strategyDescription,
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Error creating portfolio:', error);
      return null;
    }

    return mapPortfolio(data);
  } catch (e: any) {
    console.error('❌ Exception creating portfolio:', e.message);
    return null;
  }
}

// ============================================================================
// ADD PICK TO PORTFOLIO
// ============================================================================

export async function addPickToPortfolio(params: {
  portfolioId: string;
  gameId: string;
  gameTitle: string;
  league: string;
  pickType: 'spread' | 'moneyline' | 'total';
  pickSide: string;
  pickValue: number;
  odds: number;
  stake: number;
  predictedProbability: number;
  edge: number;
}): Promise<PortfolioPick | null> {
  try {
    const client = getClient();

    const { data, error } = await client
      .from('portfolio_picks')
      .insert({
        portfolio_id: params.portfolioId,
        game_id: params.gameId,
        game_title: params.gameTitle,
        league: params.league,
        pick_type: params.pickType,
        pick_side: params.pickSide,
        pick_value: params.pickValue,
        odds: params.odds,
        stake: params.stake,
        predicted_probability: params.predictedProbability,
        edge: params.edge,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Error adding pick:', error);
      return null;
    }

    console.log(`✅ Added pick to portfolio: ${params.gameTitle} (${params.pickSide})`);
    return mapPortfolioPick(data);
  } catch (e: any) {
    console.error('❌ Exception adding pick:', e.message);
    return null;
  }
}

// ============================================================================
// SETTLE PICK (Update outcome)
// ============================================================================

export async function settlePick(params: {
  pickId: string;
  status: 'won' | 'lost' | 'push';
  pnl: number;
}): Promise<boolean> {
  try {
    const client = getClient();

    const { error } = await client
      .from('portfolio_picks')
      .update({
        status: params.status,
        pnl: params.pnl,
        settled_at: new Date().toISOString(),
      })
      .eq('id', params.pickId);

    if (error) {
      console.error('❌ Error settling pick:', error);
      return false;
    }

    console.log(`✅ Settled pick ${params.pickId}: ${params.status} (${params.pnl > 0 ? '+' : ''}${params.pnl.toFixed(2)})`);
    return true;
  } catch (e: any) {
    console.error('❌ Exception settling pick:', e.message);
    return false;
  }
}

// ============================================================================
// GET PORTFOLIO
// ============================================================================

export async function getPortfolio(portfolioId: string): Promise<Portfolio | null> {
  try {
    const client = getClient();

    const { data, error} = await client
      .from('pick_portfolios')
      .select('*')
      .eq('id', portfolioId)
      .single();

    if (error) {
      console.error('❌ Error fetching portfolio:', error);
      return null;
    }

    return data ? mapPortfolio(data) : null;
  } catch (e: any) {
    console.error('❌ Exception fetching portfolio:', e.message);
    return null;
  }
}

// ============================================================================
// GET USER PORTFOLIOS
// ============================================================================

export async function getUserPortfolios(userId: string): Promise<Portfolio[]> {
  try {
    const client = getClient();

    const { data, error } = await client
      .from('pick_portfolios')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching user portfolios:', error);
      return [];
    }

    return (data || []).map(mapPortfolio);
  } catch (e: any) {
    console.error('❌ Exception fetching user portfolios:', e.message);
    return [];
  }
}

// ============================================================================
// GET PORTFOLIO PICKS
// ============================================================================

export async function getPortfolioPicks(portfolioId: string, limit = 50): Promise<PortfolioPick[]> {
  try {
    const client = getClient();

    const { data, error } = await client
      .from('portfolio_picks')
      .select('*')
      .eq('portfolio_id', portfolioId)
      .order('placed_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('❌ Error fetching picks:', error);
      return [];
    }

    return (data || []).map(mapPortfolioPick);
  } catch (e: any) {
    console.error('❌ Exception fetching picks:', e.message);
    return [];
  }
}

// ============================================================================
// GET DAILY SNAPSHOTS (For charting)
// ============================================================================

export async function getPortfolioDailySnapshots(
  portfolioId: string,
  daysBack = 30
): Promise<Array<{
  snapshot_date: Date;
  bankroll: number;
  total_picks: number;
  wins: number;
  losses: number;
  profit_loss: number;
  roi: number;
}>> {
  try {
    const client = getClient();

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysBack);

    const { data, error } = await client
      .from('portfolio_daily_snapshot')
      .select('*')
      .eq('portfolio_id', portfolioId)
      .gte('snapshot_date', cutoffDate.toISOString())
      .order('snapshot_date', { ascending: true });

    if (error) {
      console.error('❌ Error fetching snapshots:', error);
      return [];
    }

    return (data || []).map(d => ({
      snapshot_date: new Date(d.snapshot_date),
      bankroll: Number(d.bankroll),
      total_picks: d.total_picks,
      wins: d.wins,
      losses: d.losses,
      profit_loss: Number(d.profit_loss),
      roi: Number(d.roi || 0),
    }));
  } catch (e: any) {
    console.error('❌ Exception fetching snapshots:', e.message);
    return [];
  }
}

// ============================================================================
// GET PUBLIC PORTFOLIOS (Leaderboard)
// ============================================================================

export async function getPublicPortfolios(limit = 20): Promise<Portfolio[]> {
  try {
    const client = getClient();

    const { data, error } = await client
      .from('pick_portfolios')
      .select('*')
      .eq('is_public', true)
      .gt('total_picks', 10) // Only show portfolios with 10+ picks
      .order('roi', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('❌ Error fetching public portfolios:', error);
      return [];
    }

    return (data || []).map(mapPortfolio);
  } catch (e: any) {
    console.error('❌ Exception fetching public portfolios:', e.message);
    return [];
  }
}

// ============================================================================
// FOLLOW PORTFOLIO
// ============================================================================

export async function followPortfolio(userId: string, portfolioId: string): Promise<boolean> {
  try {
    const client = getClient();

    const { error } = await client
      .from('portfolio_followers')
      .insert({
        follower_id: userId,
        portfolio_id: portfolioId,
      });

    if (error) {
      console.error('❌ Error following portfolio:', error);
      return false;
    }

    console.log(`✅ User ${userId} followed portfolio ${portfolioId}`);
    return true;
  } catch (e: any) {
    console.error('❌ Exception following portfolio:', e.message);
    return false;
  }
}

// ============================================================================
// HELPERS
// ============================================================================

function mapPortfolio(data: any): Portfolio {
  return {
    id: data.id,
    user_id: data.user_id,
    name: data.name,
    starting_bankroll: Number(data.starting_bankroll),
    current_bankroll: Number(data.current_bankroll),
    total_profit_loss: Number(data.total_profit_loss),
    roi: Number(data.roi || 0),
    total_picks: data.total_picks,
    wins: data.wins,
    losses: data.losses,
    pending: data.pending,
    win_rate: Number(data.win_rate || 0),
    sharpe_ratio: Number(data.sharpe_ratio || 0),
    max_drawdown: Number(data.max_drawdown || 0),
    longest_win_streak: data.longest_win_streak,
    longest_loss_streak: data.longest_loss_streak,
    is_public: data.is_public,
    strategy_description: data.strategy_description,
    created_at: new Date(data.created_at),
    updated_at: new Date(data.updated_at),
  };
}

function mapPortfolioPick(data: any): PortfolioPick {
  return {
    id: data.id,
    portfolio_id: data.portfolio_id,
    game_id: data.game_id,
    game_title: data.game_title,
    league: data.league,
    pick_type: data.pick_type,
    pick_side: data.pick_side,
    pick_value: Number(data.pick_value),
    odds: Number(data.odds),
    stake: Number(data.stake),
    predicted_probability: Number(data.predicted_probability),
    edge: Number(data.edge),
    status: data.status,
    pnl: data.pnl ? Number(data.pnl) : undefined,
    placed_at: new Date(data.placed_at),
    settled_at: data.settled_at ? new Date(data.settled_at) : undefined,
  };
}

// ============================================================================
// EXPORT ALL FUNCTIONS
// ============================================================================

export const pickPortfolio = {
  createPortfolio,
  addPickToPortfolio,
  settlePick,
  getPortfolio,
  getUserPortfolios,
  getPortfolioPicks,
  getPortfolioDailySnapshots,
  getPublicPortfolios,
  followPortfolio,
};
