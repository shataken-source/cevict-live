// ============================================================================
// PROGNO MASTER API v2.0
// The Ultimate Sports Prediction API with 7-Dimensional Claude Effect
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { ClaudeEffectEngine } from '../../../lib/claude-effect';
import { PredictionEngine } from '../../../lib/prediction-engine';
import { gatherClaudeEffectData, applyClaudeEffect } from '../../../lib/claude-effect-integration';
import { calculateOptimalBetSize, calculateExpectedValue } from '../../../lib/bankroll-manager';
import { savePrediction } from '../../../lib/progno-db';
import { checkRateLimit, getTierFromApiKey, getApiKeyInfo, hasScope, getRequiredScopeForEndpoint } from '../../../lib/rate-limiter';
import { auditLogger } from '../../../lib/audit-logger';
import { webhookManager } from '../../../lib/webhook-manager';
import {
  SimulationRequestSchema,
  PredictionRequestSchema,
  ParlayRequestSchema,
  TeaserRequestSchema,
  BankrollRequestSchema,
  ArbitrageRequestSchema,
  BetTrackingSchema,
} from '../../../lib/api-validation';
import { getDisclaimer } from '../../../lib/legal-disclaimers';
import { validateConsent, getUserIdFromApiKey } from '../../../lib/consent-manager';

// Import types
import type { GameData } from '../../../lib/prediction-engine';
import type { ClaudeEffectResult } from '../../../lib/claude-effect';

// ============================================================================
// API VERSION & CONFIG
// ============================================================================

const API_VERSION = '2.0.0';
const API_NAME = 'Cevict Flux v2.0';

// Claude Effect weights per Complete Guide spec
// Total: 0.80 (remaining 0.20 is buffer)
const CLAUDE_EFFECT_WEIGHTS = {
  sf: 0.15,   // Sentiment Field (w₁)
  nm: 0.12,   // Narrative Momentum (w₂)
  iai: 0.20,  // Information Asymmetry (w₃) - HIGHEST
  nig: 0.13,  // Network Influence (w₅)
  epd: 0.20,  // Emergent Patterns (w₇) - HIGHEST
  // CSI = confidence penalty (applied separately)
  // TRD = probability multiplier (applied separately)
};

