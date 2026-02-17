import { NextRequest, NextResponse } from 'next/server';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const SECRET = process.env.PROGNO_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD || process.env.CRON_SECRET || '';

interface BetResult {
  game_id: string;
  sport: string;
  pick: string;
  odds: number;
  confidence: number;
  result: 'win' | 'loss' | 'push';
  profit: number;
  edge?: number;
  pick_type?: string;
}

function verifySecret(secret: string): boolean {
  // If no secret is configured, allow all requests (for dev/local use)
  if (!SECRET || SECRET === '') return true;
  // Allow if secret matches
  return secret === SECRET;
}

function loadResultsData(date: string): BetResult[] {
  try {
    const resultsPath = join(process.cwd(), 'results-' + date + '.json');
    const data = JSON.parse(readFileSync(resultsPath, 'utf-8'));
    return data.results || [];
  } catch {
    return [];
  }
}

function loadPredictionsData(date: string): any[] {
  try {
    const predPath = join(process.cwd(), 'predictions-' + date + '.json');
    const data = JSON.parse(readFileSync(predPath, 'utf-8'));
    return data.picks || [];
  } catch {
    return [];
  }
}

function getAllDates(): string[] {
  try {
    const files = readdirSync(process.cwd());
    const resultFiles = files.filter(f => f.startsWith('results-') && f.endsWith('.json'));
    return resultFiles.map(f => f.replace('results-', '').replace('.json', '')).sort().reverse();
  } catch {
    return [];
  }
}

function calculateWinRate(wins: number, total: number): string {
  if (total === 0) return '0.0';
  return ((wins / total) * 100).toFixed(1);
}

function performanceBySport(results: BetResult[]) {
  const bySport: Record<string, { wins: number; losses: number; pushes: number; total: number; profit: number }> = {};

  results.forEach(r => {
    if (!bySport[r.sport]) {
      bySport[r.sport] = { wins: 0, losses: 0, pushes: 0, total: 0, profit: 0 };
    }
    bySport[r.sport][r.result]++;
    bySport[r.sport].total++;
    bySport[r.sport].profit += r.profit || 0;
  });

  return {
    sports: Object.entries(bySport).map(([sport, stats]) => ({
      sport,
      ...stats,
      winRate: calculateWinRate(stats.wins, stats.total - stats.pushes)
    })),
    summary: {
      totalSports: Object.keys(bySport).length,
      totalBets: results.length,
      totalProfit: results.reduce((acc, r) => acc + (r.profit || 0), 0)
    }
  };
}

function valueBetsAnalysis(results: BetResult[], predictions: any[]) {
  const ranges: Array<{ min: number; max: number; range: string; wins: number; losses: number; total: number; profit: number; winRate?: string }> = [
    { min: 0, max: 5, range: '0-5%', wins: 0, losses: 0, total: 0, profit: 0 },
    { min: 5, max: 10, range: '5-10%', wins: 0, losses: 0, total: 0, profit: 0 },
    { min: 10, max: 20, range: '10-20%', wins: 0, losses: 0, total: 0, profit: 0 },
    { min: 20, max: 50, range: '20-50%', wins: 0, losses: 0, total: 0, profit: 0 },
    { min: 50, max: Infinity, range: '50%+', wins: 0, losses: 0, total: 0, profit: 0 }
  ];

  results.forEach(r => {
    const pred = predictions.find(p => p.game_id === r.game_id);
    const edge = pred?.value_bet_edge || 0;

    const range = ranges.find(rng => edge >= rng.min && edge < rng.max);
    if (range) {
      range[r.result === 'win' ? 'wins' : 'losses']++;
      range.total++;
      range.profit += r.profit || 0;
    }
  });

  return {
    ranges: ranges.map(r => ({
      ...r,
      winRate: calculateWinRate(r.wins, r.total)
    })),
    summary: {
      totalAnalyzed: results.length,
      bestPerformingRange: ranges.reduce((best, r) =>
        (r.profit > best.profit ? r : best), ranges[0]).range
    }
  };
}

function confidenceVsResults(results: BetResult[]) {
  const ranges: Array<{ min: number; max: number; range: string; wins: number; losses: number; total: number; winRate?: string }> = [
    { min: 0, max: 70, range: '<70%', wins: 0, losses: 0, total: 0 },
    { min: 70, max: 80, range: '70-80%', wins: 0, losses: 0, total: 0 },
    { min: 80, max: 85, range: '80-85%', wins: 0, losses: 0, total: 0 },
    { min: 85, max: 90, range: '85-90%', wins: 0, losses: 0, total: 0 },
    { min: 90, max: 95, range: '90-95%', wins: 0, losses: 0, total: 0 },
    { min: 95, max: 100, range: '95-100%', wins: 0, losses: 0, total: 0 }
  ];

  results.forEach(r => {
    const range = ranges.find(rng => r.confidence >= rng.min && r.confidence < rng.max);
    if (range) {
      range[r.result === 'win' ? 'wins' : 'losses']++;
      range.total++;
    }
  });

  return {
    ranges: ranges.map(r => ({
      ...r,
      winRate: calculateWinRate(r.wins, r.total)
    })),
    insight: ranges.reduce((highest, r) =>
      (r.winRate > highest.winRate && r.total >= 5 ? r : highest), ranges[0])
  };
}

