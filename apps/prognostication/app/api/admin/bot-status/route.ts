import { NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Lazy initialization of Supabase client
function getSupabaseClient(): SupabaseClient | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return null;
  }

  try {
    return createClient(supabaseUrl, supabaseServiceKey);
  } catch (error) {
    console.error('Failed to create Supabase client:', error);
    return null;
  }
}

export async function GET() {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return NextResponse.json(
      {
        success: false,
        error: 'Supabase not configured',
        message: 'NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in environment variables',
      },
      { status: 503 }
    );
  }

  try {
    // Fetch bot performance metrics
    const { data: botMetrics, error: metricsError } = await supabase
      .from('bot_metrics')
      .select('*')
      .order('accuracy', { ascending: false });

    if (metricsError) throw metricsError;

    // Fetch recent predictions (last 24 hours)
    const { data: recentPredictions, error: predsError } = await supabase
      .from('bot_predictions')
      .select('*')
      .gte('predicted_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('predicted_at', { ascending: false })
      .limit(50);

    if (predsError) throw predsError;

    // Fetch recent trades
    const { data: recentTrades, error: tradesError } = await supabase
      .from('trade_history')
      .select('*')
      .order('opened_at', { ascending: false })
      .limit(50);

    if (tradesError) throw tradesError;

    // Fetch learning patterns
    const { data: learningPatterns, error: learningError } = await supabase
      .from('bot_learnings')
      .select('*')
      .order('success_rate', { ascending: false })
      .limit(20);

    if (learningError) throw learningError;

    // Calculate aggregate stats
    const totalPredictions = botMetrics?.reduce((sum, bot) => sum + (bot.total_predictions || 0), 0) || 0;
    const totalCorrect = botMetrics?.reduce((sum, bot) => sum + (bot.correct_predictions || 0), 0) || 0;
    const overallAccuracy = totalPredictions > 0 ? (totalCorrect / totalPredictions * 100).toFixed(2) : '0.00';
    const totalPnl = botMetrics?.reduce((sum, bot) => sum + (bot.total_pnl || 0), 0) || 0;

    // Count pending predictions
    const pendingPredictions = recentPredictions?.filter(p => !p.actual_outcome).length || 0;

    // Calculate win/loss for recent trades
    const openTrades = recentTrades?.filter(t => t.outcome === 'open').length || 0;
    const winningTrades = recentTrades?.filter(t => t.outcome === 'win').length || 0;
    const losingTrades = recentTrades?.filter(t => t.outcome === 'loss').length || 0;

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      summary: {
        totalPredictions,
        overallAccuracy: parseFloat(overallAccuracy),
        totalPnl: parseFloat(totalPnl.toFixed(2)),
        pendingPredictions,
        openTrades,
        winningTrades,
        losingTrades,
      },
      botMetrics: botMetrics || [],
      recentPredictions: recentPredictions || [],
      recentTrades: recentTrades || [],
      learningPatterns: learningPatterns || [],
    });
  } catch (error: any) {
    console.error('Error fetching bot status:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