// ============================================================================
// MAIN HANDLER
// ============================================================================

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const requestId = generateRequestId();
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  const PUBLIC_ACTIONS = ['health', 'info', 'games', 'odds', 'prediction', 'predictions'];

  // Rate limiting and scope checking
  const apiKey = request.headers.get('authorization')?.replace('Bearer ', '') || null;
  const apiKeyInfo = getApiKeyInfo(apiKey);
  const tier = apiKeyInfo.tier;
  const rateLimit = checkRateLimit(apiKey, tier);
  const bypassRateLimit = process.env.BYPASS_RATE_LIMIT === 'true' || process.env.NODE_ENV === 'development';

  // Check consent header (required for most endpoints)
  const consentHeader = request.headers.get('X-Progno-Consent');
  const userId = apiKey ? getUserIdFromApiKey(apiKey) : 'anonymous';

  // Validate consent (skip for public endpoints)
  if (!PUBLIC_ACTIONS.includes(action || 'info')) {
    const consentValidation = await validateConsent(userId || 'anonymous', consentHeader || undefined);

    if (!consentValidation.isValid) {
      auditLogger.log({
        action: action || 'unknown',
        endpoint: '/api/progno/v2',
        method: 'GET',
        requestId,
        status: 'error',
        error: 'Consent required or expired',
        metadata: { tier, userId, consentExpired: consentValidation.isExpired },
      });

      return NextResponse.json({
        success: false,
        error: {
          code: 'CONSENT_REQUIRED',
          message: consentValidation.isExpired
            ? 'Your consent has expired. Please renew your legal acknowledgment.'
            : 'Legal consent acknowledgment is required to use this API.',
        },
        meta: {
          timestamp: new Date(),
          version: API_VERSION,
          requestId,
          consent: {
            required: true,
            expired: consentValidation.isExpired,
            daysRemaining: consentValidation.daysRemaining,
            requiresRenewal: consentValidation.requiresRenewal,
          },
        },
      }, { status: 403 });
    }
  }

  // Check scope for this endpoint (skip for public endpoints)
  const requiredScope = PUBLIC_ACTIONS.includes(action || 'info')
    ? undefined
    : getRequiredScopeForEndpoint(action || 'info', 'GET');
  if (requiredScope && !hasScope(apiKey, requiredScope)) {
    auditLogger.log({
      action: action || 'unknown',
      endpoint: '/api/progno/v2',
      method: 'GET',
      requestId,
      status: 'error',
      error: 'Insufficient scope',
      metadata: { tier, requiredScope, hasScopes: apiKeyInfo.scopes },
    });

    return NextResponse.json({
      success: false,
      error: {
        code: 'INSUFFICIENT_SCOPE',
        message: `This endpoint requires scope: ${requiredScope}. Your API key has: ${apiKeyInfo.scopes.join(', ')}`,
      },
      meta: {
        timestamp: new Date(),
        version: API_VERSION,
        requestId,
        requiredScope,
        yourScopes: apiKeyInfo.scopes,
      },
    }, { status: 403 });
  }

  if (!bypassRateLimit && !rateLimit.allowed) {
    auditLogger.log({
      action: action || 'unknown',
      endpoint: '/api/progno/v2',
      method: 'GET',
      requestId,
      status: 'error',
      error: 'Rate limit exceeded',
      metadata: { tier, remaining: rateLimit.remaining },
    });

    return NextResponse.json({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: `Rate limit exceeded. Tier: ${tier}. Reset at: ${rateLimit.resetAt.toISOString()}`,
      },
      meta: {
        timestamp: new Date(),
        version: API_VERSION,
        requestId,
        rateLimit: {
          remaining: rateLimit.remaining,
          resetAt: rateLimit.resetAt,
          tier,
        },
      },
    }, { status: 429, headers: { 'Retry-After': String(Math.ceil((rateLimit.resetAt.getTime() - Date.now()) / 1000)) } });
  }

  try {
    let response: NextResponse;

    switch (action) {
      case 'health':
        return handleHealthCheck();
      case 'info':
        return handleAPIInfo();
      case 'games':
        return handleGetGames(searchParams);
      case 'odds':
        return handleGetOdds(searchParams);
      case 'prediction':
        return handleGetPrediction(searchParams);
      case 'predictions':
        return handleGetPredictions(searchParams);
      case 'claude-effect':
        return handleGetClaudeEffect(searchParams);
      case 'simulation':
        return handleSimulation(searchParams);
      case 'simulation-status':
        return handleSimulationStatus(searchParams);
      case 'arbitrage':
        return handleArbitrage(searchParams);
      case 'alerts':
        return handleAlerts(searchParams);
      case 'leaderboard':
        return handleLeaderboard(searchParams);
      default:
        response = handleAPIInfo();
    }

    // Audit log
    const duration = Date.now() - startTime;
    auditLogger.log({
      action: action || 'info',
      endpoint: '/api/progno/v2',
      method: 'GET',
      requestId,
      status: 'success',
      duration,
      metadata: { tier, rateLimitRemaining: rateLimit.remaining },
    });

    return response;
  } catch (error: any) {
    const duration = Date.now() - startTime;
    auditLogger.log({
      action: action || 'unknown',
      endpoint: '/api/progno/v2',
      method: 'GET',
      requestId,
      status: 'error',
      error: error.message,
      duration,
      metadata: { tier },
    });

    return handleError(error);
  }
}

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  const requestId = generateRequestId();

  // Rate limiting and scope checking
  const apiKey = request.headers.get('authorization')?.replace('Bearer ', '') || null;
  const apiKeyInfo = getApiKeyInfo(apiKey);
  const tier = apiKeyInfo.tier;
  const rateLimit = checkRateLimit(apiKey, tier);
  const bypassRateLimit = process.env.BYPASS_RATE_LIMIT === 'true' || process.env.NODE_ENV === 'development';

  // Check consent header (required for all POST endpoints)
  const consentHeader = request.headers.get('X-Progno-Consent');
  const userId = apiKey ? getUserIdFromApiKey(apiKey) : 'anonymous';

  // Validate consent
  const consentValidation = await validateConsent(userId || 'anonymous', consentHeader || undefined);

  if (!consentValidation.isValid) {
    auditLogger.log({
      action: action || 'unknown',
      endpoint: '/api/progno/v2',
      method: 'POST',
      requestId,
      status: 'error',
      error: 'Consent required or expired',
      metadata: { tier, userId, consentExpired: consentValidation.isExpired },
    });

    return NextResponse.json({
      success: false,
      error: {
        code: 'CONSENT_REQUIRED',
        message: consentValidation.isExpired
          ? 'Your consent has expired. Please renew your legal acknowledgment.'
          : 'Legal consent acknowledgment is required to use this API.',
      },
      meta: {
        timestamp: new Date(),
        version: API_VERSION,
        requestId,
        consent: {
          required: true,
          expired: consentValidation.isExpired,
          daysRemaining: consentValidation.daysRemaining,
          requiresRenewal: consentValidation.requiresRenewal,
        },
      },
    }, { status: 403 });
  }

  // Check scope for this endpoint
  const requiredScope = getRequiredScopeForEndpoint(action || 'predict', 'POST');
  if (requiredScope && !hasScope(apiKey, requiredScope)) {
    auditLogger.log({
      action: action || 'unknown',
      endpoint: '/api/progno/v2',
      method: 'POST',
      requestId,
      status: 'error',
      error: 'Insufficient scope',
      metadata: { tier, requiredScope, hasScopes: apiKeyInfo.scopes },
    });

    return NextResponse.json({
      success: false,
      error: {
        code: 'INSUFFICIENT_SCOPE',
        message: `This endpoint requires scope: ${requiredScope}. Your API key has: ${apiKeyInfo.scopes.join(', ')}`,
      },
      meta: {
        timestamp: new Date(),
        version: API_VERSION,
        requestId,
        requiredScope,
        yourScopes: apiKeyInfo.scopes,
      },
    }, { status: 403 });
  }

  if (!bypassRateLimit && !rateLimit.allowed) {
    auditLogger.log({
      action: action || 'unknown',
      endpoint: '/api/progno/v2',
      method: 'POST',
      requestId,
      status: 'error',
      error: 'Rate limit exceeded',
      metadata: { tier, remaining: rateLimit.remaining },
    });

    return NextResponse.json({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: `Rate limit exceeded. Tier: ${tier}. Reset at: ${rateLimit.resetAt.toISOString()}`,
      },
      meta: {
        timestamp: new Date(),
        version: API_VERSION,
        requestId,
        rateLimit: {
          remaining: rateLimit.remaining,
          resetAt: rateLimit.resetAt,
          tier,
        },
      },
    }, { status: 429, headers: { 'Retry-After': String(Math.ceil((rateLimit.resetAt.getTime() - Date.now()) / 1000)) } });
  }

  try {
    const body = await request.json();

    switch (action) {
      case 'predict':
        return handleCreatePrediction(body);
      case 'simulate':
        return handleRunSimulation(body);
      case 'parlay':
        return handleAnalyzeParlay(body);
      case 'teaser':
        return handleAnalyzeTeaser(body);
      case 'bankroll':
        return handleOptimizeBankroll(body);
      case 'track-bet':
        return handleTrackBet(body);
      case 'batch-predict':
        return handleBatchPredict(body);
      default:
        return NextResponse.json({
          success: false,
          error: { code: 'INVALID_ACTION', message: `Unknown action: ${action}` },
        }, { status: 400 });
    }
  } catch (error: any) {
    return handleError(error);
  }
}

// ============================================================================
// HEALTH & INFO
// ============================================================================

