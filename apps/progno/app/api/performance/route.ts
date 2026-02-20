import { NextResponse } from 'next/server';

/**
 * Performance API
 * Returns accuracy metrics, ROI, and historical performance data from Supabase.
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function getClient() {
  if (!supabaseUrl || !supabaseServiceKey) return null;
  try {
    const { createClient } = require('@supabase/supabase-js');
    return createClient(supabaseUrl, supabaseServiceKey);
  } catch {
    return null;
  }
}

function timeframeToStartDate(timeframe: string): string {
  const days = timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : timeframe === '90d' ? 90 : 365;
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const timeframe = searchParams.get('timeframe') || '30d';
  const startDate = timeframeToStartDate(timeframe);

  const client = getClient();
  if (!client) {
    return NextResponse.json({
      error: 'Database not configured',
      overall: { totalPicks: 0, wins: 0, losses: 0, pushes: 0, accuracy: 0, roi: 0, streak: 0, streakType: 'W' },
      byLeague: {},
      byConfidence: { high: { picks: 0, accuracy: 0 }, medium: { picks: 0, accuracy: 0 }, low: { picks: 0, accuracy: 0 } },
      recentPicks: [],
      weeklyTrend: [],
      timeframe,
      generatedAt: new Date().toISOString(),
    }, { status: 503 });
  }

  try {
    const { data: predictions, error } = await client
      .from('progno_predictions')
      .select('id, category, confidence, is_correct, status, profit, edge_pct, prediction_data, created_at')
      .eq('prediction_type', 'sports')
      .gte('created_at', startDate)
      .order('created_at', { ascending: false });

    if (error) throw error;
    const rows: any[] = predictions || [];

    const completed = rows.filter((r: any) => r.status !== 'pending' && r.status !== 'cancelled');
    const wins = completed.filter((r: any) => r.is_correct === true).length;
    const losses = completed.filter((r: any) => r.is_correct === false).length;
    const pushes = completed.filter((r: any) => r.status === 'partial').length;
    const accuracy = completed.length > 0 ? parseFloat(((wins / completed.length) * 100).toFixed(1)) : 0;

    // ROI: sum profit / (count * $100 stake)
    const totalProfit = completed.reduce((s: number, r: any) => s + (r.profit || 0), 0);
    const roi = completed.length > 0 ? parseFloat((totalProfit / (completed.length * 100) * 100).toFixed(1)) : 0;

    // Current streak from most recent completed picks
    let streak = 0;
    let streakType: 'W' | 'L' = 'W';
    for (const r of completed) {
      if (streak === 0) { streakType = r.is_correct ? 'W' : 'L'; streak = 1; continue; }
      if ((r.is_correct && streakType === 'W') || (!r.is_correct && streakType === 'L')) streak++;
      else break;
    }

    // Weekly trend: accuracy per day for last 7 days
    const weeklyTrend: number[] = [];
    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date(); dayStart.setDate(dayStart.getDate() - i); dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(); dayEnd.setDate(dayEnd.getDate() - i); dayEnd.setHours(23, 59, 59, 999);
      const dayRows = completed.filter((r: any) => {
        const d = new Date(r.created_at);
        return d >= dayStart && d <= dayEnd;
      });
      const dayWins = dayRows.filter((r: any) => r.is_correct === true).length;
      weeklyTrend.push(dayRows.length > 0 ? parseFloat(((dayWins / dayRows.length) * 100).toFixed(1)) : 0);
    }

    // By league
    const byLeague: Record<string, any> = {};
    for (const r of completed) {
      const league = (r.category || 'UNKNOWN').toUpperCase();
      if (!byLeague[league]) byLeague[league] = { picks: 0, wins: 0, profit: 0 };
      byLeague[league].picks++;
      if (r.is_correct) byLeague[league].wins++;
      byLeague[league].profit += (r.profit || 0);
    }
    Object.keys(byLeague).forEach(l => {
      const lg = byLeague[l];
      lg.accuracy = lg.picks > 0 ? parseFloat(((lg.wins / lg.picks) * 100).toFixed(1)) : 0;
      lg.roi = lg.picks > 0 ? parseFloat((lg.profit / (lg.picks * 100) * 100).toFixed(1)) : 0;
      delete lg.profit;
    });

    // By confidence tier
    const high = completed.filter((r: any) => r.confidence >= 70);
    const medium = completed.filter((r: any) => r.confidence >= 57 && r.confidence < 70);
    const low = completed.filter((r: any) => r.confidence < 57);
    const tierAcc = (arr: any[]) => arr.length > 0
      ? parseFloat(((arr.filter((r: any) => r.is_correct).length / arr.length) * 100).toFixed(1))
      : 0;
    const byConfidence = {
      high: { picks: high.length, accuracy: tierAcc(high) },
      medium: { picks: medium.length, accuracy: tierAcc(medium) },
      low: { picks: low.length, accuracy: tierAcc(low) },
    };

    // Recent picks (last 10 completed)
    const recentPicks = rows.slice(0, 10).map((r: any) => {
      const pd = r.prediction_data || {};
      const gd = pd.gameData || {};
      const pred = pd.prediction || {};
      return {
        id: r.id,
        game: `${gd.awayTeam || '?'} @ ${gd.homeTeam || '?'}`,
        pick: pred.predictedWinner || pred.recommendedBet?.side || '?',
        confidence: r.confidence || 0,
        result: r.status === 'pending' ? 'pending' : r.is_correct ? 'W' : 'L',
        date: r.created_at?.split('T')[0] || '',
        league: r.category || '',
        edge: r.edge_pct || 0,
      };
    });

    return NextResponse.json({
      overall: { totalPicks: rows.length, wins, losses, pushes, accuracy, roi, streak, streakType },
      byLeague,
      byConfidence,
      recentPicks,
      weeklyTrend,
      timeframe,
      generatedAt: new Date().toISOString(),
    });

  } catch (error: any) {
    console.error('[PERFORMANCE] Error:', error);
    return NextResponse.json({ error: error.message || 'Query failed' }, { status: 500 });
  }
}

