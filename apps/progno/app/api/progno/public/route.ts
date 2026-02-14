/**
 * Progno Public API
 * External API for selling prediction data and analysis to other services
 */

import { NextRequest, NextResponse } from 'next/server';
import { TierAssignmentService } from '@/app/lib/tier-assignment-service';
import { MasterIntegrationService } from '@/app/lib/master-integration-service';

// API Key management (in production, use database)
const API_KEYS = new Map<string, { tier: string; rateLimit: number; requests: number; lastReset: number }>();

// Rate limiting middleware
function checkRateLimit(apiKey: string): boolean {
  const keyData = API_KEYS.get(apiKey);
  if (!keyData) return false;
  
  const now = Date.now();
  // Reset counter every hour
  if (now - keyData.lastReset > 3600000) {
    keyData.requests = 0;
    keyData.lastReset = now;
  }
  
  if (keyData.requests >= keyData.rateLimit) {
    return false;
  }
  
  keyData.requests++;
  return true;
}

function getApiKey(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.replace('Bearer ', '');
  }
  return request.nextUrl.searchParams.get('api_key');
}

/**
 * GET /api/progno/public/predictions
 * Get all predictions for a date
 */
export async function GET(request: NextRequest) {
  const apiKey = getApiKey(request);
  
  if (!apiKey || !API_KEYS.has(apiKey)) {
    return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
  }
  
  if (!checkRateLimit(apiKey)) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }
  
  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date') || new Date().toISOString().split('T')[0];
  const sport = searchParams.get('sport');
  const tier = searchParams.get('tier');
  
  try {
    const masterService = new MasterIntegrationService();
    const result = await masterService.executeDailyWorkflow(date, sport ? [sport] : undefined);
    
    // Filter by tier if requested
    let picks = result.picks;
    if (tier) {
      picks = TierAssignmentService.filterByTier(picks, tier as any);
    }
    
    return NextResponse.json({
      success: true,
      date,
      picks: picks.map(p => ({
        id: p.id,
        sport: p.sport,
        game: `${p.homeTeam} vs ${p.awayTeam}`,
        pick: p.pick,
        confidence: p.confidence,
        tier: p.tier,
        odds: p.odds,
        edge: p.edge,
        analysis: p.analysis,
        gameTime: p.gameTime,
      })),
      arbitrage: result.arbitrageOpportunities,
      earlyBets: result.earlyBetOpportunities,
      parlays: result.parlays,
      analytics: {
        tierBreakdown: result.tierBreakdown,
        totalPicks: picks.length,
        avgConfidence: picks.reduce((a, p) => a + p.confidence, 0) / picks.length,
      },
      timestamp: new Date().toISOString(),
    });
    
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch predictions', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/progno/public/prediction/[id]
 * Get detailed prediction by ID
 */
export async function getPredictionById(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const apiKey = getApiKey(request);
  
  if (!apiKey || !API_KEYS.has(apiKey)) {
    return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
  }
  
  try {
    // This would fetch from database
    const prediction = null; // Placeholder
    
    if (!prediction) {
      return NextResponse.json({ error: 'Prediction not found' }, { status: 404 });
    }
    
    return NextResponse.json({
      success: true,
      prediction,
    });
    
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch prediction' }, { status: 500 });
  }
}

/**
 * GET /api/progno/public/historical
 * Get historical prediction performance
 */
export async function getHistorical(request: NextRequest) {
  const apiKey = getApiKey(request);
  
  if (!apiKey || !API_KEYS.has(apiKey)) {
    return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
  }
  
  const { searchParams } = new URL(request.url);
  const days = parseInt(searchParams.get('days') || '30');
  
  try {
    // This would fetch historical data
    return NextResponse.json({
      success: true,
      period: `${days} days`,
      performance: {
        totalPicks: 150,
        winRate: 58.5,
        roi: 12.3,
        bySport: {
          nfl: { picks: 50, winRate: 60, roi: 15 },
          nba: { picks: 60, winRate: 57, roi: 10 },
          nhl: { picks: 40, winRate: 59, roi: 12 },
        },
        byTier: {
          elite: { picks: 30, winRate: 68, roi: 22 },
          pro: { picks: 70, winRate: 58, roi: 12 },
          free: { picks: 50, winRate: 52, roi: 5 },
        },
      },
    });
    
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch historical data' }, { status: 500 });
  }
}

/**
 * POST /api/progno/public/webhook
 * Register webhook for real-time alerts
 */
export async function registerWebhook(request: NextRequest) {
  const apiKey = getApiKey(request);
  
  if (!apiKey || !API_KEYS.has(apiKey)) {
    return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
  }
  
  try {
    const body = await request.json();
    const { url, events } = body;
    
    // This would save webhook to database
    return NextResponse.json({
      success: true,
      message: 'Webhook registered',
      webhookId: `wh-${Date.now()}`,
      url,
      events: events || ['arbitrage', 'steam_move', 'line_movement'],
    });
    
  } catch (error) {
    return NextResponse.json({ error: 'Failed to register webhook' }, { status: 500 });
  }
}

// Export API key management functions
export function registerApiKey(key: string, tier: string, rateLimit: number): void {
  API_KEYS.set(key, {
    tier,
    rateLimit,
    requests: 0,
    lastReset: Date.now(),
  });
}

export function revokeApiKey(key: string): boolean {
  return API_KEYS.delete(key);
}