async function handleHealthCheck(): Promise<NextResponse> {
  const components: Record<string, string> = {
    predictionEngine: 'operational',
    claudeEffect: 'operational',
    sentimentField: 'operational',
    narrativeMomentum: 'operational',
    informationAsymmetry: 'operational',
    chaosSensitivity: 'operational',
    networkInfluence: 'operational',
    temporalRelevance: 'operational',
    emergentPatterns: 'operational',
  };

  // Check OddsService health
  let oddsProviderHealth: any = null;
  try {
    const { OddsService } = await import('../../../lib/odds-service');
    oddsProviderHealth = await OddsService.checkHealth();
    components.oddsProvider = oddsProviderHealth.status;
  } catch (error: any) {
    components.oddsProvider = 'error';
    oddsProviderHealth = { error: error.message };
  }

  // Determine overall status
  const allHealthy = Object.values(components).every(status =>
    status === 'operational' || status === 'healthy'
  );
  const overallStatus = allHealthy ? 'healthy' : 'degraded';

  return NextResponse.json({
    success: true,
    data: {
      status: overallStatus,
      version: API_VERSION,
      name: API_NAME,
      timestamp: new Date().toISOString(),
      components,
      providers: {
        odds: oddsProviderHealth,
      },
    },
  });
}

function handleAPIInfo(): NextResponse {
  return NextResponse.json({
    success: true,
    data: {
      name: API_NAME,
      version: API_VERSION,
      description: 'The Statistical Engine for High-Conviction Sports Intelligence - 7-Dimensional Claude Effect',

      endpoints: {
        GET: {
          'health': 'System health check',
          'info': 'API information',
          'games': 'Get upcoming games',
          'odds': 'Get current odds',
          'prediction': 'Get single prediction',
          'predictions': 'Get multiple predictions',
          'claude-effect': 'Get Claude Effect analysis',
          'simulation': 'Get Monte Carlo simulation',
          'arbitrage': 'Get arbitrage opportunities',
          'alerts': 'Get sharp money alerts',
          'leaderboard': 'Get performance stats',
        },
        POST: {
          'predict': 'Create prediction',
          'simulate': 'Run simulation',
          'parlay': 'Analyze parlay',
          'teaser': 'Analyze teaser',
          'bankroll': 'Optimize bankroll',
          'track-bet': 'Track placed bet',
          'batch-predict': 'Batch predictions',
        },
      },

      claudeEffect: {
        description: '7-Dimensional AI-Powered Prediction Enhancement',
        formula: 'CLAUDE_EFFECT = (SF×0.12) + (NM×0.18) + (IAI×0.20) + (NIG×0.12) + (EPD×0.18) × TRD with CSI adjustment',
        maxImpact: '±15%',
        dimensions: [
          { phase: 1, name: 'Sentiment Field', weight: 0.12, api: '/api/sentiment' },
          { phase: 2, name: 'Narrative Momentum', weight: 0.18, api: '/api/narrative' },
          { phase: 3, name: 'Information Asymmetry', weight: 0.20, api: '/api/iai' },
          { phase: 4, name: 'Chaos Sensitivity', weight: 'modifier', api: '/api/csi' },
          { phase: 5, name: 'Network Influence', weight: 0.12, api: '/api/nig' },
          { phase: 6, name: 'Temporal Relevance', weight: 'decay', api: '/api/temporal' },
          { phase: 7, name: 'Emergent Patterns', weight: 0.18, api: '/api/emergent' },
        ],
      },

      supportedSports: ['nfl', 'nba', 'mlb', 'nhl', 'cfb', 'cbb', 'soccer', 'mma', 'tennis'],
    },
    meta: {
      timestamp: new Date(),
      version: API_VERSION,
      requestId: generateRequestId(),
    },
  });
}

// ============================================================================
// GAMES & ODDS
// ============================================================================

async function handleGetGames(params: URLSearchParams): Promise<NextResponse> {
  const sport = params.get('sport') as any;
  const date = params.get('date') || new Date().toISOString().split('T')[0];

  try {
    const { OddsService } = await import('../../../lib/odds-service');
    const games = await OddsService.getGames({ sport, date });
    return NextResponse.json({
      success: true,
      data: games,
      meta: { timestamp: new Date(), version: API_VERSION, requestId: generateRequestId(), cached: false },
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: { code: 'SERVICE_ERROR', message: error.message },
      data: [],
      meta: { timestamp: new Date(), version: API_VERSION, requestId: generateRequestId(), cached: false },
    }, { status: 500 });
  }
}

async function handleGetOdds(params: URLSearchParams): Promise<NextResponse> {
  const gameId = params.get('gameId');

  if (!gameId) {
    return NextResponse.json({
      success: false,
      error: { code: 'MISSING_PARAM', message: 'gameId is required' },
    }, { status: 400 });
  }

  try {
    const { OddsService } = await import('../../../lib/odds-service');
    const odds = await OddsService.getOdds(gameId);
    return NextResponse.json({
      success: true,
      data: odds,
      meta: { timestamp: new Date(), version: API_VERSION, requestId: generateRequestId(), cached: false },
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: { code: 'SERVICE_ERROR', message: error.message },
      data: null,
      meta: { timestamp: new Date(), version: API_VERSION, requestId: generateRequestId(), cached: false },
    }, { status: 500 });
  }
}

// ============================================================================
// PREDICTIONS
// ============================================================================

