// app/weekly-analyzer.ts
import { predictGameWithEnrichment, predictGamesWithEnrichment } from '@/lib/data-sources/predict-with-enrichment';
import { getClaudeEffectEngine } from '@/lib/data-sources/claude-effect-complete';
import { Game, GamePrediction, ModelCalibration, WeeklyAnalysis, TrendAnalysis } from '@/lib/data-sources/weekly-analyzer-types'; // adjust if types are elsewhere

// Your original helper functions here (weather, injury, clamp, etc.)
function calculateWeatherImpact(weather?: any): number {
  if (!weather) return 0;
  let impact = 0;
  if (weather.temperature < 32) impact -= 0.05;
  else if (weather.temperature > 90) impact -= 0.03;
  if (weather.windSpeed > 20) impact -= 0.08;
  else if (weather.windSpeed > 12) impact -= 0.05;
  else if (weather.windSpeed > 8) impact -= 0.02;
  const cond = weather.conditions?.toLowerCase?.() || '';
  if (cond.includes('rain') || cond.includes('snow')) impact -= 0.07;
  return impact;
}

function calculateInjuryImpact(injuries?: any): number {
  if (!injuries) return 0;
  const homeImpact = injuries.homeImpact ?? 0;
  const awayImpact = injuries.awayImpact ?? 0;
  return Math.max(-0.1, Math.min(0.1, (awayImpact - homeImpact) * 0.5));
}

function clamp(val: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, val));
}

function round2(val: number): number {
  return Math.round(val * 100) / 100;
}

// The main function (your original + hardened calls)
export async function analyzeWeeklyGames(games: Game[], calibration?: ModelCalibration): Promise<WeeklyAnalysis> {
  if (!games || games.length === 0) {
    return {
      games: [],
      predictions: [],
      summary: {
        totalGames: 0,
        bestBets: [],
        upsetAlerts: [],
        trendAnalysis: {
          homeWinRate: 0,
          favoriteWinRate: 0,
          overUnderRate: 0,
          averageScore: 0,
          weatherImpact: 0,
        },
      },
    };
  }

  const enrichedGames = await Promise.all(
    games.map(async (game) => {
      try {
        return await predictGameWithEnrichment(game, calibration);
      } catch (error: any) {
        console.warn(`Enrichment failed for ${game.homeTeam} vs ${game.awayTeam}:`, error.message);
        return {
          game,
          predictedWinner: game.homeTeam,
          confidence: 0.55,
          predictedScore: { home: 24, away: 21 },
          keyFactors: ['Enrichment failed'],
          riskLevel: 'medium' as const,
          stake: 10,
          pick: game.homeTeam,
          edge: 0,
          gameId: game.id,
          rationale: 'Fallback prediction',
        };
      }
    })
  );

  const predictions = enrichedGames.filter((p): p is GamePrediction => !!p);

  const bestBets = predictions.filter(p => p.confidence >= 0.60 && p.edge >= 0.03);
  const upsetAlerts = predictions.filter(p => p.riskLevel === 'high');

  const trendAnalysis: TrendAnalysis = {
    homeWinRate: predictions.length > 0 ? predictions.filter(p => p.predictedWinner === p.game.homeTeam).length / predictions.length : 0.5,
    favoriteWinRate: 0.55,
    overUnderRate: 0.5,
    averageScore: 45,
    weatherImpact: 0,
  };

  return {
    games: predictions.map(p => p.game),
    predictions,
    summary: {
      totalGames: predictions.length,
      bestBets,
      upsetAlerts,
      trendAnalysis,
    },
  };
}

export { predictGameWithEnrichment as predictGame };
export type { ModelCalibration } from '@/lib/data-sources/weekly-analyzer-types';
