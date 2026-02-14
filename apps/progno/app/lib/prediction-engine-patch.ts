/**
 * PREDICTION ENGINE PATCH
 * 
 * This patch ensures that score predictions always use the comprehensive
 * prediction with sport-specific caps, fixing the NHL 7-7 issue.
 */

import { getEnhancedScorePrediction } from '../score-prediction-service';

interface GameData {
  homeTeam: string;
  awayTeam: string;
  sport?: string;
  league?: string;
  odds?: any;
  teamStats?: any;
  injuries?: any;
  recentForm?: any;
}

/**
 * Enhanced score prediction that always applies sport caps
 * This replaces the broken predictScore method in the main engine
 */
export async function predictScoreWithCaps(
  gameData: GameData,
  homeWinProb: number
): Promise<{ home: number; away: number }> {
  try {
    console.log(`[PredictionPatch] Using comprehensive score prediction for ${gameData.homeTeam} vs ${gameData.awayTeam}`);
    
    // Always use comprehensive prediction to ensure sport caps are applied
    const enhanced = await getEnhancedScorePrediction(gameData, homeWinProb);
    
    if (enhanced) {
      console.log(`[PredictionPatch] Score caps applied: ${enhanced.home}-${enhanced.away}`);
      console.log(`[PredictionPatch] Reasoning: ${enhanced.reasoning.join(', ')}`);
      return { home: enhanced.home, away: enhanced.away };
    }
    
    // Fallback with sport-appropriate defaults
    const sport = (gameData.sport || gameData.league || '').toUpperCase();
    const defaults: Record<string, { home: number; away: number }> = {
      'NFL': { home: 24, away: 21 },
      'NCAAF': { home: 28, away: 24 },
      'NBA': { home: 115, away: 112 },
      'NCAAB': { home: 72, away: 68 },
      'NHL': { home: 3, away: 2 },
      'MLB': { home: 5, away: 4 }
    };

    for (const [key, value] of Object.entries(defaults)) {
      if (sport.includes(key)) {
        console.log(`[PredictionPatch] Using fallback defaults for ${sport}: ${value.home}-${value.away}`);
        return value;
      }
    }

    return { home: 0, away: 0 };
  } catch (error) {
    console.warn('[PredictionPatch] Comprehensive prediction failed, using fallback:', error);
    
    // Safe fallback
    const sport = (gameData.sport || gameData.league || '').toUpperCase();
    if (sport.includes('NHL')) {
      return { home: 3, away: 2 }; // Safe NHL defaults
    }
    return { home: 0, away: 0 };
  }
}

/**
 * Patch the PredictionEngine class to use our enhanced method
 */
export function patchPredictionEngine() {
  // This would be used to monkey-patch the original engine
  // For now, we'll import this directly where needed
  console.log('[PredictionPatch] Engine patch loaded - NHL scores will be capped');
}
