import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SECRET = process.env.PROGNO_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD || process.env.CRON_SECRET || '';

function verifySecret(secret: string): boolean {
  if (!SECRET || SECRET === '') {
    console.warn('[reports] WARNING: No admin secret configured — all requests blocked. Set PROGNO_ADMIN_PASSWORD.');
    return false;
  }
  return secret === SECRET;
}

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

function winRate(wins: number, total: number): string {
  if (total === 0) return '0.0';
  return ((wins / total) * 100).toFixed(1);
}

/** Calculate profit from American odds for a $1 unit bet.
 *  Loss = -1.00, Win at -110 = +0.91, Win at +150 = +1.50 */
function profitFromOdds(odds: number, won: boolean): number {
  if (!won) return -1;
  if (odds > 0) return odds / 100;           // +200 wins $2.00 per $1
  return 100 / Math.abs(odds);               // -150 wins $0.6667 per $1
}

interface Row {
  game_date: string;
  sport: string;
  league: string;
  pick: string;
  home_team: string;
  away_team: string;
  confidence: number;
  status: 'win' | 'lose' | 'pending';
  odds?: number;
  value_bet_edge?: number;
  expected_value?: number;
}

/** Load graded results from Supabase, joined with picks for odds/edge data */
async function loadResults(dateFilter?: string): Promise<{ rows: Row[]; error?: string }> {
  const sb = getSupabase();
  if (!sb) return { rows: [], error: 'Supabase not configured' };

  // Load graded prediction_results
  let q = sb.from('prediction_results').select('*').in('status', ['win', 'lose']);
  if (dateFilter) q = q.eq('game_date', dateFilter);
  const { data: results, error: resErr } = await q.order('game_date', { ascending: false }).limit(5000);
  if (resErr) return { rows: [], error: resErr.message };
  if (!results || results.length === 0) return { rows: [] };

  // Load picks to get odds + edge.
  // The picks table has game_time (ISO timestamp) but NOT game_date.
  // prediction_results has game_date (YYYY-MM-DD). Derive date from game_time for join.
  // Also try joining by home_team + away_team without date as fallback.
  let picksMap = new Map<string, any>();

  // Fetch picks matching result teams. Use original-case team names from prediction_results
  // (Supabase .in() is case-sensitive, and picks table stores proper case like "Dallas Mavericks").
  const uniqueHomes = [...new Set(results.map((r: any) => r.home_team).filter(Boolean))];

  for (let i = 0; i < uniqueHomes.length; i += 30) {
    const batch = uniqueHomes.slice(i, i + 30);
    const { data: picks } = await sb.from('picks')
      .select('home_team,away_team,game_time,odds,value_bet_edge,expected_value,pick')
      .in('home_team', batch)
      .order('created_at', { ascending: false })
      .limit(2000);
    if (picks) {
      for (const p of picks) {
        // Derive game_date from game_time
        let gameDate = '';
        if (p.game_time) {
          try { gameDate = new Date(p.game_time).toISOString().split('T')[0]; } catch { }
        }
        // Extract numeric odds: handle both number and {home, away} object formats
        let oddsNum: number | undefined;
        if (p.odds != null) {
          if (typeof p.odds === 'number') {
            oddsNum = p.odds;
          } else if (typeof p.odds === 'object' && p.odds !== null) {
            // odds is {home: -150, away: +130} — pick the side that matches the pick
            const isHomePick = p.pick && p.home_team && p.pick.toLowerCase().includes(p.home_team.toLowerCase().split(' ').pop() || '');
            oddsNum = isHomePick ? Number((p.odds as any).home) : Number((p.odds as any).away);
            if (isNaN(oddsNum as number)) oddsNum = undefined;
          }
        }

        const key = `${gameDate}|${(p.home_team || '').toLowerCase()}|${(p.away_team || '').toLowerCase()}`;
        picksMap.set(key, { ...p, odds: oddsNum });
        // Also store without date as fallback key
        const keyNoDate = `|${(p.home_team || '').toLowerCase()}|${(p.away_team || '').toLowerCase()}`;
        if (!picksMap.has(keyNoDate)) picksMap.set(keyNoDate, { ...p, odds: oddsNum });
      }
    }
  }

  const rows: Row[] = results.map((r: any) => {
    const key = `${r.game_date}|${(r.home_team || '').toLowerCase()}|${(r.away_team || '').toLowerCase()}`;
    const keyNoDate = `|${(r.home_team || '').toLowerCase()}|${(r.away_team || '').toLowerCase()}`;
    const pick = picksMap.get(key) || picksMap.get(keyNoDate);
    return {
      game_date: r.game_date,
      sport: (r.sport || r.league || 'unknown').toUpperCase(),
      league: (r.league || r.sport || 'unknown').toUpperCase(),
      pick: r.pick,
      home_team: r.home_team || '',
      away_team: r.away_team || '',
      confidence: Number(r.confidence) || 0,
      status: r.status as 'win' | 'lose',
      odds: pick?.odds ? Number(pick.odds) : undefined,
      value_bet_edge: pick?.value_bet_edge ? Number(pick.value_bet_edge) : undefined,
      expected_value: pick?.expected_value ? Number(pick.expected_value) : undefined,
    };
  });

  return { rows };
}

