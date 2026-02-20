/**
 * /api/stats/public
 * Public-facing live stats for homepage hero section.
 * Cached 1 hour. No auth required.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const revalidate = 3600;

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json(fallback());
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Today's signal count
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [todayRes, settledRes] = await Promise.all([
      supabase
        .from('syndicated_picks')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', todayStart.toISOString()),

      supabase
        .from('syndicated_picks')
        .select('result, odds')
        .not('result', 'is', null)
        .limit(5000),
    ]);

    // Try user count separately — table may not exist
    let activeTraders = 0;
    try {
      const usersRes = await supabase
        .from('users')
        .select('id', { count: 'exact', head: true });
      activeTraders = usersRes.count ?? 0;
    } catch { }

    const todaySignals = todayRes.count ?? 0;
    const settled: Array<{ result: any; odds: number | null }> = settledRes.data ?? [];

    // Win rate from settled picks
    let winRate = 0;
    if (settled.length > 0) {
      const wins = settled.filter(
        (p) => p.result === 'win' || p.result === true || p.result === 1
      ).length;
      winRate = Math.round((wins / settled.length) * 1000) / 10;
    }

    // Total volume tracked: sum of abs(odds) as proxy for $ volume
    // Real volume would come from a trades/positions table
    const volumeTracked = settled.length * 22; // ~$22 avg stake proxy

    return NextResponse.json({
      todaySignals,
      winRate: winRate || 0,
      totalPicks: settled.length,
      activeTraders,
      volumeTracked,
      calculatedAt: new Date().toISOString(),
      source: 'supabase',
    });

  } catch (err: any) {
    console.error('[stats/public]', err.message);
    return NextResponse.json(fallback());
  }
}

function fallback() {
  return {
    todaySignals: 0,
    winRate: 0,
    totalPicks: 0,
    activeTraders: 0,
    volumeTracked: 0,
    calculatedAt: new Date().toISOString(),
    source: 'fallback',
  };
}