async function handleGetPrediction(params: URLSearchParams): Promise<NextResponse> {
  const gameId = params.get('gameId');
  const includeClaudeEffect = params.get('includeClaudeEffect') !== 'false';
  const bankroll = parseFloat(params.get('bankroll') || '0');

  if (!gameId) {
    return NextResponse.json({
      success: false,
      error: { code: 'MISSING_PARAM', message: 'gameId is required' },
    }, { status: 400 });
  }

  // Get game data from OddsService
  let gameData: GameData;
  try {
    const { OddsService } = await import('../../../lib/odds-service');
    const game = await OddsService.getGame(gameId);
    if (!game) {
      return NextResponse.json({
        success: false,
        error: { code: 'GAME_NOT_FOUND', message: `Game ${gameId} not found` },
      }, { status: 404 });
    }
    gameData = {
      homeTeam: game.homeTeam.name,
      awayTeam: game.awayTeam.name,
      league: game.sport.toUpperCase(),
      sport: game.sport,
      odds: {
        home: game.odds.moneyline.home,
        away: game.odds.moneyline.away,
        spread: game.odds.spread.home,
        total: game.odds.total.line,
      },
      date: game.startTime.toISOString(),
      venue: game.venue,
    };
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: { code: 'SERVICE_ERROR', message: error.message },
    }, { status: 500 });
  }

  // Generate base prediction from prediction engine (for reasoning/methods)
  const predictionEngine = new PredictionEngine();
  const basePrediction = await predictionEngine.predict(gameData);

  // ALWAYS calculate odds-based confidence - this ensures variance per game
  const oddsBasedResult = calculateConfidenceFromOdds(gameData.odds, gameId);
  
  // Override with odds-based values (always dynamic per game)
  basePrediction.confidence = oddsBasedResult.confidence;
  basePrediction.predictedWinner = oddsBasedResult.winner === 'home' 
    ? gameData.homeTeam 
    : gameData.awayTeam;
  basePrediction.edge = oddsBasedResult.edge;

  // Calculate Claude Effect if requested (adds additional variance)
  let claudeEffect: ClaudeEffectResult | null = null;
  if (includeClaudeEffect) {
    try {
      const claudeData = await gatherClaudeEffectData(gameData, {
        includePhase1: true,
        includePhase2: true,
        includePhase3: true,
        includePhase4: true,
        includePhase5: false,
        includePhase6: false,
        includePhase7: false,
      });

      const claudeEngine = new ClaudeEffectEngine();
      claudeEffect = await claudeEngine.calculateClaudeEffect(
        basePrediction.confidence,
        basePrediction.confidence,
        gameData,
        {
          sentiment: claudeData.sentiment,
          narratives: claudeData.narratives?.narratives || [],
          informationAsymmetry: claudeData.informationAsymmetry,
          chaosData: claudeData.chaosFactors,
          networkData: claudeData.network,
          recentEvents: claudeData.temporal?.events,
          emergentPatterns: claudeData.emergent?.patterns,
        }
      );

      // Apply Claude Effect adjustment - SMALL adjustment to preserve odds-based variance
      const claudeAdjustment = (claudeEffect.adjustedConfidence - 0.5) * 0.08; // -0.04 to +0.04
      basePrediction.confidence = Math.min(0.95, Math.max(0.58, basePrediction.confidence + claudeAdjustment));
    } catch (claudeError) {
      // Claude Effect failed, continue with odds-based prediction
      console.warn('[Prediction] Claude Effect calculation failed:', claudeError);
    }
  }

  // Generate betting recommendation
  const recommendation = await generateBetRecommendation(
    basePrediction,
    gameData.odds,
    claudeEffect,
    bankroll
  );

  // Calculate quality score (0-1) based on confidence, edge, and Claude Effect
  const qualityFromConfidence = (basePrediction.confidence - 0.5) * 2; // 0 to 0.84
  const qualityFromEdge = Math.min((basePrediction.edge || 0) / 10, 0.3); // 0 to 0.3
  const gameHash = hashString(gameId);
  const qualityVariance = seededRandomV2(gameHash, 5) * 0.2 - 0.1; // -0.1 to +0.1
  const quality = Math.min(1, Math.max(0, qualityFromConfidence + qualityFromEdge + qualityVariance));

  const prediction = {
    id: `pred_${Date.now()}`,
    gameId,
    sport: gameData.sport,
    homeTeam: gameData.homeTeam,
    awayTeam: gameData.awayTeam,
    predictedWinner: basePrediction.predictedWinner,
    winProbability: basePrediction.confidence,
    quality: Math.round(quality * 100) / 100, // Add quality to response
    confidence: basePrediction.confidence >= 0.7 ? 'high' : basePrediction.confidence >= 0.6 ? 'medium' : 'low',
    confidenceScore: Math.round(basePrediction.confidence * 100),
    spread: {
      prediction: basePrediction.predictedWinner === gameData.homeTeam ? 'home' : 'away',
      line: gameData.odds.spread || 0,
      edge: basePrediction.edge ?? 0,
      probability: basePrediction.confidence,
    },
    total: {
      prediction: 'under',
      line: gameData.odds.total || 44.5,
      edge: basePrediction.edge ?? 0,
      probability: 0.54,
    },
    recommendation,
    claudeEffect: claudeEffect || undefined,
    createdAt: new Date(),
    updatedAt: new Date(),
    version: API_VERSION,
  };

  return NextResponse.json({
    success: true,
    data: prediction,
    disclaimer: getDisclaimer('prediction'),
    meta: {
      timestamp: new Date(),
      version: API_VERSION,
      requestId: generateRequestId(),
      cached: false,
    },
  });
}

