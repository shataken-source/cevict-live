import { NextResponse } from 'next/server';

/**
 * Performance API
 * Returns accuracy metrics, ROI, and historical performance data
 */

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const timeframe = searchParams.get('timeframe') || '30d';

  // In production, this would query Supabase
  // For now, return realistic sample data based on timeframe
  const data = generatePerformanceData(timeframe);

  return NextResponse.json(data);
}

function generatePerformanceData(timeframe: string) {
  // Seed based on timeframe for consistency
  const seed = timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : timeframe === '90d' ? 90 : 365;
  
  // Calculate base metrics
  const totalPicks = Math.floor(seed * 8 + Math.random() * seed * 2);
  const accuracy = 58 + Math.random() * 12; // 58-70%
  const wins = Math.floor(totalPicks * (accuracy / 100));
  const losses = totalPicks - wins - Math.floor(totalPicks * 0.04); // ~4% pushes
  const pushes = totalPicks - wins - losses;

  // ROI based on accuracy
  const roi = (accuracy - 52.38) * 0.8 + Math.random() * 3; // Break-even is ~52.38%

  // Streak (random but realistic)
  const streakType = Math.random() > 0.4 ? 'W' : 'L';
  const streak = Math.floor(Math.random() * 8) + 1;

  // Weekly trend
  const weeklyTrend = Array.from({ length: 7 }, () => 
    55 + Math.random() * 15
  );

  // League breakdown
  const byLeague: Record<string, any> = {};
  const leagues = ['NFL', 'NBA', 'NCAAF', 'NCAAB', 'NHL', 'MLB'];
  
  leagues.forEach(league => {
    const picks = Math.floor(totalPicks / leagues.length * (0.5 + Math.random()));
    const leagueAccuracy = accuracy + (Math.random() * 10 - 5);
    byLeague[league] = {
      picks,
      wins: Math.floor(picks * (leagueAccuracy / 100)),
      accuracy: parseFloat(leagueAccuracy.toFixed(1)),
      roi: parseFloat(((leagueAccuracy - 52.38) * 0.8 + Math.random() * 3).toFixed(1))
    };
  });

  // Confidence breakdown
  const highPicks = Math.floor(totalPicks * 0.25);
  const mediumPicks = Math.floor(totalPicks * 0.5);
  const lowPicks = totalPicks - highPicks - mediumPicks;

  const byConfidence = {
    high: { 
      picks: highPicks, 
      accuracy: parseFloat((accuracy + 8 + Math.random() * 4).toFixed(1))
    },
    medium: { 
      picks: mediumPicks, 
      accuracy: parseFloat((accuracy + Math.random() * 4 - 2).toFixed(1))
    },
    low: { 
      picks: lowPicks, 
      accuracy: parseFloat((accuracy - 5 + Math.random() * 4).toFixed(1))
    }
  };

  // Recent picks
  const games = [
    ['Chiefs', 'Raiders', 'NFL'],
    ['Lakers', 'Celtics', 'NBA'],
    ['Bills', 'Dolphins', 'NFL'],
    ['Warriors', 'Suns', 'NBA'],
    ['Cowboys', 'Eagles', 'NFL'],
    ['Bucks', 'Heat', 'NBA'],
    ['Alabama', 'Georgia', 'NCAAF'],
    ['Duke', 'UNC', 'NCAAB'],
  ];

  const recentPicks = games.slice(0, 5).map((game, i) => ({
    id: String(i + 1),
    game: `${game[0]} vs ${game[1]}`,
    pick: Math.random() > 0.5 ? `${game[0]} -${(Math.random() * 7 + 1).toFixed(1)}` : `Over ${Math.floor(Math.random() * 20 + 200)}.5`,
    confidence: Math.floor(60 + Math.random() * 25),
    result: i < 4 ? (Math.random() > 0.35 ? 'W' : 'L') : 'pending',
    date: new Date(Date.now() - i * 86400000).toISOString().split('T')[0]
  }));

  return {
    overall: {
      totalPicks,
      wins,
      losses,
      pushes,
      accuracy: parseFloat(accuracy.toFixed(1)),
      roi: parseFloat(roi.toFixed(1)),
      streak,
      streakType
    },
    byLeague,
    byConfidence,
    recentPicks,
    weeklyTrend: weeklyTrend.map(v => parseFloat(v.toFixed(1))),
    timeframe,
    generatedAt: new Date().toISOString()
  };
}

