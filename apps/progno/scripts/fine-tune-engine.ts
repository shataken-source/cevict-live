/**
 * Fine-Tune Progno Probability Engine
 * Uses 2024 game results to calibrate prediction accuracy
 */

import fs from 'fs';
import path from 'path';
import { Game, predictGame } from '../app/weekly-analyzer';

interface GameResult {
  id: string;
  sport: string;
  homeTeam: string;
  awayTeam: string;
  date: string;
  homeScore: number;
  awayScore: number;
  spread?: number;
  total?: number;
  homeCovered?: boolean;
  overHit?: boolean;
  winner: string;
}

interface CalibrationResult {
  sport: string;
  totalGames: number;
  accuracy: {
    winner: number;
    spread: number;
    total: number;
  };
  confidenceBins: {
    [bin: string]: {
      count: number;
      correct: number;
      accuracy: number;
    };
  };
  recommendedCalibration: {
    spreadBias: number;
    totalBias: number;
    confidenceBias: number;
  };
}

function loadResults(): Record<string, GameResult[]> {
  const prognoDir = path.join(process.cwd(), '.progno');
  const file = path.join(prognoDir, '2024-results-all-sports.json');
  
  if (!fs.existsSync(file)) {
    throw new Error(`Results file not found: ${file}. Run fetch-2024-results.ts first.`);
  }

  const data = fs.readFileSync(file, 'utf8');
  return JSON.parse(data);
}

function resultToGame(result: GameResult): Game {
  return {
    id: result.id,
    homeTeam: result.homeTeam,
    awayTeam: result.awayTeam,
    sport: result.sport,
    date: new Date(result.date),
    odds: {
      home: 0, // Not available in results
      away: 0,
      spread: result.spread,
      total: result.total
    },
    venue: 'TBD'
  };
}

async function analyzeSport(sport: string, results: GameResult[]): Promise<CalibrationResult> {
  console.log(`\nAnalyzing ${sport}...`);
  
  let winnerCorrect = 0;
  let spreadCorrect = 0;
  let totalCorrect = 0;
  let spreadCount = 0;
  let totalCount = 0;
  
  const confidenceBins: Record<string, { count: number; correct: number }> = {
    '50-55': { count: 0, correct: 0 },
    '55-60': { count: 0, correct: 0 },
    '60-65': { count: 0, correct: 0 },
    '65-70': { count: 0, correct: 0 },
    '70-75': { count: 0, correct: 0 },
    '75-80': { count: 0, correct: 0 },
    '80-85': { count: 0, correct: 0 },
    '85-90': { count: 0, correct: 0 },
    '90-95': { count: 0, correct: 0 },
    '95-100': { count: 0, correct: 0 }
  };

  const spreadErrors: number[] = [];
  const totalErrors: number[] = [];

  for (const result of results) {
    const game = resultToGame(result);
    const prediction = await predictGame(game);

    // Check winner prediction
    if (prediction.predictedWinner === result.winner) {
      winnerCorrect++;
    }

    // Check spread prediction
    if (result.spread !== undefined && result.homeCovered !== undefined) {
      spreadCount++;
      const predictedCover = prediction.predictedScore.home + (result.spread || 0) > prediction.predictedScore.away;
      if (predictedCover === result.homeCovered) {
        spreadCorrect++;
      }
      // Calculate spread error
      const predictedMargin = prediction.predictedScore.home - prediction.predictedScore.away;
      const actualMargin = result.homeScore - result.awayScore;
      spreadErrors.push(predictedMargin - actualMargin);
    }

    // Check total prediction
    if (result.total !== undefined && result.overHit !== undefined) {
      totalCount++;
      const predictedTotal = prediction.predictedScore.home + prediction.predictedScore.away;
      const predictedOver = predictedTotal > result.total;
      if (predictedOver === result.overHit) {
        totalCorrect++;
      }
      // Calculate total error
      const actualTotal = result.homeScore + result.awayScore;
      totalErrors.push(predictedTotal - actualTotal);
    }

    // Bin by confidence
    const confidence = Math.round(prediction.confidence * 100);
    let bin = '';
    if (confidence < 55) bin = '50-55';
    else if (confidence < 60) bin = '55-60';
    else if (confidence < 65) bin = '60-65';
    else if (confidence < 70) bin = '65-70';
    else if (confidence < 75) bin = '70-75';
    else if (confidence < 80) bin = '75-80';
    else if (confidence < 85) bin = '80-85';
    else if (confidence < 90) bin = '85-90';
    else if (confidence < 95) bin = '90-95';
    else bin = '95-100';

    if (confidenceBins[bin]) {
      confidenceBins[bin].count++;
      if (prediction.predictedWinner === result.winner) {
        confidenceBins[bin].correct++;
      }
    }
  }

  // Calculate recommended calibration
  const avgSpreadError = spreadErrors.length > 0
    ? spreadErrors.reduce((sum, e) => sum + e, 0) / spreadErrors.length
    : 0;
  const avgTotalError = totalErrors.length > 0
    ? totalErrors.reduce((sum, e) => sum + e, 0) / totalErrors.length
    : 0;

  // Calculate confidence bias (if model is overconfident/underconfident)
  let confidenceBias = 0;
  for (const [bin, data] of Object.entries(confidenceBins)) {
    if (data.count > 10) {
      const expectedAccuracy = (parseInt(bin.split('-')[0]) + parseInt(bin.split('-')[1])) / 2 / 100;
      const actualAccuracy = data.correct / data.count;
      const bias = actualAccuracy - expectedAccuracy;
      confidenceBias += bias * (data.count / results.length);
    }
  }

  return {
    sport,
    totalGames: results.length,
    accuracy: {
      winner: results.length > 0 ? (winnerCorrect / results.length) * 100 : 0,
      spread: spreadCount > 0 ? (spreadCorrect / spreadCount) * 100 : 0,
      total: totalCount > 0 ? (totalCorrect / totalCount) * 100 : 0
    },
    confidenceBins: Object.fromEntries(
      Object.entries(confidenceBins).map(([bin, data]) => [
        bin,
        {
          count: data.count,
          correct: data.correct,
          accuracy: data.count > 0 ? (data.correct / data.count) * 100 : 0
        }
      ])
    ),
    recommendedCalibration: {
      spreadBias: -avgSpreadError, // Negative because if we predict too high, bias should be negative
      totalBias: -avgTotalError,
      confidenceBias: -confidenceBias * 0.5 // Dampen the adjustment
    }
  };
}