function fmtOdds(odds: number | undefined): string {
  if (odds == null) return '—';
  return odds > 0 ? `+${odds}` : String(odds);
}

function performanceBySport(rows: Row[]) {
  const bySport: Record<string, { wins: number; losses: number; total: number; profit: number; oddsSum: number; oddsCount: number; avgConf: number }> = {};
  for (const r of rows) {
    const sport = r.sport || 'UNKNOWN';
    if (!bySport[sport]) bySport[sport] = { wins: 0, losses: 0, total: 0, profit: 0, oddsSum: 0, oddsCount: 0, avgConf: 0 };
    const won = r.status === 'win';
    if (won) bySport[sport].wins++;
    else bySport[sport].losses++;
    bySport[sport].total++;
    bySport[sport].profit += profitFromOdds(r.odds || -110, won);
    if (r.odds != null) { bySport[sport].oddsSum += r.odds; bySport[sport].oddsCount++; }
    bySport[sport].avgConf += r.confidence;
  }
  return {
    sports: Object.entries(bySport)
      .map(([sport, s]) => ({
        sport, wins: s.wins, losses: s.losses, total: s.total,
        winRate: winRate(s.wins, s.total),
        profit: Math.round(s.profit * 100) / 100,
        avgOdds: s.oddsCount > 0 ? fmtOdds(Math.round(s.oddsSum / s.oddsCount)) : '—',
        avgConf: s.total > 0 ? (s.avgConf / s.total).toFixed(1) : '—',
      }))
      .sort((a, b) => b.total - a.total),
    summary: {
      totalSports: Object.keys(bySport).length,
      totalBets: rows.length,
      totalProfit: Math.round(rows.reduce((a, r) => a + profitFromOdds(r.odds || -110, r.status === 'win'), 0) * 100) / 100,
      totalWins: rows.filter(r => r.status === 'win').length,
      totalLosses: rows.filter(r => r.status === 'lose').length,
      overallWinRate: winRate(rows.filter(r => r.status === 'win').length, rows.length),
    }
  };
}

function valueBetsAnalysis(rows: Row[]) {
  const ranges = [
    { min: 0, max: 5, range: '0-5%', wins: 0, losses: 0, total: 0, profit: 0 },
    { min: 5, max: 10, range: '5-10%', wins: 0, losses: 0, total: 0, profit: 0 },
    { min: 10, max: 20, range: '10-20%', wins: 0, losses: 0, total: 0, profit: 0 },
    { min: 20, max: 50, range: '20-50%', wins: 0, losses: 0, total: 0, profit: 0 },
    { min: 50, max: Infinity, range: '50%+', wins: 0, losses: 0, total: 0, profit: 0 },
  ];
  for (const r of rows) {
    const edge = r.value_bet_edge || 0;
    const rng = ranges.find(x => edge >= x.min && edge < x.max);
    if (!rng) continue;
    const won = r.status === 'win';
    if (won) rng.wins++; else rng.losses++;
    rng.total++;
    rng.profit += profitFromOdds(r.odds || -110, won);
  }
  return {
    ranges: ranges.map(r => ({ ...r, winRate: winRate(r.wins, r.total), profit: Math.round(r.profit * 100) / 100 })),
    summary: { totalAnalyzed: rows.length, bestPerformingRange: ranges.reduce((b, r) => r.profit > b.profit ? r : b, ranges[0]).range }
  };
}

