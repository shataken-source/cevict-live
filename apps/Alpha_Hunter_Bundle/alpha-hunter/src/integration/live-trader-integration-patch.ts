/**
 * ENHANCED LIVE TRADER - INTEGRATION PATCH
 * =========================================
 * This file contains the integration patches for the live trader
 * to connect with Massager, Progno, and ANAI systems.
 * 
 * Import this file in your live-trader-24-7.ts to enable full integration.
 */

import { 
  UnifiedAlphaHunterIntegration, 
  getUnifiedIntegration,
  MassagerValidation,
  ClaudeEffectResult,
  ANAIStatus 
} from './unified-alpha-hunter-integration';

import { 
  PrognoKalshiConnector, 
  getPrognoKalshiConnector,
  EnhancedKalshiPrediction 
} from './progno-kalshi-connector';

// ============================================
// INTEGRATION STATE
// ============================================

interface IntegrationState {
  unifiedIntegration: UnifiedAlphaHunterIntegration | null;
  prognoConnector: PrognoKalshiConnector | null;
  isInitialized: boolean;
  lastHealthCheck: Date | null;
  systemHealthy: boolean;
  integrationStats: {
    massagerValidations: number;
    prognoEnhancements: number;
    skippedDueToChaos: number;
    anaiAlerts: number;
  };
}

const integrationState: IntegrationState = {
  unifiedIntegration: null,
  prognoConnector: null,
  isInitialized: false,
  lastHealthCheck: null,
  systemHealthy: true,
  integrationStats: {
    massagerValidations: 0,
    prognoEnhancements: 0,
    skippedDueToChaos: 0,
    anaiAlerts: 0
  }
};

// ============================================
// INITIALIZATION
// ============================================

export async function initializeIntegration(basePath?: string): Promise<void> {
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║     🔗 INITIALIZING FULL SYSTEM INTEGRATION 🔗              ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  try {
    // Initialize unified integration (Massager + Progno + ANAI)
    integrationState.unifiedIntegration = getUnifiedIntegration(basePath);
    await integrationState.unifiedIntegration.initialize();

    // Initialize Progno-Kalshi connector
    integrationState.prognoConnector = getPrognoKalshiConnector();

    integrationState.isInitialized = true;
    integrationState.lastHealthCheck = new Date();

    console.log('\n   ✅ Full system integration initialized successfully');
    console.log('      📊 Massager: Data validation & arbitrage detection');
    console.log('      🧠 Progno: 7-Layer Claude Effect for sports');
    console.log('      🤖 ANAI: System monitoring & health checks');
    console.log('      🔄 Progno-Kalshi: Sports market enhancement\n');

  } catch (error: any) {
    console.error(`   ❌ Integration initialization failed: ${error.message}`);
    integrationState.isInitialized = false;
  }
}

// ============================================
// PRE-TRADE VALIDATION
// ============================================

export interface PreTradeValidation {
  approved: boolean;
  adjustedConfidence: number;
  adjustedSize: number;
  massagerResult: MassagerValidation;
  claudeEffect: ClaudeEffectResult | null;
  prognoEnhancement: EnhancedKalshiPrediction | null;
  systemHealth: ANAIStatus;
  warnings: string[];
  reasoning: string[];
}

