import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const u = new URL(request.url);
    const projectId = u.searchParams.get('projectId');
    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
    }
    const supabase = createSupabaseClient();
    if (projectId !== 'alpha-hunter') {
      return NextResponse.json({ trades: 0, pnl: 0, accuracy: 0, predictions: 0 });
    }
    const { data: trades, error: tradesError } = await supabase
      .from('trades_today')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    const { data: predictions, error: predictionsError } = await supabase
      .from('bot_predictions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    let totalPnl = 0;
    if (trades && !tradesError) {
      totalPnl = trades.reduce((sum: number, t: { pnl?: number }) => sum + (t.pnl || 0), 0);
    }
    let accuracy = 0;
    if (predictions && !predictionsError) {
      const resolved = predictions.filter((p: { resolved?: boolean }) => p.resolved === true);
      const correct = resolved.filter((p: { correct?: boolean }) => p.correct === true);
      if (resolved.length > 0) accuracy = (correct.length / resolved.length) * 100;
    }
    return NextResponse.json({
      trades: trades?.length ?? 0,
      pnl: totalPnl,
      accuracy: Math.round(accuracy * 10) / 10,
      predictions: predictions?.length ?? 0,
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error as Error).message || 'Failed to fetch metrics' }, { status: 500 });
  }
}
