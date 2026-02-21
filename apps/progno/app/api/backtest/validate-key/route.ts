/**
 * Backtesting API Key Validation Endpoint
 * 
 * POST /api/backtest/validate-key
 * 
 * Validates an API key and returns access information.
 * Used by external users to check their key status.
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateBacktestApiKey, getKeyUsageStats } from '@/app/lib/backtest-api-keys';

export async function POST(request: NextRequest) {
  try {
    // Get API key from Authorization header or request body
    const authHeader = request.headers.get('Authorization');
    let apiKey: string | null = null;
    
    if (authHeader) {
      // Support "Bearer KEY" or just "KEY"
      apiKey = authHeader.replace(/^Bearer\s+/i, '').trim();
    } else {
      // Also allow key in request body for convenience
      const body = await request.json().catch(() => ({}));
      apiKey = body.apiKey || null;
    }
    
    if (!apiKey) {
      return NextResponse.json(
        {
          valid: false,
          error: 'API key required',
          message: 'Provide key in Authorization header or request body'
        },
        { status: 401 }
      );
    }
    
    // Validate the key
    const validation = await validateBacktestApiKey(apiKey);
    
    if (!validation.valid) {
      return NextResponse.json(
        {
          valid: false,
          error: validation.message,
          tier: validation.tier,
          userEmail: validation.userEmail
        },
        { status: validation.message.includes('expired') ? 403 : 401 }
      );
    }
    
    // Get additional usage stats
    const usageStats = await getKeyUsageStats(apiKey);
    
    // Return success with key details
    return NextResponse.json({
      valid: true,
      tier: validation.tier,
      userEmail: validation.userEmail,
      allowedSports: validation.allowedSports,
      historicalYears: validation.historicalYears,
      requestsRemaining: validation.requestsRemaining,
      usage: usageStats ? {
        dailyUsed: usageStats.dailyUsed,
        dailyLimit: usageStats.dailyLimit,
        totalUsed: usageStats.totalUsed,
        remainingToday: usageStats.remainingToday
      } : null,
      endpoints: [
        `/v1/backtest/{sport}/{year}`,
        `/v1/backtest/{sport}/{year}/results`,
        `/v1/backtest/{sport}/{year}/stats`
      ]
    });
    
  } catch (error) {
    console.error('[BacktestValidateKey] Error:', error);
    return NextResponse.json(
      {
        valid: false,
        error: 'Validation error',
        message: 'Internal server error'
      },
      { status: 500 }
    );
  }
}

/**
 * GET handler for simple key status check
 * 
 * GET /api/backtest/validate-key?key=progno_live_xxx
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const apiKey = searchParams.get('key');
    
    if (!apiKey) {
      return NextResponse.json(
        {
          valid: false,
          error: 'API key required',
          message: 'Provide key as query parameter: ?key=progno_live_xxx'
        },
        { status: 401 }
      );
    }
    
    // Validate the key
    const validation = await validateBacktestApiKey(apiKey);
    
    if (!validation.valid) {
      return NextResponse.json(
        {
          valid: false,
          error: validation.message
        },
        { status: validation.message.includes('expired') ? 403 : 401 }
      );
    }
    
    // Get usage stats
    const usageStats = await getKeyUsageStats(apiKey);
    
    return NextResponse.json({
      valid: true,
      tier: validation.tier,
      allowedSports: validation.allowedSports,
      historicalYears: validation.historicalYears,
      requestsRemaining: validation.requestsRemaining,
      usage: usageStats ? {
        dailyUsed: usageStats.dailyUsed,
        dailyLimit: usageStats.dailyLimit,
        remainingToday: usageStats.remainingToday
      } : null
    });
    
  } catch (error) {
    console.error('[BacktestValidateKey] Error:', error);
    return NextResponse.json(
      {
        valid: false,
        error: 'Validation error'
      },
      { status: 500 }
    );
  }
}
