import { NextResponse } from 'next/server';
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

/**
 * Live stats for homepage. Computed from Supabase trade_history (and bot_metrics fallback) when configured.
 */
export async function GET() {
  const defaultStats = {
    totalTrades: 0,
    openTrades: 0,
    winTrades: 0,
    lossTrades: 0,
    totalPnl: 0,
    winRate: 0,
    avgConfidence: 0,
    avgEdge: 0,
  };

  const supabase = getSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ success: true, stats: defaultStats, source: 'stub' });
  }

  try {
    const { data: trades, error } = await supabase
      .from('trade_history')
      .select('outcome, pnl, confidence, edge')
      .order('opened_at', { ascending: false });

    if (error) {
      console.warn('[stats/live] trade_history error:', error.message);
      return NextResponse.json({ success: true, stats: defaultStats, source: 'error' });
    }

    const list = trades ?? [];
    const totalTrades = list.length;
    const openTrades = list.filter((t: any) => t.outcome === 'open').length;
    const winTrades = list.filter((t: any) => t.outcome === 'win').length;
    const lossTrades = list.filter((t: any) => t.outcome === 'loss').length;
    const totalPnl = list.reduce((sum: number, t: any) => sum + (Number(t.pnl) || 0), 0);
    const resolved = winTrades + lossTrades;
    const winRate = resolved > 0 ? (winTrades / resolved) * 100 : 0;
    const withConf = list.filter((t: any) => t.confidence != null && t.confidence !== '');
    const avgConfidence = withConf.length ? withConf.reduce((s: number, t: any) => s + (Number(t.confidence) || 0), 0) / withConf.length : 0;
    const withEdge = list.filter((t: any) => t.edge != null && t.edge !== '');
    const avgEdge = withEdge.length ? withEdge.reduce((s: number, t: any) => s + (Number(t.edge) || 0), 0) / withEdge.length : 0;

    return NextResponse.json({
      success: true,
      stats: {
        totalTrades,
        openTrades,
        winTrades,
        lossTrades,
        totalPnl,
        winRate,
        avgConfidence: Math.round(avgConfidence * 10) / 10,
        avgEdge: Math.round(avgEdge * 100) / 100,
      },
      source: 'supabase',
    });
  } catch (e: any) {
    console.warn('[stats/live] Error:', e?.message);
    return NextResponse.json({ success: true, stats: defaultStats, source: 'error' });
  }
}
