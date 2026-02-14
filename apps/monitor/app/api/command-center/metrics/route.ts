import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
    }

    const supabase = createSupabaseClient();

    // Alpha Hunter specific metrics
    if (projectId === 'alpha-hunter') {
      // Get today's trades
      const { data: trades, error: tradesError } = await supabase
        .from('trades_today')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      // Get predictions
      const { data: predictions, error: predictionsError } = await supabase
        .from('bot_predictions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      // Calculate P&L
      let totalPnl = 0;
      if (trades && !tradesError) {
        totalPnl = trades.reduce((sum, trade) => sum + (trade.pnl || 0), 0);
      }

      // Calculate accuracy (from resolved predictions)
      let accuracy = 0;
      if (predictions && !predictionsError) {
        const resolved = predictions.filter(p => p.resolved === true);
        const correct = resolved.filter(p => p.correct === true);
        if (resolved.length > 0) {
          accuracy = (correct.length / resolved.length) * 100;
        }
      }

      return NextResponse.json({
        trades: trades?.length || 0,
        pnl: totalPnl,
        accuracy: Math.round(accuracy * 10) / 10,
        predictions: predictions?.length || 0,
      });
    }

    // Other projects - return basic metrics
    return NextResponse.json({
      trades: 0,
      pnl: 0,
      accuracy: 0,
      predictions: 0,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch metrics' },
      { status: 500 }
    );
  }
}