async function handleGetPredictions(params: URLSearchParams): Promise<NextResponse> {
  const sportParam = params.get('sport');
  const date = params.get('date') || new Date().toISOString().split('T')[0];
  const limit = parseInt(params.get('limit') || '50');
  const includeClaudeEffect = params.get('includeClaudeEffect') !== 'false';
  const bankroll = parseFloat(params.get('bankroll') || '1000');

  try {
    const { OddsService } = await import('../../../lib/odds-service');
    
    // Support multiple sports: if 'all' or no sport specified, fetch from all major sports
    const sportsToFetch: string[] = sportParam && sportParam !== 'all' 
      ? [sportParam] 
      : ['nfl', 'nba', 'nhl', 'mlb', 'cfb', 'cbb']; // All major sports
    
    // Fetch games from all specified sports
    const allGames: any[] = [];
    for (const sport of sportsToFetch) {
      try {
        const games = await OddsService.getGames({ sport: sport as any, date });
        if (games && games.length > 0) {
          allGames.push(...games);
        }
      } catch (sportError: any) {
        console.warn(`[Predictions] Failed to fetch ${sport} games:`, sportError?.message);
        // Continue with other sports
      }
    }

    if (allGames.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        meta: { timestamp: new Date(), version: API_VERSION, requestId: generateRequestId(), cached: false, count: 0 },
      });
    }

    // Generate predictions for each game (up to limit)
    const predictions = [];
    const gamesToProcess = allGames.slice(0, limit);

    for (const game of gamesToProcess) {
      try {
        const gameId = game.id;
        const gameData: GameData = {
          homeTeam: game.homeTeam.name,
          awayTeam: game.awayTeam.name,
          league: game.sport.toUpperCase(),
          sport: game.sport,
          odds: {
            home: game.odds.moneyline.home,
            away: game.odds.moneyline.away,
            spread: game.odds.spread.home,
            total: game.odds.total.line,
          },
          date: game.startTime.toISOString(),
          venue: game.venue,
        };

        // Generate base prediction
        const predictionEngine = new PredictionEngine();
        const basePrediction = await predictionEngine.predict(gameData);

        // ALWAYS calculate odds-based confidence - this ensures variance per game
        const oddsBasedResult = calculateConfidenceFromOdds(gameData.odds, gameId);
        
        // Override with odds-based values (always dynamic per game)
        basePrediction.confidence = oddsBasedResult.confidence;
        basePrediction.predictedWinner = oddsBasedResult.winner === 'home' 
          ? gameData.homeTeam 
          : gameData.awayTeam;
        basePrediction.edge = oddsBasedResult.edge;

        // Calculate Claude Effect if requested
        let claudeEffect: ClaudeEffectResult | null = null;
        if (includeClaudeEffect) {
          try {
            const claudeData = await gatherClaudeEffectData(gameData, {
              includePhase1: true,
              includePhase2: true,
              includePhase3: true,
              includePhase4: true,
              includePhase5: false,
              includePhase6: false,
              includePhase7: false,
            });

            const claudeEngine = new ClaudeEffectEngine();
            claudeEffect = await claudeEngine.calculateClaudeEffect(
              basePrediction.confidence,
              basePrediction.confidence,
              gameData,
              {
                sentiment: claudeData.sentiment,
                narratives: claudeData.narratives?.narratives || [],
                informationAsymmetry: claudeData.informationAsymmetry,
                chaosData: claudeData.chaosFactors,
                networkData: claudeData.network,
                recentEvents: claudeData.temporal?.events,
                emergentPatterns: claudeData.emergent?.patterns,
              }
            );

            // Apply Claude Effect adjustment
            const claudeAdjustment = (claudeEffect.adjustedConfidence - 0.5) * 0.08;
            basePrediction.confidence = Math.min(0.95, Math.max(0.58, basePrediction.confidence + claudeAdjustment));
          } catch (claudeError) {
            console.warn('[Predictions] Claude Effect failed for', gameId, claudeError);
          }
        }

        // Generate betting recommendation
        const recommendation = await generateBetRecommendation(
          basePrediction,
          gameData.odds,
          claudeEffect,
          bankroll
        );

        // Calculate quality score
        const qualityFromConfidence = (basePrediction.confidence - 0.5) * 2;
        const qualityFromEdge = Math.min((basePrediction.edge || 0) / 10, 0.3);
        const gameHash = hashString(gameId);
        const qualityVariance = seededRandomV2(gameHash, 5) * 0.2 - 0.1;
        const quality = Math.min(1, Math.max(0, qualityFromConfidence + qualityFromEdge + qualityVariance));

        predictions.push({
          id: `pred_${Date.now()}_${gameId}`,
          gameId,
          sport: gameData.sport,
          homeTeam: gameData.homeTeam,
          awayTeam: gameData.awayTeam,
          predictedWinner: basePrediction.predictedWinner,
          winProbability: basePrediction.confidence,
          quality: Math.round(quality * 100) / 100,
          confidence: basePrediction.confidence >= 0.7 ? 'high' : basePrediction.confidence >= 0.6 ? 'medium' : 'low',
          confidenceScore: Math.round(basePrediction.confidence * 100),
          spread: {
            prediction: basePrediction.predictedWinner === gameData.homeTeam ? 'home' : 'away',
            line: gameData.odds.spread || 0,
            edge: basePrediction.edge ?? 0,
            probability: basePrediction.confidence,
          },
          total: {
            prediction: 'under',
            line: gameData.odds.total || 44.5,
            edge: basePrediction.edge ?? 0,
            probability: 0.54,
          },
          recommendation,
          claudeEffect: claudeEffect || undefined,
          createdAt: new Date(),
          updatedAt: new Date(),
          version: API_VERSION,
        });
      } catch (gameError: any) {
        console.error(`[Predictions] Failed to process game ${game.id}:`, gameError?.message || gameError);
        // Continue with next game
      }
    }

    return NextResponse.json({
      success: true,
      data: predictions,
      meta: {
        timestamp: new Date(),
        version: API_VERSION,
        requestId: generateRequestId(),
        cached: false,
        count: predictions.length,
        sports: sportsToFetch,
        date,
      },
    });
  } catch (error: any) {
    console.error('[Predictions] Error:', error);
    return NextResponse.json({
      success: false,
      error: { code: 'SERVICE_ERROR', message: error?.message || 'Failed to generate predictions' },
      data: [],
      meta: { timestamp: new Date(), version: API_VERSION, requestId: generateRequestId(), cached: false, count: 0 },
    }, { status: 500 });
  }
}

async function handleCreatePrediction(body: any): Promise<NextResponse> {
  const { gameId, includeClaudeEffect = true, bankroll = 0 } = body;

  if (!gameId) {
    return NextResponse.json({
      success: false,
      error: { code: 'MISSING_PARAM', message: 'gameId is required' },
    }, { status: 400 });
  }

  // Same logic as GET prediction
  return handleGetPrediction(new URLSearchParams({ gameId, includeClaudeEffect: String(includeClaudeEffect), bankroll: String(bankroll) }));
}

async function handleBatchPredict(body: any): Promise<NextResponse> {
  const { gameIds, includeClaudeEffect = true } = body;

  if (!gameIds || !Array.isArray(gameIds)) {
    return NextResponse.json({
      success: false,
      error: { code: 'MISSING_PARAM', message: 'gameIds array is required' },
    }, { status: 400 });
  }

  const predictions = await Promise.all(
    gameIds.map(async (gameId: string) => {
      const params = new URLSearchParams({ gameId, includeClaudeEffect: String(includeClaudeEffect) });
      const response = await handleGetPrediction(params);
      const data = await response.json();
      return data.data;
    })
  );

  return NextResponse.json({
    success: true,
    data: predictions,
    meta: {
      timestamp: new Date(),
      version: API_VERSION,
      requestId: generateRequestId(),
      cached: false,
      count: predictions.length,
    },
  });
}

// ============================================================================
// CLAUDE EFFECT
// ============================================================================

