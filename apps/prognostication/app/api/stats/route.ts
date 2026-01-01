import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return null;
  }

  return createClient(supabaseUrl, supabaseServiceKey);
}

export async function GET() {
  const supabase = getSupabaseClient();

  if (!supabase) {
    // Return default stats if Supabase not configured
    return NextResponse.json({
      accuracy: 0,
      roi: 0,
      active: 0,
      analyzed: 0,
    });
  }

  try {
    // 1. Calculate ACCURACY from bot_metrics
    const { data: botMetrics, error: metricsError } = await supabase
      .from('bot_metrics')
      .select('*');

    let accuracy = 0;
    if (!metricsError && botMetrics && botMetrics.length > 0) {
      const totalPredictions = botMetrics.reduce((sum, m) => sum + (m.total_predictions || 0), 0);
      const totalCorrect = botMetrics.reduce((sum, m) => sum + (m.correct_predictions || 0), 0);
      if (totalPredictions > 0) {
        accuracy = (totalCorrect / totalPredictions) * 100;
      }
    }

    // 2. Calculate ROI from trade_history or bot_metrics
    let roi = 0;
    const { data: trades, error: tradesError } = await supabase
      .from('trade_history')
      .select('pnl, amount');

    if (!tradesError && trades && trades.length > 0) {
      const totalPnl = trades.reduce((sum, t) => sum + (t.pnl || 0), 0);
      const totalSpent = trades.reduce((sum, t) => sum + (t.amount || 0), 0);
      if (totalSpent > 0) {
        roi = (totalPnl / totalSpent) * 100;
      }
    } else {
      // Fallback to bot_metrics if trade_history not available
      if (botMetrics && botMetrics.length > 0) {
        const totalPnl = botMetrics.reduce((sum, m) => sum + (m.total_pnl || 0), 0);
        const totalPredictions = botMetrics.reduce((sum, m) => sum + (m.total_predictions || 0), 0);
        // Estimate ROI based on avg edge and accuracy
        if (totalPredictions > 0) {
          const avgEdge = botMetrics.reduce((sum, m) => sum + (m.avg_edge || 0), 0) / botMetrics.length;
          roi = (avgEdge * accuracy) / 100; // Simplified ROI calculation
        }
      }
    }

    // 3. Count ACTIVE predictions (open, not yet resolved)
    const { count: activeCount, error: activeError } = await supabase
      .from('bot_predictions')
      .select('*', { count: 'exact', head: true })
      .is('actual_outcome', null);

    const active = activeError ? 0 : (activeCount || 0);

    // 4. Count total ANALYZED (all predictions)
    const { count: totalCount, error: totalError } = await supabase
      .from('bot_predictions')
      .select('*', { count: 'exact', head: true });

    const analyzed = totalError ? 0 : (totalCount || 0);

    return NextResponse.json({
      accuracy: Math.round(accuracy * 10) / 10, // Round to 1 decimal
      roi: Math.round(roi * 10) / 10, // Round to 1 decimal
      active: active,
      analyzed: analyzed,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error fetching stats:', error);
    // Return zeros on error
    return NextResponse.json({
      accuracy: 0,
      roi: 0,
      active: 0,
      analyzed: 0,
      error: error.message,
    });
  }
}