function monthlySummary(dates: string[]) {
  const byMonth: Record<string, { dates: string[]; wins: number; losses: number; profit: number; bets: number }> = {};

  dates.forEach(date => {
    const month = date.substring(0, 7); // YYYY-MM
    const results = loadResultsData(date);

    if (!byMonth[month]) {
      byMonth[month] = { dates: [], wins: 0, losses: 0, profit: 0, bets: 0 };
    }

    byMonth[month].dates.push(date);
    results.forEach(r => {
      if (r.result === 'win') byMonth[month].wins++;
      if (r.result === 'loss') byMonth[month].losses++;
      byMonth[month].profit += r.profit || 0;
      byMonth[month].bets++;
    });
  });

  return {
    months: Object.entries(byMonth).map(([month, stats]) => ({
      month,
      ...stats,
      winRate: calculateWinRate(stats.wins, stats.bets),
      avgProfitPerBet: stats.bets > 0 ? (stats.profit / stats.bets).toFixed(2) : '0.00'
    })).sort((a, b) => b.month.localeCompare(a.month)),
    summary: {
      totalMonths: Object.keys(byMonth).length,
      bestMonth: Object.entries(byMonth).reduce((best, [m, s]) =>
        (s.profit > best.profit ? { month: m, ...s } : best), { month: '', profit: -Infinity }).month
    }
  };
}

function streakAnalysis(results: BetResult[]) {
  let currentStreak = 0;
  let maxWinStreak = 0;
  let maxLossStreak = 0;
  let currentStreakType: 'win' | 'loss' | null = null;

  const sorted = [...results].sort((a, b) => a.game_id.localeCompare(b.game_id));

  sorted.forEach(r => {
    if (r.result === 'win') {
      if (currentStreakType === 'win') {
        currentStreak++;
      } else {
        currentStreakType = 'win';
        currentStreak = 1;
      }
      maxWinStreak = Math.max(maxWinStreak, currentStreak);
    } else if (r.result === 'loss') {
      if (currentStreakType === 'loss') {
        currentStreak++;
      } else {
        currentStreakType = 'loss';
        currentStreak = 1;
      }
      maxLossStreak = Math.max(maxLossStreak, currentStreak);
    } else {
      currentStreak = 0;
      currentStreakType = null;
    }
  });

  const last5 = sorted.slice(-5);
  const last10 = sorted.slice(-10);

  return {
    currentStreak,
    currentStreakType,
    maxWinStreak,
    maxLossStreak,
    last5: {
      wins: last5.filter(r => r.result === 'win').length,
      losses: last5.filter(r => r.result === 'loss').length,
      profit: last5.reduce((acc, r) => acc + (r.profit || 0), 0)
    },
    last10: {
      wins: last10.filter(r => r.result === 'win').length,
      losses: last10.filter(r => r.result === 'loss').length,
      profit: last10.reduce((acc, r) => acc + (r.profit || 0), 0)
    }
  };
}

function roiByOddsRange(results: BetResult[]) {
  const ranges = [
    { min: -10000, max: -200, range: 'Heavy Favorite (-200+)', wins: 0, losses: 0, total: 0, profit: 0 },
    { min: -200, max: -100, range: 'Favorite (-200 to -100)', wins: 0, losses: 0, total: 0, profit: 0 },
    { min: -100, max: 100, range: 'Pick em (-100 to +100)', wins: 0, losses: 0, total: 0, profit: 0 },
    { min: 100, max: 200, range: 'Underdog (+100 to +200)', wins: 0, losses: 0, total: 0, profit: 0 },
    { min: 200, max: 500, range: 'Big Underdog (+200 to +500)', wins: 0, losses: 0, total: 0, profit: 0 },
    { min: 500, max: Infinity, range: 'Longshot (+500+)', wins: 0, losses: 0, total: 0, profit: 0 }
  ];

  results.forEach(r => {
    const range = ranges.find(rng => r.odds >= rng.min && r.odds < rng.max);
    if (range) {
      range[r.result === 'win' ? 'wins' : 'losses']++;
      range.total++;
      range.profit += r.profit || 0;
    }
  });

  return {
    ranges: ranges.map(r => ({
      ...r,
      winRate: calculateWinRate(r.wins, r.total),
      roi: r.total > 0 ? ((r.profit / (r.total * 100)) * 100).toFixed(1) : '0.0'
    })),
    bestRange: ranges.reduce((best, r) =>
      (r.profit > best.profit ? r : best), ranges[0]).range
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { secret, reportType, date } = body;

    if (!verifySecret(secret)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const dates = getAllDates();

    let results: BetResult[] = [];
    let predictions: any[] = [];

    if (date) {
      results = loadResultsData(date);
      predictions = loadPredictionsData(date);
    } else {
      // Load all available results
      dates.forEach(d => {
        results.push(...loadResultsData(d));
      });
    }

    let reportData;

    switch (reportType) {
      case 'performance-by-sport':
        reportData = performanceBySport(results);
        break;
      case 'value-bets-analysis':
        reportData = valueBetsAnalysis(results, predictions);
        break;
      case 'confidence-vs-results':
        reportData = confidenceVsResults(results);
        break;
      case 'monthly-summary':
        reportData = monthlySummary(dates);
        break;
      case 'streak-analysis':
        reportData = streakAnalysis(results);
        break;
      case 'roi-by-odds-range':
        reportData = roiByOddsRange(results);
        break;
      default:
        return NextResponse.json({ error: 'Unknown report type' }, { status: 400 });
    }

    return NextResponse.json({
      reportType,
      generatedAt: new Date().toISOString(),
      dateRange: date ? { single: date } : { all: dates.length },
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
