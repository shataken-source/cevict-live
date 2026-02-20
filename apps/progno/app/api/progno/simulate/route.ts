import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

interface SimulationRequest {
  weights: {
    weather: number;
    injuries: number;
    turnoverPercentage: number;
    homeFieldAdvantage: number;
    recentForm: number;
    h2hHistory: number;
    restDays: number;
    lineMovement: number;
  };
  iterations: number;
  gameId?: string;
  gameData?: {
    homeTeam: string;
    awayTeam: string;
    odds: { home: number; away: number; spread?: number; total?: number };
    teamStats?: any;
    recentForm?: any;
    headToHead?: any;
  };
}

function americanToDecimal(odds: number): number {
  return odds > 0 ? odds / 100 + 1 : 100 / Math.abs(odds) + 1;
}

function impliedProb(odds: number): number {
  return 1 / americanToDecimal(odds);
}

function shinDevig(homeRaw: number, awayRaw: number): { home: number; away: number } {
  const total = homeRaw + awayRaw;
  return { home: homeRaw / total, away: awayRaw / total };
}

function formScore(arr: string[]): number {
  const w = [0.35, 0.25, 0.20, 0.12, 0.08];
  return (arr || []).slice(0, 5).reduce((s, r, i) => s + (r === 'W' ? w[i] : 0), 0);
}

function runSimulation(body: SimulationRequest): {
  winRate: number; confidence: number; iterations: number;
  averageScore: { home: number; away: number };
  homeWinProb: number; awayWinProb: number;
} {
  const { weights, iterations, gameData } = body;
  const n = Math.max(1, Math.min(iterations || 1000, 10000));

  if (!gameData?.odds) {
    return { winRate: 0.5, confidence: 0.5, iterations: n, averageScore: { home: 0, away: 0 }, homeWinProb: 0.5, awayWinProb: 0.5 };
  }

  const rawHome = impliedProb(gameData.odds.home);
  const rawAway = impliedProb(gameData.odds.away);
  const { home: baseHome } = shinDevig(rawHome, rawAway);

  // Build model probability from weights + available data
  let modelHome = baseHome;

  // Home field advantage signal
  modelHome += (weights.homeFieldAdvantage || 0) * 0.05;

  // Recent form signal
  if (gameData.recentForm && weights.recentForm > 0) {
    const hf = formScore(gameData.recentForm.home || []);
    const af = formScore(gameData.recentForm.away || []);
    modelHome += (hf - af) * weights.recentForm;
  }

  // H2H signal
  if (gameData.headToHead && weights.h2hHistory > 0) {
    const h2h = gameData.headToHead;
    const total = (h2h.homeWins || 0) + (h2h.awayWins || 0);
    if (total > 0) {
      modelHome += ((h2h.homeWins / total) - 0.5) * weights.h2hHistory;
    }
  }

  // Record differential signal
  if (gameData.teamStats) {
    const ts = gameData.teamStats;
    const hGames = Math.max(1, (ts.home?.wins || 0) + (ts.home?.losses || 0));
    const aGames = Math.max(1, (ts.away?.wins || 0) + (ts.away?.losses || 0));
    const hWp = (ts.home?.wins || 0) / hGames;
    const aWp = (ts.away?.wins || 0) / aGames;
    modelHome += (hWp - aWp) * 0.2;

    // Points differential
    const hNet = ((ts.home?.pointsFor || 0) - (ts.home?.pointsAgainst || 0)) / hGames;
    const aNet = ((ts.away?.pointsFor || 0) - (ts.away?.pointsAgainst || 0)) / aGames;
    modelHome += (hNet - aNet) * 0.02;
  }

  // Injury signal
  if (weights.injuries > 0 && gameData.teamStats) {
    modelHome += weights.injuries * 0.02;
  }

  modelHome = Math.max(0.05, Math.min(0.95, modelHome));

  // Monte Carlo: sample Bernoulli trials with Gaussian noise per iteration
  let homeWins = 0;
  const homeScores: number[] = [];
  const awayScores: number[] = [];

  const sport = 'NFL';
  const baseHomeScore = gameData.teamStats
    ? (gameData.teamStats.home?.pointsFor || 0) / Math.max(1, (gameData.teamStats.home?.wins || 0) + (gameData.teamStats.home?.losses || 0))
    : 24;
  const baseAwayScore = gameData.teamStats
    ? (gameData.teamStats.away?.pointsFor || 0) / Math.max(1, (gameData.teamStats.away?.wins || 0) + (gameData.teamStats.away?.losses || 0))
    : 21;

  for (let i = 0; i < n; i++) {
    // Box-Muller for Gaussian noise
    const u1 = Math.random(), u2 = Math.random();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    const iterProb = Math.max(0.05, Math.min(0.95, modelHome + z * 0.05));

    if (Math.random() < iterProb) homeWins++;

    const scoreNoise = Math.sqrt(-2 * Math.log(Math.random())) * Math.cos(2 * Math.PI * Math.random());
    homeScores.push(Math.max(0, baseHomeScore + scoreNoise * 7));
    awayScores.push(Math.max(0, baseAwayScore + scoreNoise * 7));
  }

  const homeWinRate = homeWins / n;
  const avgHome = homeScores.reduce((a, b) => a + b, 0) / n;
  const avgAway = awayScores.reduce((a, b) => a + b, 0) / n;

  // Confidence = how far from 50/50
  const confidence = Math.abs(homeWinRate - 0.5) * 2;

  return {
    winRate: parseFloat(homeWinRate.toFixed(4)),
    confidence: parseFloat(confidence.toFixed(4)),
    iterations: n,
    averageScore: {
      home: Math.round(avgHome),
      away: Math.round(avgAway),
    },
    homeWinProb: parseFloat(homeWinRate.toFixed(4)),
    awayWinProb: parseFloat((1 - homeWinRate).toFixed(4)),
  };
}

export async function POST(request: NextRequest) {
  try {
    const body: SimulationRequest = await request.json();
    const result = runSimulation(body);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Simulation error:', error);
    return NextResponse.json(
      { error: error?.message || 'Simulation failed' },
      { status: 500 }
    );
  }
}