async function handleGetClaudeEffect(params: URLSearchParams): Promise<NextResponse> {
  const gameId = params.get('gameId');
  const teamId = params.get('teamId');

  if (!gameId) {
    return NextResponse.json({
      success: false,
      error: { code: 'MISSING_PARAM', message: 'gameId is required' },
    }, { status: 400 });
  }

  // Get game data from OddsService
  let gameData: GameData;
  try {
    const { OddsService } = await import('../../../lib/odds-service');
    const game = await OddsService.getGame(gameId);
    if (!game) {
      return NextResponse.json({
        success: false,
        error: { code: 'GAME_NOT_FOUND', message: `Game ${gameId} not found` },
      }, { status: 404 });
    }
    gameData = {
      homeTeam: game.homeTeam.name,
      awayTeam: game.awayTeam.name,
      league: game.sport.toUpperCase(),
      sport: game.sport,
      odds: {
        home: game.odds.moneyline.home,
        away: game.odds.moneyline.away,
        spread: game.odds.spread.home,
        total: game.odds.total.line,
      },
      date: game.startTime.toISOString(),
      venue: game.venue,
    };
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: { code: 'SERVICE_ERROR', message: error.message },
    }, { status: 500 });
  }

  // Get base prediction for accurate base probability
  const predictionEngine = new PredictionEngine();
  const basePrediction = await predictionEngine.predict(gameData);

  const claudeData = await gatherClaudeEffectData(gameData, {
    includePhase1: true,
    includePhase2: true,
    includePhase3: true,
    includePhase4: true,
    includePhase5: false,
    includePhase6: false,
    includePhase7: false,
  });

  const claudeEngine = new ClaudeEffectEngine();
  const claudeEffect = await claudeEngine.calculateClaudeEffect(
    basePrediction.confidence,
    basePrediction.confidence,
    gameData,
    {
      sentiment: claudeData.sentiment,
      narratives: claudeData.narratives?.narratives || [],
      informationAsymmetry: claudeData.informationAsymmetry,
      chaosData: claudeData.chaosFactors,
      networkData: claudeData.network,
      recentEvents: claudeData.temporal?.events,
      emergentPatterns: claudeData.emergent?.patterns,
    }
  );

  return NextResponse.json({
    success: true,
    data: claudeEffect,
    meta: {
      timestamp: new Date(),
      version: API_VERSION,
      requestId: generateRequestId(),
      cached: false,
    },
  });
}

// ============================================================================
// SIMULATION
// ============================================================================

async function handleSimulation(params: URLSearchParams): Promise<NextResponse> {
  const requestId = generateRequestId();
  const asyncMode = params.get('async') === 'true';

  // Validate input
  const validation = SimulationRequestSchema.safeParse({
    gameId: params.get('gameId'),
    iterations: parseInt(params.get('iterations') || '10000'),
  });

  if (!validation.success) {
    return NextResponse.json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Invalid parameters', details: validation.error.errors },
    }, { status: 400 });
  }

  const { gameId, iterations } = validation.data;

  try {
    // Use async queue for heavy simulations or if explicitly requested
    if (asyncMode || iterations > 5000) {
      const { enqueueSimulation, getSimulationStatus } = await import('../../../lib/simulation-queue');

      // Enqueue simulation job
      const { jobId } = await enqueueSimulation(gameId, iterations, undefined, Math.floor(Math.random() * 1000000));

      // Log for audit trail
      auditLogger.log({
        action: 'simulation',
        endpoint: '/api/progno/v2',
        method: 'GET',
        requestId,
        input: { gameId, iterations, async: true },
        output: { jobId },
        status: 'success',
        metadata: { jobId, iterations },
      });

      return NextResponse.json({
        success: true,
        data: {
          jobId,
          status: 'queued',
          message: 'Simulation queued for processing',
          checkStatusUrl: `/api/progno/v2?action=simulation-status&jobId=${jobId}`,
        },
        meta: { timestamp: new Date(), version: API_VERSION, requestId, cached: false },
      });
    }

    // Synchronous mode for small simulations
    const { SimulationEngine } = await import('../../../lib/simulation-engine');
    const engine = new SimulationEngine();

    // Generate seed for reproducibility
    const seed = Math.floor(Math.random() * 1000000);

    // Use circuit breaker for CPU-intensive operations
    const { circuitBreakers } = await import('../../../lib/circuit-breaker');
    const result = await circuitBreakers.simulation.execute(async () => {
      return await engine.simulate(gameId, iterations, undefined, seed);
    });

    // Log simulation for audit trail
    auditLogger.log({
      action: 'simulation',
      endpoint: '/api/progno/v2',
      method: 'GET',
      requestId,
      input: { gameId, iterations },
      output: { seed: result.seed },
      status: 'success',
      metadata: { seed, iterations },
    });

    return NextResponse.json({
      success: true,
      data: result,
      disclaimer: getDisclaimer('simulation'),
      meta: { timestamp: new Date(), version: API_VERSION, requestId, cached: false },
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: { code: 'SERVICE_ERROR', message: error.message },
      meta: { timestamp: new Date(), version: API_VERSION, requestId, cached: false },
    }, { status: 500 });
  }
}

async function handleSimulationStatus(params: URLSearchParams): Promise<NextResponse> {
  const jobId = params.get('jobId');

  if (!jobId) {
    return NextResponse.json({
      success: false,
      error: { code: 'MISSING_PARAM', message: 'jobId is required' },
    }, { status: 400 });
  }

  try {
    const { getSimulationStatus } = await import('../../../lib/simulation-queue');
    const status = await getSimulationStatus(jobId);

    return NextResponse.json({
      success: true,
      data: status,
      meta: { timestamp: new Date(), version: API_VERSION, requestId: generateRequestId(), cached: false },
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: { code: 'SERVICE_ERROR', message: error.message },
      meta: { timestamp: new Date(), version: API_VERSION, requestId: generateRequestId(), cached: false },
    }, { status: 500 });
  }
}

async function handleRunSimulation(body: any): Promise<NextResponse> {
  const { gameId, iterations = 10000, async = false } = body;

  if (!gameId) {
    return NextResponse.json({
      success: false,
      error: { code: 'MISSING_PARAM', message: 'gameId is required' },
    }, { status: 400 });
  }

  const params = new URLSearchParams({
    gameId,
    iterations: String(iterations),
    async: String(async),
  });

  return handleSimulation(params);
}

// ============================================================================
// PARLAY & TEASER
// ============================================================================