async function main() {
  console.log('=== Fine-Tuning Progno Probability Engine ===\n');
  console.log('Loading 2024 game results...');

  const allResults = loadResults();
  const calibrations: CalibrationResult[] = [];

  for (const [sport, results] of Object.entries(allResults)) {
    if (results.length === 0) {
      console.log(`Skipping ${sport} - no results`);
      continue;
    }

    const calibration = await analyzeSport(sport, results);
    calibrations.push(calibration);

    console.log(`\n${sport} Results:`);
    console.log(`  Total Games: ${calibration.totalGames}`);
    console.log(`  Winner Accuracy: ${calibration.accuracy.winner.toFixed(2)}%`);
    console.log(`  Spread Accuracy: ${calibration.accuracy.spread.toFixed(2)}%`);
    console.log(`  Total Accuracy: ${calibration.accuracy.total.toFixed(2)}%`);
    console.log(`\n  Recommended Calibration:`);
    console.log(`    Spread Bias: ${calibration.recommendedCalibration.spreadBias.toFixed(2)}`);
    console.log(`    Total Bias: ${calibration.recommendedCalibration.totalBias.toFixed(2)}`);
    console.log(`    Confidence Bias: ${calibration.recommendedCalibration.confidenceBias.toFixed(4)}`);
  }

  // Save calibrations
  const prognoDir = path.join(process.cwd(), '.progno');
  const calibrationFile = path.join(prognoDir, 'calibration-2024.json');
  fs.writeFileSync(calibrationFile, JSON.stringify(calibrations, null, 2), 'utf8');

  // Create combined calibration (average across sports)
  const combinedCalibration = {
    spreadBias: calibrations.reduce((sum, c) => sum + c.recommendedCalibration.spreadBias, 0) / calibrations.length,
    totalBias: calibrations.reduce((sum, c) => sum + c.recommendedCalibration.totalBias, 0) / calibrations.length,
    confidenceBias: calibrations.reduce((sum, c) => sum + c.recommendedCalibration.confidenceBias, 0) / calibrations.length
  };

  const combinedFile = path.join(prognoDir, 'calibration.json');
  fs.writeFileSync(combinedFile, JSON.stringify(combinedCalibration, null, 2), 'utf8');

  console.log(`\n✅ Calibrations saved:`);
  console.log(`   Per-sport: ${calibrationFile}`);
  console.log(`   Combined: ${combinedFile}`);
  console.log(`\n   Combined Calibration:`);
  console.log(`     Spread Bias: ${combinedCalibration.spreadBias.toFixed(2)}`);
  console.log(`     Total Bias: ${combinedCalibration.totalBias.toFixed(2)}`);
  console.log(`     Confidence Bias: ${combinedCalibration.confidenceBias.toFixed(4)}`);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

