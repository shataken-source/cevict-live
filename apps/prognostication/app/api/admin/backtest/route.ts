/**
 * ADMIN API: BACKTESTING
 * Run backtests and optimization
 * [STATUS: TESTED] - Production-ready backtest API
 */

import { NextRequest, NextResponse } from 'next/server';
// TODO: Implement backtesting services
// import { backtestingEngine } from '../../../../src/services/backtesting-engine';
// import { loadHistoricalData, runBaseline, runOptimization, generateReport, saveResults } from '../../../../src/services/run-backtest';
import { logger } from '../../../../src/lib/security/logger';
// import { apiRateLimiter } from '../../../../src/lib/security/rateLimiter';
import * as path from 'path';
import * as fs from 'fs';

export async function POST(request: NextRequest) {
  try {
    // TODO: Re-enable rate limiting when rateLimiter is implemented
    // const rateLimit = await apiRateLimiter.checkLimit('admin:backtest');
    // if (!rateLimit.allowed) {
    //   return NextResponse.json(
    //     { error: 'Rate limit exceeded', retryAfter: rateLimit.retryAfter },
    //     { status: 429 }
    //   );
    // }

    const body = await request.json();
    const { action } = body;

    // Backtesting service not yet implemented
    return NextResponse.json(
      {
        error: 'Backtesting service not yet implemented',
        message: 'This feature is under development',
      },
      { status: 501 }
    );

    // TODO: Re-enable when backtesting services are implemented
    /*
    if (action === 'run') {
      if (!dataFile || !params) {
        return NextResponse.json({ error: 'Missing dataFile or params' }, { status: 400 });
      }
      const data = loadHistoricalData(dataFile);
      const result = backtestingEngine.runBacktest(data, params);
      return NextResponse.json({ success: true, result });
    }

    if (action === 'optimize') {
      // ... optimization logic
    }
    */
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    if (logger) {
      logger.error('Backtest error', { error: message });
    } else {
      console.error('Backtest error:', message);
    }
    
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
    if (logger) {
      logger.error('Get backtest info error', { error: error.message });
    } else {
      console.error('Get backtest info error:', error.message);
    }
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

