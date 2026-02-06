import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

function getSupabaseClient(): SupabaseClient | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) return null;
  try {
    return createClient(supabaseUrl, supabaseServiceKey);
  } catch {
    return null;
  }
}

/** Map a trade_history row to the homepage KalshiTrade shape */
function mapRowToTrade(row: any): {
  id: string;
  platform: 'kalshi';
  trade_type: 'yes' | 'no';
  symbol: string;
  market_id?: string;
  entry_price: number;
  amount: number;
  pnl?: number;
  fees: number;
  opened_at: string;
  bot_category?: string;
  confidence?: number;
  edge?: number;
  outcome?: 'win' | 'loss' | 'open';
} {
  const tradeType = (row.trade_type || row.side || 'yes').toString().toLowerCase();
  return {
    id: row.id ?? row.market_id ?? String(row.opened_at ?? ''),
    platform: 'kalshi',
    trade_type: tradeType === 'no' ? 'no' : 'yes',
    symbol: row.symbol ?? row.market_title ?? row.ticker ?? row.market_id ?? 'Market',
    market_id: row.market_id ?? row.ticker ?? undefined,
    entry_price: Number(row.entry_price ?? row.price ?? row.market_price ?? 0),
    amount: Number(row.amount ?? row.stake ?? row.cost ?? 0),
    pnl: row.pnl != null ? Number(row.pnl) : undefined,
    fees: Number(row.fees ?? 0),
    opened_at: row.opened_at ?? row.created_at ?? row.placed_at ?? new Date().toISOString(),
    bot_category: row.bot_category ?? row.category ?? undefined,
    confidence: row.confidence != null ? Number(row.confidence) : undefined,
    edge: row.edge != null ? Number(row.edge) : undefined,
    outcome: row.outcome === 'open' || row.outcome === 'win' || row.outcome === 'loss' ? row.outcome : undefined,
  };
}

/**
 * Kalshi trades for homepage. Reads from Supabase trade_history when configured.
 */
export async function GET(request: NextRequest) {
  const limit = Math.min(Number(request.nextUrl.searchParams.get('limit') ?? 20) || 20, 100);
  const supabase = getSupabaseClient();

  if (!supabase) {
    return NextResponse.json({
      success: true,
      trades: [],
      limit,
      source: 'stub',
    });
  }

  try {
    const { data: rows, error } = await supabase
      .from('trade_history')
      .select('*')
      .order('opened_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.warn('[trades/kalshi] Supabase error:', error.message);
      return NextResponse.json({ success: true, trades: [], limit, source: 'error' });
    }

    const trades = (rows ?? []).map(mapRowToTrade);
    return NextResponse.json({
      success: true,
      trades,
      limit,
      source: 'supabase',
    });
  } catch (e: any) {
    console.warn('[trades/kalshi] Error:', e?.message);
    return NextResponse.json({ success: true, trades: [], limit, source: 'error' });
  }
}