function confidenceVsResults(rows: Row[]) {
  const ranges = [
    { min: 0, max: 70, range: '<70%', wins: 0, losses: 0, total: 0, profit: 0, oddsSum: 0, oddsCount: 0 },
    { min: 70, max: 80, range: '70-80%', wins: 0, losses: 0, total: 0, profit: 0, oddsSum: 0, oddsCount: 0 },
    { min: 80, max: 85, range: '80-85%', wins: 0, losses: 0, total: 0, profit: 0, oddsSum: 0, oddsCount: 0 },
    { min: 85, max: 90, range: '85-90%', wins: 0, losses: 0, total: 0, profit: 0, oddsSum: 0, oddsCount: 0 },
    { min: 90, max: 95, range: '90-95%', wins: 0, losses: 0, total: 0, profit: 0, oddsSum: 0, oddsCount: 0 },
    { min: 95, max: 101, range: '95-100%', wins: 0, losses: 0, total: 0, profit: 0, oddsSum: 0, oddsCount: 0 },
  ];
  for (const r of rows) {
    const rng = ranges.find(x => r.confidence >= x.min && r.confidence < x.max);
    if (!rng) continue;
    if (r.status === 'win') rng.wins++; else rng.losses++;
    rng.total++;
    rng.profit += profitFromOdds(r.odds || -110, r.status === 'win');
    if (r.odds != null) { rng.oddsSum += r.odds; rng.oddsCount++; }
  }
  return {
    ranges: ranges.map(r => ({
      range: r.range, wins: r.wins, losses: r.losses, total: r.total,
      winRate: winRate(r.wins, r.total),
      profit: Math.round(r.profit * 100) / 100,
      avgOdds: r.oddsCount > 0 ? fmtOdds(Math.round(r.oddsSum / r.oddsCount)) : '—',
    })),
    insight: ranges.reduce((h, r) => (parseFloat(winRate(r.wins, r.total)) > parseFloat(winRate(h.wins, h.total)) && r.total >= 5 ? r : h), ranges[0])
  };
}

function monthlySummary(rows: Row[]) {
  const byMonth: Record<string, { wins: number; losses: number; profit: number; bets: number; oddsSum: number; oddsCount: number }> = {};
  for (const r of rows) {
    const month = (r.game_date || '').substring(0, 7);
    if (!month) continue;
    if (!byMonth[month]) byMonth[month] = { wins: 0, losses: 0, profit: 0, bets: 0, oddsSum: 0, oddsCount: 0 };
    const won = r.status === 'win';
    if (won) byMonth[month].wins++; else byMonth[month].losses++;
    byMonth[month].bets++;
    byMonth[month].profit += profitFromOdds(r.odds || -110, won);
    if (r.odds != null) { byMonth[month].oddsSum += r.odds; byMonth[month].oddsCount++; }
  }
  return {
    months: Object.entries(byMonth).map(([month, s]) => ({
      month, wins: s.wins, losses: s.losses, bets: s.bets,
      profit: Math.round(s.profit * 100) / 100,
      winRate: winRate(s.wins, s.bets),
      avgProfitPerBet: s.bets > 0 ? (s.profit / s.bets).toFixed(2) : '0.00',
      avgOdds: s.oddsCount > 0 ? fmtOdds(Math.round(s.oddsSum / s.oddsCount)) : '—',
      roi: s.bets > 0 ? ((s.profit / s.bets) * 100).toFixed(1) : '0.0',
    })).sort((a, b) => b.month.localeCompare(a.month)),
    summary: { totalMonths: Object.keys(byMonth).length }
  };
}

/** Individual pick details — most recent first, with full odds/confidence/result */
function pickDetails(rows: Row[]) {
  const sorted = [...rows].sort((a, b) => (b.game_date || '').localeCompare(a.game_date || ''));
  const picks = sorted.slice(0, 200).map(r => ({
    date: r.game_date,
    matchup: `${r.away_team} @ ${r.home_team}`,
    pick: r.pick,
    sport: r.sport,
    confidence: r.confidence,
    odds: r.odds != null ? fmtOdds(r.odds) : '—',
    oddsRaw: r.odds,
    result: r.status,
    profit: Math.round(profitFromOdds(r.odds || -110, r.status === 'win') * 100) / 100,
    edge: r.value_bet_edge != null ? `${r.value_bet_edge.toFixed(1)}%` : '—',
    ev: r.expected_value != null ? r.expected_value.toFixed(2) : '—',
  }));
  const withOdds = rows.filter(r => r.odds != null);
  const favPicks = withOdds.filter(r => (r.odds || 0) < 0);
  const dogPicks = withOdds.filter(r => (r.odds || 0) > 0);
  return {
    picks,
    summary: {
      total: rows.length,
      withOdds: withOdds.length,
      withoutOdds: rows.length - withOdds.length,
      favorites: favPicks.length,
      favWinRate: winRate(favPicks.filter(r => r.status === 'win').length, favPicks.length),
      underdogs: dogPicks.length,
      dogWinRate: winRate(dogPicks.filter(r => r.status === 'win').length, dogPicks.length),
    }
  };
}