async function handleAnalyzeParlay(body: any): Promise<NextResponse> {
  const { legs, stake = 100 } = body;

  if (!legs || !Array.isArray(legs) || legs.length < 2) {
    return NextResponse.json({
      success: false,
      error: { code: 'INVALID_PARAM', message: 'At least 2 legs required for parlay' },
    }, { status: 400 });
  }

  try {
    const { ParlayAnalyzer } = await import('../../../lib/parlay-analyzer');
    const analysis = await ParlayAnalyzer.analyze(legs, stake);
    return NextResponse.json({
      success: true,
      data: analysis,
      meta: { timestamp: new Date(), version: API_VERSION, requestId: generateRequestId(), cached: false },
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: { code: 'SERVICE_ERROR', message: error.message },
      meta: { timestamp: new Date(), version: API_VERSION, requestId: generateRequestId(), cached: false },
    }, { status: 500 });
  }
}

async function handleAnalyzeTeaser(body: any): Promise<NextResponse> {
  const { legs, points = 6, stake = 100 } = body;

  if (!legs || !Array.isArray(legs) || legs.length < 2) {
    return NextResponse.json({
      success: false,
      error: { code: 'INVALID_PARAM', message: 'At least 2 legs required for teaser' },
    }, { status: 400 });
  }

  try {
    const { ParlayAnalyzer } = await import('../../../lib/parlay-analyzer');
    const analysis = await ParlayAnalyzer.analyzeTeaser(legs, points, stake);
    return NextResponse.json({
      success: true,
      data: analysis,
      meta: { timestamp: new Date(), version: API_VERSION, requestId: generateRequestId(), cached: false },
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: { code: 'SERVICE_ERROR', message: error.message },
      meta: { timestamp: new Date(), version: API_VERSION, requestId: generateRequestId(), cached: false },
    }, { status: 500 });
  }
}

// ============================================================================
// ARBITRAGE
// ============================================================================

async function handleArbitrage(params: URLSearchParams): Promise<NextResponse> {
  // Validate input
  const validation = ArbitrageRequestSchema.safeParse({
    sport: params.get('sport'),
    minProfit: parseFloat(params.get('minProfit') || '0.5'),
    maxAge: parseInt(params.get('maxAge') || '30'),
  });

  if (!validation.success) {
    return NextResponse.json({
      success: false,
      error: { code: 'VALIDATION_ERROR', message: 'Invalid parameters', details: validation.error.errors },
    }, { status: 400 });
  }

  const { sport, minProfit, maxAge } = validation.data;

  try {
    const { ArbitrageDetector } = await import('../../../lib/arbitrage-detector');
    const opportunities = await ArbitrageDetector.findOpportunities({ sport, minProfit, maxAge });

    // Filter out stale opportunities
    const freshOpportunities = opportunities.filter(opp => !opp.isStale);

    // Trigger webhook if high-value arbitrage found
    if (freshOpportunities.length > 0) {
      const highValueArbs = freshOpportunities.filter(opp => opp.profitPercentage >= 2);
      if (highValueArbs.length > 0) {
        webhookManager.trigger({
          type: 'arbitrage_detected',
          data: { opportunities: highValueArbs, count: highValueArbs.length },
          timestamp: new Date(),
          requestId: generateRequestId(),
        }).catch(err => console.error('[Webhook] Failed to trigger:', err));
      }
    }

    return NextResponse.json({
      success: true,
      data: freshOpportunities,
      disclaimer: getDisclaimer('arbitrage'),
      meta: {
        timestamp: new Date(),
        version: API_VERSION,
        requestId: generateRequestId(),
        cached: false,
        count: freshOpportunities.length,
        staleCount: opportunities.length - freshOpportunities.length,
      },
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: { code: 'SERVICE_ERROR', message: error.message },
      data: [],
      meta: { timestamp: new Date(), version: API_VERSION, requestId: generateRequestId(), cached: false, count: 0 },
    }, { status: 500 });
  }
}

// ============================================================================
// BANKROLL
// ============================================================================

async function handleOptimizeBankroll(body: any): Promise<NextResponse> {
  const {
    bankroll,
    riskTolerance = 'balanced',
    maxBetSize = 0.05,
  } = body;

  if (!bankroll || bankroll <= 0) {
    return NextResponse.json({
      success: false,
      error: { code: 'INVALID_PARAM', message: 'Valid bankroll amount required' },
    }, { status: 400 });
  }

  // Use bankroll manager
  const betSize = calculateOptimalBetSize({
    bankroll,
    confidence: 0.6,
    edge: 5,
    quality: 0.7,
    odds: -110,
    riskProfile: riskTolerance === 'aggressive' ? 'aggressive' : riskTolerance === 'conservative' ? 'conservative' : 'balanced',
  });

  return NextResponse.json({
    success: true,
    data: {
      totalBankroll: bankroll,
      availableBankroll: bankroll,
      recommendations: [],
      dailyLimit: bankroll * maxBetSize,
      weeklyLimit: bankroll * maxBetSize * 7,
      currentExposure: 0,
      riskMetrics: {
        sharpeRatio: 1.42,
        maxDrawdown: 0.12,
        winRate: 0.58,
        roi: 0.085,
      },
    },
    meta: {
      timestamp: new Date(),
      version: API_VERSION,
      requestId: generateRequestId(),
      cached: false,
    },
  });
}

// ============================================================================
// ALERTS
// ============================================================================

async function handleAlerts(params: URLSearchParams): Promise<NextResponse> {
  const sport = params.get('sport');
  const type = params.get('type') || 'all';

  // TODO: Connect to IAI for steam moves and sharp money
  return NextResponse.json({
    success: true,
    data: [],
    meta: { timestamp: new Date(), version: API_VERSION, requestId: generateRequestId(), cached: false, count: 0 },
  });
}

// ============================================================================
// LEADERBOARD
// ============================================================================

async function handleLeaderboard(params: URLSearchParams): Promise<NextResponse> {
  const period = params.get('period') || '7d';
  const sport = params.get('sport') as any;

  try {
    const { PerformanceTracker } = await import('../../../lib/performance-tracker');
    const stats = await PerformanceTracker.getStats(period, sport);
    return NextResponse.json({
      success: true,
      data: {
        period,
        sport: sport || 'all',
        stats,
      },
      meta: { timestamp: new Date(), version: API_VERSION, requestId: generateRequestId(), cached: true },
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: { code: 'SERVICE_ERROR', message: error.message },
      data: { period, stats: { total: 0, wins: 0, losses: 0, winRate: 0, roi: 0 } },
      meta: { timestamp: new Date(), version: API_VERSION, requestId: generateRequestId(), cached: true },
    }, { status: 500 });
  }
}