export async function validateBeforeTrade(market: {
  ticker: string;
  title: string;
  category: string;
  yesPrice: number;
  noPrice: number;
  volume?: number;
  originalConfidence: number;
  originalDirection: 'YES' | 'NO';
  originalSize: number;
}): Promise<PreTradeValidation> {
  const warnings: string[] = [];
  const reasoning: string[] = [];
  
  // Check if integration is available
  if (!integrationState.isInitialized || !integrationState.unifiedIntegration) {
    console.log('   ⚠️  Integration not initialized, using fallback validation');
    return {
      approved: true,
      adjustedConfidence: market.originalConfidence,
      adjustedSize: market.originalSize,
      massagerResult: { validated: true, confidence: 70, recommendations: [], warnings: [] },
      claudeEffect: null,
      prognoEnhancement: null,
      systemHealth: { state: 'dormant', gpu: { available: false, temperature: 0, utilization: 0, vram_used: 0, vram_total: 0, health: 'unknown' }, processes: { node_running: true, count: 1 }, decision_count: 0 },
      warnings: ['Integration not initialized'],
      reasoning: ['Using fallback validation']
    };
  }

  console.log(`\n   🔍 [INTEGRATION] Validating: ${market.title.substring(0, 50)}...`);

  // Step 1: System Health Check
  const systemHealth = await integrationState.unifiedIntegration['anai'].getStatus();
  if (systemHealth.state === 'alert') {
    warnings.push('System health is critical');
    integrationState.integrationStats.anaiAlerts++;
  }

  // Step 2: Massager Validation
  const massagerResult = await integrationState.unifiedIntegration['massager'].validateMarketData({
    title: market.title,
    yesPrice: market.yesPrice,
    noPrice: market.noPrice,
    volume: market.volume,
    category: market.category
  });
  integrationState.integrationStats.massagerValidations++;

  if (!massagerResult.validated) {
    warnings.push('Massager validation failed');
  }
  if (massagerResult.warnings.length > 0) {
    warnings.push(...massagerResult.warnings);
  }
  reasoning.push(...massagerResult.recommendations);

  // Step 3: Claude Effect (local or from Progno)
  let claudeEffect = integrationState.unifiedIntegration['progno'].generateLocalClaudeEffect({
    yesPrice: market.yesPrice,
    noPrice: market.noPrice,
    volume: market.volume,
    category: market.category
  });

  // Step 4: Progno Enhancement for Sports Markets
  let prognoEnhancement: EnhancedKalshiPrediction | null = null;
  const sportsCategories = ['SPORTS', 'NFL', 'NBA', 'MLB', 'NHL', 'NCAAF', 'NCAAB'];
  
  if (sportsCategories.some(s => market.category.toUpperCase().includes(s) || market.ticker.toUpperCase().includes(s))) {
    if (integrationState.prognoConnector) {
      prognoEnhancement = await integrationState.prognoConnector.enhanceKalshiMarket(market);
      integrationState.integrationStats.prognoEnhancements++;

      if (prognoEnhancement.prognoPrediction?.claudeEffect) {
        claudeEffect = prognoEnhancement.prognoPrediction.claudeEffect;
      }

      if (prognoEnhancement.recommendation.prognoAligned) {
        reasoning.push(`Progno aligned: ${prognoEnhancement.recommendation.side} @ ${prognoEnhancement.recommendation.edge * 100}% edge`);
      }
      
      reasoning.push(...prognoEnhancement.recommendation.reasoning);
    }
  }

  // Step 5: Calculate Adjusted Confidence
  let adjustedConfidence = market.originalConfidence;

  // Apply Claude Effect boost
  const claudeBoost = claudeEffect.totalEffect * 100;
  adjustedConfidence += claudeBoost;
  reasoning.push(`Claude Effect: ${claudeBoost > 0 ? '+' : ''}${claudeBoost.toFixed(1)}%`);

  // Apply Chaos Sensitivity penalty
  const csiScore = claudeEffect.dimensions.chaosSensitivity.score;
  if (csiScore > 0.35) {
    const csiPenalty = csiScore * 20;
    adjustedConfidence -= csiPenalty;
    warnings.push(`High chaos (${(csiScore * 100).toFixed(0)}%) - confidence reduced`);
    integrationState.integrationStats.skippedDueToChaos++;
  }

  // Apply Massager confidence adjustment
  if (massagerResult.adjustedProbability) {
    const massagerAdjust = (massagerResult.adjustedProbability - 0.5) * 20;
    adjustedConfidence += massagerAdjust;
    reasoning.push(`Massager adjustment: ${massagerAdjust > 0 ? '+' : ''}${massagerAdjust.toFixed(1)}%`);
  }

  // Clamp confidence
  adjustedConfidence = Math.max(50, Math.min(95, adjustedConfidence));

  // Step 6: Calculate Adjusted Size
  let adjustedSize = market.originalSize;

  // Reduce size if high chaos
  if (csiScore > 0.5) {
    adjustedSize = adjustedSize * 0.5;
    reasoning.push('Size halved due to extreme chaos');
  } else if (csiScore > 0.35) {
    adjustedSize = adjustedSize * 0.75;
    reasoning.push('Size reduced 25% due to high chaos');
  }

  // Increase size if Progno strongly aligned
  if (prognoEnhancement?.recommendation.prognoAligned && prognoEnhancement.recommendation.edge > 0.05) {
    adjustedSize = Math.min(adjustedSize * 1.25, 15); // Cap at $15
    reasoning.push('Size increased 25% due to strong Progno alignment');
  }

  // Step 7: Final Approval Decision
  const criticalWarnings = warnings.filter(w => 
    w.includes('CRITICAL') || w.includes('failed') || w.includes('critical')
  );

  const approved = 
    adjustedConfidence >= 60 &&
    criticalWarnings.length === 0 &&
    systemHealth.state !== 'alert' &&
    massagerResult.validated;

  // Log decision
  console.log(`   📊 Confidence: ${market.originalConfidence}% → ${adjustedConfidence.toFixed(1)}%`);
  console.log(`   💰 Size: $${market.originalSize.toFixed(2)} → $${adjustedSize.toFixed(2)}`);
  console.log(`   ${approved ? '✅ APPROVED' : '❌ REJECTED'}: ${warnings.length > 0 ? warnings.join(', ') : 'No issues'}`);

  return {
    approved,
    adjustedConfidence: Math.round(adjustedConfidence),
    adjustedSize: Math.round(adjustedSize * 100) / 100,
    massagerResult,
    claudeEffect,
    prognoEnhancement,
    systemHealth,
    warnings,
    reasoning
  };
}

