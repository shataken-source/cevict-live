/**
 * /api/admin/reports
 * Calculates real accuracy stats from syndicated_picks table in Supabase.
 * Used by /accuracy page. Results cached for 1 hour via Next.js revalidation.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';
export const revalidate = 3600; // cache 1 hour

const ODDS_RANGES = [
  { label: '-200 to -150', min: -200, max: -150 },
  { label: '-150 to -110', min: -150, max: -110 },
  { label: '-110 to +110', min: -110, max: 110 },
  { label: '+110 to +200', min: 110, max: 200 },
  { label: '+200+',        min: 200, max: 99999 },
];

function oddsToROI(odds: number, won: boolean): number {
  if (won) {
    return odds > 0 ? odds / 100 : 100 / Math.abs(odds);
  }
  return -1;
}

function currentStreak(picks: any[]): string[] {
  const sorted = [...picks].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  const streak: string[] = [];
  for (const p of sorted) {
    if (p.result === null || p.result === undefined) continue;
    const won = p.result === 'win' || p.result === true || p.result === 1;
    if (streak.length === 0 || (won ? 'W' : 'L') === streak[0]) {
      streak.push(won ? 'W' : 'L');
    } else {
      break;
    }
  }
  return streak;
}

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // ── Fallback if Supabase not configured ──────────────────────────────────────
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json(buildFallback());
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch all settled picks (have a result)
    const { data: picks, error } = await supabase
      .from('syndicated_picks')
      .select('id, sport, result, odds, confidence, edge, created_at, pick_selection')
      .not('result', 'is', null)
      .order('created_at', { ascending: false })
      .limit(5000);

    if (error || !picks || picks.length === 0) {
      console.warn('[reports] No settled picks found, using fallback');
      return NextResponse.json(buildFallback());
    }

    // ── Core stats ────────────────────────────────────────────────────────────
    const settled = picks.filter(p => p.result !== null && p.result !== undefined);
    const wins = settled.filter(p => p.result === 'win' || p.result === true || p.result === 1);
    const totalPicks = settled.length;
    const winCount = wins.length;
    const winRate = totalPicks > 0 ? Math.round((winCount / totalPicks) * 1000) / 10 : 0;

    // Average ROI across all settled picks
    const totalROI = settled.reduce((sum, p) => {
      const won = p.result === 'win' || p.result === true || p.result === 1;
      return sum + oddsToROI(p.odds || -110, won);
    }, 0);
    const avgROI = totalPicks > 0 ? Math.round((totalROI / totalPicks) * 1000) / 10 : 0;

    // ── By sport ──────────────────────────────────────────────────────────────
    const sportMap: Record<string, { picks: number; wins: number }> = {};
    for (const p of settled) {
      const sport = (p.sport || 'OTHER').toUpperCase();
      if (!sportMap[sport]) sportMap[sport] = { picks: 0, wins: 0 };
      sportMap[sport].picks++;
      if (p.result === 'win' || p.result === true || p.result === 1) sportMap[sport].wins++;
    }
    const bySport: Record<string, { picks: number; wins: number; winRate: number }> = {};
    for (const [sport, data] of Object.entries(sportMap)) {
      bySport[sport] = {
        picks: data.picks,
        wins: data.wins,
        winRate: data.picks > 0 ? Math.round((data.wins / data.picks) * 1000) / 10 : 0,
      };
    }

    // ── By odds range ─────────────────────────────────────────────────────────
    const byOddsRange: Record<string, { picks: number; roi: number }> = {};
    for (const range of ODDS_RANGES) {
      const inRange = settled.filter(p => {
        const o = p.odds || -110;
        return o >= range.min && o < range.max;
      });
      if (inRange.length === 0) continue;
      const rangeROI = inRange.reduce((sum, p) => {
        const won = p.result === 'win' || p.result === true || p.result === 1;
        return sum + oddsToROI(p.odds || -110, won);
      }, 0);
      byOddsRange[range.label] = {
        picks: inRange.length,
        roi: Math.round((rangeROI / inRange.length) * 1000) / 10,
      };
    }

    // ── Recent streak ─────────────────────────────────────────────────────────
    const recentStreak = currentStreak(settled);

    // ── Today's signal count ──────────────────────────────────────────────────
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const { count: todayCount } = await supabase
      .from('syndicated_picks')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', todayStart.toISOString());

    return NextResponse.json({
      totalPicks,
      wins: winCount,
      losses: totalPicks - winCount,
      winRate,
      avgROI,
      bySport,
      byOddsRange,
      recentStreak,
      todaySignals: todayCount || 0,
      calculatedAt: new Date().toISOString(),
      source: 'supabase',
    });

  } catch (err: any) {
    console.error('[reports] Error calculating stats:', err.message);
    return NextResponse.json(buildFallback());
  }
}

// ── Fallback when Supabase unavailable ────────────────────────────────────────
function buildFallback() {
  return {
    totalPicks: 0,
    wins: 0,
    losses: 0,
    winRate: 0,
    avgROI: 0,
    bySport: {},
    byOddsRange: {},
    recentStreak: [],
    todaySignals: 0,
    calculatedAt: new Date().toISOString(),
    source: 'fallback',
  };
}