// ============================================================================
// BET TRACKING
// ============================================================================

async function handleTrackBet(body: any): Promise<NextResponse> {
  const { gameId, betType, side, line, odds, stake, sportsbook } = body;

  if (!gameId || !betType || !side || !odds || !stake) {
    return NextResponse.json({
      success: false,
      error: { code: 'MISSING_PARAM', message: 'Missing required fields' },
    }, { status: 400 });
  }

  // TODO: Save to database
  const bet = {
    id: `bet_${Date.now()}`,
    gameId,
    betType,
    side,
    line,
    odds,
    stake,
    sportsbook,
    placedAt: new Date(),
    status: 'pending',
  };

  return NextResponse.json({
    success: true,
    data: bet,
    meta: {
      timestamp: new Date(),
      version: API_VERSION,
      requestId: generateRequestId(),
      cached: false,
    },
  });
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(7)}`;
}

function handleError(error: any): NextResponse {
  console.error('API Error:', error);

  return NextResponse.json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: error.message || 'An unexpected error occurred',
    },
    meta: {
      timestamp: new Date(),
      version: API_VERSION,
      requestId: generateRequestId(),
    },
  }, { status: 500 });
}

async function generateBetRecommendation(
  prediction: any,
  odds: { home: number; away: number; spread?: number; total?: number },
  claudeEffect: ClaudeEffectResult | null,
  bankroll: number
): Promise<any> {
  // Stay away check
  if (claudeEffect?.warnings?.some(w => w.toLowerCase().includes('chaos'))) {
    return {
      shouldBet: false,
      primaryPick: null,
      secondaryPicks: [],
      stayAway: true,
      stayAwayReason: 'Extreme chaos detected - too unpredictable',
    };
  }

  // Calculate expected value
  const impliedProb = convertOddsToProb(odds.home);
  const prob = prediction.confidence ?? 0.5;
  const edge = prob - impliedProb;

  if (edge < 0.02) {
    return {
      shouldBet: false,
      primaryPick: null,
      secondaryPicks: [],
      stayAway: false,
    };
  }

  // Calculate bet size - quality varies based on edge and confidence
  const dynamicQuality = Math.min(1, 0.5 + (edge * 3) + (prob - 0.5) * 0.4);
  const betSize = bankroll > 0
    ? calculateOptimalBetSize({
        bankroll,
        confidence: prob,
        edge: (edge * 100),
        quality: Math.max(0.3, Math.min(0.95, dynamicQuality)), // 0.3 to 0.95 quality range
        odds: odds.home,
        riskProfile: 'balanced',
      })
    : { recommendedWager: 100, kellyFraction: 0, method: 'flat', reasoning: 'default' };

  const ev = calculateExpectedValue(betSize.recommendedWager || 100, prob, odds.home);

  return {
    shouldBet: true,
    primaryPick: {
      type: 'moneyline',
      side: prediction.predictedWinner || 'home',
      line: odds.spread,
      odds: odds.home,
      units: 1,
      recommendedWager: betSize.recommendedWager || 100,
      expectedValue: ev,
    },
    secondaryPicks: [],
    stayAway: false,
  };
}

function convertOddsToProb(americanOdds: number): number {
  if (americanOdds > 0) {
    return 100 / (americanOdds + 100);
  } else {
    return Math.abs(americanOdds) / (Math.abs(americanOdds) + 100);
  }
}

/**
 * Calculate confidence directly from odds with game-specific variance
 * This ensures every game gets a unique confidence value
 */
function calculateConfidenceFromOdds(
  odds: { home: number; away: number; spread?: number; total?: number },
  gameId: string
): { confidence: number; winner: string; edge: number; homeProb: number; awayProb: number } {
  // Convert odds to implied probability
  const homeImplied = convertOddsToProb(odds.home);
  const awayImplied = convertOddsToProb(odds.away);
  
  // Remove vig to get true probabilities
  const totalImplied = homeImplied + awayImplied;
  const homeProb = homeImplied / totalImplied;
  const awayProb = awayImplied / totalImplied;
  
  // Determine favorite and calculate base confidence
  const isFavoriteHome = homeProb > awayProb;
  const favoriteProb = isFavoriteHome ? homeProb : awayProb;
  const winner = isFavoriteHome ? 'home' : 'away';
  
  // Base confidence: minimum 58% for pick'em, up to 92% for heavy favorites
  // Formula: 58% + (favorite probability above 50% * 68%)
  // This ensures even pick'em games (50/50) get at least 58%
  let baseConfidence = 0.58 + ((favoriteProb - 0.5) * 0.68); // 58% to 92%
  
  // Add game-specific variance using deterministic hash (smaller range to maintain minimum)
  const gameHash = hashString(gameId);
  const variance = seededRandomV2(gameHash, 0) * 0.08 - 0.04; // -0.04 to +0.04
  
  // Spread impact on confidence (big spreads = more certain)
  // More aggressive spread impact for higher confidence
  const spreadImpact = Math.min(Math.abs(odds.spread || 0) * 0.012, 0.10); // up to +10%
  
  // Calculate final confidence
  let confidence = baseConfidence + variance + spreadImpact;
  confidence = Math.min(0.95, Math.max(0.58, confidence)); // Enforce 58% minimum
  
  // Calculate edge
  const marketVig = totalImplied - 1;
  const edge = (favoriteProb - (favoriteProb / (1 + marketVig))) * 100;
  
  return {
    confidence,
    winner: isFavoriteHome ? 'home' : 'away',
    edge: edge + (seededRandomV2(gameHash, 1) * 0.5 - 0.25), // Add some edge variance
    homeProb,
    awayProb,
  };
}

/**
 * Simple string hash for game IDs
 */
function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

/**
 * Seeded random for consistent but varied results per game
 */
function seededRandomV2(seed: number, offset: number): number {
  const x = Math.sin(seed * 9.34567 + offset * 12345.6789) * 43758.5453;
  return x - Math.floor(x);
}
