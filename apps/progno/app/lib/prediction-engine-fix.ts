/**
 * PREDICTION ENGINE FIXES
 * 
 * This file contains fixes for the prediction engine issues:
 * 1. NHL score caps not being applied consistently
 * 2. Better error handling for early lines analysis
 * 3. Improved admin report readability
 */

import { getEnhancedScorePrediction } from '../score-prediction-service';

/**
 * Enhanced score prediction wrapper that always applies sport caps
 */
export async function getScoreWithCaps(
  gameData: any,
  homeWinProb: number
): Promise<{ home: number; away: number }> {
  try {
    // Always use comprehensive prediction to ensure sport caps are applied
    const enhanced = await getEnhancedScorePrediction(gameData, homeWinProb);
    if (enhanced) {
      console.log(`[PredictionEngine] Using comprehensive score prediction with caps for ${gameData.homeTeam} vs ${gameData.awayTeam}`);
      return { home: enhanced.home, away: enhanced.away };
    }
  } catch (error) {
    console.warn('[PredictionEngine] Comprehensive prediction failed, using fallback:', error);
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
      if (sport.includes(key)) return value;
    }

    return { home: 0, away: 0 };
  }
}

/**
 * Better error messages for early lines analysis
 */
export function getEarlyLinesErrorSuggestions(error: any, availableFiles?: string[]): {
  message: string;
  suggestions: string[];
} {
  const suggestions: string[] = [];

  if (error?.message?.includes('No early lines file found')) {
    suggestions.push('Run early predictions first to generate predictions-early-YYYY-MM-DD.json');
    suggestions.push('Check early offset setting (should be 2-7 days before game date)');
    suggestions.push('Verify early lines cron job is running successfully');
  }

  if (error?.message?.includes('No regular lines file found')) {
    suggestions.push('Run regular predictions to generate predictions-YYYY-MM-DD.json');
    suggestions.push('Check that today\'s date is correct in date selector');
  }

  if (availableFiles && availableFiles.length > 0) {
    suggestions.push(`Available files: ${availableFiles.join(', ')}`);
  }

  return {
    message: error?.message || 'Unknown error occurred',
    suggestions
  };
}

/**
 * Human-readable report formatting helpers
 */
export function formatReportData(data: any, reportType: string): string {
  switch (reportType) {
    case 'performance-by-sport':
      return formatPerformanceBySport(data);
    case 'value-bets-analysis':
      return formatValueBetsAnalysis(data);
    case 'confidence-vs-results':
      return formatConfidenceVsResults(data);
    case 'monthly-summary':
      return formatMonthlySummary(data);
    case 'streak-analysis':
      return formatStreakAnalysis(data);
    case 'roi-by-odds-range':
      return formatROIByOddsRange(data);
    default:
      return JSON.stringify(data, null, 2);
  }
}

function formatPerformanceBySport(data: any): string {
  let output = '📊 Performance by Sport\n\n';
  
  if (data.sports && Array.isArray(data.sports)) {
    data.sports.forEach((sport: any, index: number) => {
      output += `${index + 1}. ${sport.sport}\n`;
      output += `   Wins: ${sport.wins} | Losses: ${sport.losses} | Pushes: ${sport.pushes}\n`;
      output += `   Win Rate: ${sport.winRate}%\n`;
      output += `   Total Bets: ${sport.total}\n`;
      output += `   Profit: $${sport.profit || 0}\n\n`;
    });
  }

  if (data.summary) {
    output += '📈 Summary\n';
    output += `Total Sports: ${data.summary.totalSports}\n`;
    output += `Total Bets: ${data.summary.totalBets}\n`;
    output += `Total Profit: $${data.summary.totalProfit || 0}\n`;
  }

  return output;
}

function formatValueBetsAnalysis(data: any): string {
  let output = '💰 Value Bets Analysis\n\n';
  
  if (data.ranges && Array.isArray(data.ranges)) {
    data.ranges.forEach((range: any, index: number) => {
      output += `${index + 1}. ${range.range}\n`;
      output += `   Wins: ${range.wins} | Losses: ${range.losses}\n`;
      output += `   Win Rate: ${range.winRate}%\n`;
      output += `   Total Bets: ${range.total}\n`;
      output += `   Profit: $${range.profit || 0}\n\n`;
    });
  }

  if (data.summary) {
    output += '🎯 Best Performing Range\n';
    output += `${data.summary.bestPerformingRange}\n\n`;
  }

  return output;
}

function formatConfidenceVsResults(data: any): string {
  let output = '🎯 Confidence vs Results\n\n';
  
  if (data.ranges && Array.isArray(data.ranges)) {
    data.ranges.forEach((range: any, index: number) => {
      output += `${index + 1}. ${range.range}% Confidence\n`;
      output += `   Wins: ${range.wins} | Losses: ${range.losses}\n`;
      output += `   Win Rate: ${range.winRate}%\n`;
      output += `   Total Bets: ${range.total}\n\n`;
    });
  }

  if (data.insight) {
    output += '🔍 Key Insight\n';
    output += `${data.insight.range}% confidence range performs best\n\n`;
  }

  return output;
}

function formatMonthlySummary(data: any): string {
  let output = '📅 Monthly Summary\n\n';
  
  if (data.months && Array.isArray(data.months)) {
    data.months.forEach((month: any, index: number) => {
      output += `${index + 1}. ${month.month}\n`;
      output += `   Wins: ${month.wins} | Losses: ${month.losses}\n`;
      output += `   Win Rate: ${month.winRate}%\n`;
      output += `   Profit: $${month.profit || 0}\n`;
      output += `   Avg Profit/Bet: $${month.avgProfitPerBet || 0}\n\n`;
    });
  }

  if (data.summary) {
    output += '📈 Summary\n';
    output += `Total Months: ${data.summary.totalMonths}\n`;
    output += `Best Month: ${data.summary.bestMonth}\n`;
  }

  return output;
}

function formatStreakAnalysis(data: any): string {
  let output = '🔥 Streak Analysis\n\n';
  
  if (data.currentStreak !== undefined) {
    output += `Current Streak: ${data.currentStreak} ${data.currentStreakType || ''}\n`;
  }
  
  if (data.maxWinStreak !== undefined) {
    output += `Longest Win Streak: ${data.maxWinStreak}\n`;
  }
  
  if (data.maxLossStreak !== undefined) {
    output += `Longest Loss Streak: ${data.maxLossStreak}\n`;
  }

  if (data.last5) {
    output += 'Last 5 Games:\n';
    output += `   Wins: ${data.last5.wins} | Losses: ${data.last5.losses}\n`;
    output += `   Profit: $${data.last5.profit || 0}\n\n`;
  }

  if (data.last10) {
    output += 'Last 10 Games:\n';
    output += `   Wins: ${data.last10.wins} | Losses: ${data.last10.losses}\n`;
    output += `   Profit: $${data.last10.profit || 0}\n\n`;
  }

  return output;
}

function formatROIByOddsRange(data: any): string {
  let output = '📈 ROI by Odds Range\n\n';
  
  if (data.ranges && Array.isArray(data.ranges)) {
    data.ranges.forEach((range: any, index: number) => {
      output += `${index + 1}. ${range.range}\n`;
      output += `   Wins: ${range.wins} | Losses: ${range.losses}\n`;
      output += `   Win Rate: ${range.winRate}%\n`;
      output += `   Total Bets: ${range.total}\n`;
      output += `   ROI: ${range.roi}%\n\n`;
    });
  }

  if (data.bestRange) {
    output += '🎯 Best Range\n';
    output += `${data.bestRange}\n\n`;
  }

  return output;
}