function streakAnalysis(rows: Row[]) {
  const sorted = [...rows].sort((a, b) => (a.game_date || '').localeCompare(b.game_date || ''));
  let currentStreak = 0, maxWinStreak = 0, maxLossStreak = 0;
  let currentStreakType: 'win' | 'lose' | null = null;
  for (const r of sorted) {
    if (r.status === 'win') {
      if (currentStreakType === 'win') currentStreak++; else { currentStreakType = 'win'; currentStreak = 1; }
      maxWinStreak = Math.max(maxWinStreak, currentStreak);
    } else {
      if (currentStreakType === 'lose') currentStreak++; else { currentStreakType = 'lose'; currentStreak = 1; }
      maxLossStreak = Math.max(maxLossStreak, currentStreak);
    }
  }
  const last5 = sorted.slice(-5), last10 = sorted.slice(-10);
  const sliceStats = (s: Row[]) => ({
    wins: s.filter(r => r.status === 'win').length,
    losses: s.filter(r => r.status === 'lose').length,
    profit: Math.round(s.reduce((a, r) => a + profitFromOdds(r.odds || -110, r.status === 'win'), 0) * 100) / 100,
  });
  return { currentStreak, currentStreakType: currentStreakType === 'lose' ? 'loss' : currentStreakType, maxWinStreak, maxLossStreak, last5: sliceStats(last5), last10: sliceStats(last10) };
}

function roiByOddsRange(rows: Row[]) {
  const ranges = [
    { min: -10000, max: -200, range: 'Heavy Fav (-200+)', wins: 0, losses: 0, total: 0, profit: 0 },
    { min: -200, max: -100, range: 'Favorite (-200 to -100)', wins: 0, losses: 0, total: 0, profit: 0 },
    { min: -100, max: 100, range: 'Pick em (-100 to +100)', wins: 0, losses: 0, total: 0, profit: 0 },
    { min: 100, max: 200, range: 'Dog (+100 to +200)', wins: 0, losses: 0, total: 0, profit: 0 },
    { min: 200, max: 500, range: 'Big Dog (+200 to +500)', wins: 0, losses: 0, total: 0, profit: 0 },
    { min: 500, max: Infinity, range: 'Longshot (+500+)', wins: 0, losses: 0, total: 0, profit: 0 },
  ];
  for (const r of rows) {
    const odds = r.odds || 0;
    const rng = ranges.find(x => odds >= x.min && odds < x.max);
    if (!rng) continue;
    const won = r.status === 'win';
    if (won) rng.wins++; else rng.losses++;
    rng.total++;
    rng.profit += profitFromOdds(r.odds || -110, won);
  }
  return {
    ranges: ranges.map(r => ({
      ...r, profit: Math.round(r.profit * 100) / 100,
      winRate: winRate(r.wins, r.total),
      roi: r.total > 0 ? ((r.profit / r.total) * 100).toFixed(1) : '0.0'
    })),
    bestRange: ranges.reduce((b, r) => r.profit > b.profit ? r : b, ranges[0]).range
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { secret, reportType, date } = body;

    if (!verifySecret(secret)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { rows, error: loadError } = await loadResults(date);
    if (loadError) {
      return NextResponse.json({ error: loadError }, { status: 500 });
    }

    let reportData;
    switch (reportType) {
      case 'performance-by-sport':
        reportData = performanceBySport(rows);
        break;
      case 'value-bets-analysis':
        reportData = valueBetsAnalysis(rows);
        break;
      case 'confidence-vs-results':
        reportData = confidenceVsResults(rows);
        break;
      case 'monthly-summary':
        reportData = monthlySummary(rows);
        break;
      case 'streak-analysis':
        reportData = streakAnalysis(rows);
        break;
      case 'roi-by-odds-range':
        reportData = roiByOddsRange(rows);
        break;
      case 'pick-details':
        reportData = pickDetails(rows);
        break;
      default:
        return NextResponse.json({ error: 'Unknown report type' }, { status: 400 });
    }

    return NextResponse.json({
      reportType,
      generatedAt: new Date().toISOString(),
      totalRows: rows.length,
      dateRange: date ? { single: date } : { all: 'all graded results' },
      ...reportData
    });
  } catch (error) {
    console.error('Reports API error:', error);
    return NextResponse.json(
      { error: 'Failed to generate report', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