// ============================================
// ARBITRAGE SCANNING
// ============================================

export async function scanForArbitrage(markets: Array<{
  ticker: string;
  yesPrice: number;
  noPrice: number;
}>): Promise<Array<{
  ticker: string;
  profitPct: number;
  stakes: number[];
}>> {
  if (!integrationState.unifiedIntegration) return [];

  const opportunities = await integrationState.unifiedIntegration.findArbitrageOpportunities(markets);
  
  return opportunities
    .filter(arb => arb.is_arb && arb.profit_pct >= 0.5)
    .map((arb, i) => ({
      ticker: markets[i]?.ticker || 'unknown',
      profitPct: arb.profit_pct,
      stakes: arb.stakes
    }));
}

// ============================================
// SPORTS MARKET ENHANCEMENT
// ============================================

export async function enhanceSportsMarkets(markets: Array<{
  ticker: string;
  title: string;
  category: string;
  yesPrice: number;
  noPrice: number;
  volume?: number;
}>): Promise<EnhancedKalshiPrediction[]> {
  if (!integrationState.prognoConnector) return [];

  return integrationState.prognoConnector.enhanceMultipleMarkets(markets);
}

// ============================================
// HEALTH CHECK
// ============================================

export async function performHealthCheck(): Promise<{
  healthy: boolean;
  issues: string[];
  stats: IntegrationState['integrationStats'];
}> {
  const issues: string[] = [];

  if (!integrationState.isInitialized) {
    issues.push('Integration not initialized');
    return { healthy: false, issues, stats: integrationState.integrationStats };
  }

  if (integrationState.unifiedIntegration) {
    const health = await integrationState.unifiedIntegration['anai'].checkSystemHealth();
    if (!health.healthy) {
      issues.push(...health.issues);
    }
  }

  integrationState.lastHealthCheck = new Date();
  integrationState.systemHealthy = issues.length === 0;

  return {
    healthy: integrationState.systemHealthy,
    issues,
    stats: integrationState.integrationStats
  };
}

// ============================================
// GET INTEGRATION STATUS
// ============================================

export function getIntegrationStatus(): {
  initialized: boolean;
  lastHealthCheck: Date | null;
  healthy: boolean;
  stats: IntegrationState['integrationStats'];
} {
  return {
    initialized: integrationState.isInitialized,
    lastHealthCheck: integrationState.lastHealthCheck,
    healthy: integrationState.systemHealthy,
    stats: integrationState.integrationStats
  };
}

// ============================================
// SHUTDOWN
// ============================================

export function shutdownIntegration(): void {
  if (integrationState.unifiedIntegration) {
    integrationState.unifiedIntegration.shutdown();
  }
  
  integrationState.isInitialized = false;
  console.log('🔌 Integration shutdown complete');
}

// ============================================
// USAGE EXAMPLE
// ============================================

/*

// In your live-trader-24-7.ts:

import { 
  initializeIntegration, 
  validateBeforeTrade, 
  shutdownIntegration,
  getIntegrationStatus 
} from './live-trader-integration-patch';

// During startup:
await initializeIntegration();

// Before each trade:
const validation = await validateBeforeTrade({
  ticker: market.ticker,
  title: market.title,
  category: market.category,
  yesPrice: market.yesPrice,
  noPrice: market.noPrice,
  volume: market.volume,
  originalConfidence: aiConfidence,
  originalDirection: direction,
  originalSize: tradeSize
});

if (validation.approved) {
  // Execute trade with adjusted values
  await executeTrade({
    ...market,
    confidence: validation.adjustedConfidence,
    size: validation.adjustedSize
  });
} else {
  console.log(`Trade rejected: ${validation.warnings.join(', ')}`);
}

// During shutdown:
shutdownIntegration();

*/

export default {
  initializeIntegration,
  validateBeforeTrade,
  scanForArbitrage,
  enhanceSportsMarkets,
  performHealthCheck,
  getIntegrationStatus,
  shutdownIntegration
};
