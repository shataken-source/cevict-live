/**
 * ADMIN API: BACKTESTING
 * Run backtests and optimization
 * [STATUS: TESTED] - Production-ready backtest API
 */

import { NextRequest, NextResponse } from 'next/server';
import { backtestingEngine } from '../../../../src/services/backtesting-engine';
import { loadHistoricalData, runBaseline, runOptimization, generateReport, saveResults } from '../../../../src/services/run-backtest';
import { logger } from '../../../../src/lib/security/logger';
import { apiRateLimiter } from '../../../../src/lib/security/rateLimiter';
import * as path from 'path';
import * as fs from 'fs';

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimit = await apiRateLimiter.checkLimit('admin:backtest');
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded', retryAfter: rateLimit.retryAfter },
        { status: 429 }
      );
    }

    const body = await request.json();
    const { action, dataFile, params } = body;

    if (action === 'run') {
      // Run single backtest
      if (!dataFile || !params) {
        return NextResponse.json({ error: 'Missing dataFile or params' }, { status: 400 });
      }

      const data = loadHistoricalData(dataFile);
      const result = backtestingEngine.runBacktest(data, params);

      return NextResponse.json({
        success: true,
        result,
      });
    }

    if (action === 'optimize') {
      // Run optimization
      if (!dataFile) {
        return NextResponse.json({ error: 'Missing dataFile' }, { status: 400 });
      }

      const data = loadHistoricalData(dataFile);

      // Baseline params
      const baselineParams = params || {
        maxDailyLoss: 500,
        maxDailyLossPercent: 5,
        maxTradesPerDay: 50,
        takeProfitPercent: 15,
        stopLossPercent: 10,
        maxPositionSize: 1000,
        minConfidence: 75,
        sentimentGapThreshold: 50,
      };

      // Run baseline
      const baselineResult = runBaseline(data, baselineParams);

      // Run optimization (with progress callback)
      const optimization = await runOptimization(data, (progress, bestScore) => {
        logger.info(`Optimization progress: ${progress.toFixed(1)}% | Best score: ${bestScore.toFixed(4)}`);
      });

      // Generate report
      const report = generateReport(
        { params: baselineParams, result: baselineResult },
        { params: optimization.bestParams, result: optimization.bestResult },
        optimization.allResults
      );

      // Save results
      const outputDir = path.join(process.cwd(), 'backtest-results');
      saveResults(report, outputDir);

      return NextResponse.json({
        success: true,
        report,
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    logger.error('Backtest error', { error: message });
    
    return NextResponse.json(
      {
        error: 'Internal server error',
        ...(isDevelopment && { details: message }),
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // Return available data files or last results
    const dataDir = path.join(process.cwd(), 'data');
    const resultsDir = path.join(process.cwd(), 'backtest-results');

    const dataFiles: string[] = [];
    if (fs.existsSync(dataDir)) {
      const files = fs.readdirSync(dataDir);
      dataFiles.push(...files.filter((f) => f.endsWith('.csv')));
    }

    let lastReport = null;
    const reportPath = path.join(resultsDir, 'optimization-report.json');
    if (fs.existsSync(reportPath)) {
      lastReport = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));
    }

    return NextResponse.json({
      dataFiles,
      lastReport,
    });
  } catch (error: any) {
    logger.error('Get backtest info error', { error: error.message });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

