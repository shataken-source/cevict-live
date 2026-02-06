/**
 * UNIFIED ALPHA-HUNTER INTEGRATION
 * ================================
 * Connects Alpha-Hunter to Progno (Claude Effect) + Massager (Data Processing)
 * 
 * Architecture:
 * Market Data → Massager (Clean/Validate) → Progno (7-Layer AI) → Trade Execution
 *                                                                      ↓
 *                                              ANAI (System Monitoring) ← Supabase
 */

import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

// ============================================
// TYPES & INTERFACES
// ============================================

export interface MassagerValidation {
  validated: boolean;
  confidence: number;
  recommendations: string[];
  warnings: string[];
  adjustedProbability?: number;
  arbitrageOpportunities?: ArbitrageOpportunity[];
  hedgeRecommendations?: HedgeRecommendation[];
}

export interface ArbitrageOpportunity {
  is_arb: boolean;
  total_prob: number;
  margin: number;
  profit_pct: number;
  profit_amount: number;
  stakes: number[];
}

export interface HedgeRecommendation {
  hedge_stake: number;
  total_invested: number;
  guaranteed_profit: number;
  roi_pct: number;
}

export interface ClaudeEffectResult {
  totalEffect: number;
  totalConfidence: number;
  dimensions: {
    sentimentField: { score: number; confidence: number };
    narrativeMomentum: { score: number; confidence: number };
    informationAsymmetry: { score: number; confidence: number };
    chaosSensitivity: { score: number; category: string };
    networkInfluence: { score: number; confidence: number };
    temporalRelevance: { overallDecay: number };
    emergentPatterns: { score: number; confidence: number };
  };
  summary: string;
  keyFactors: string[];
  warnings: string[];
}

export interface PrognoSportsPrediction {
  gameId: string;
  sport: string;
  homeTeam: string;
  awayTeam: string;
  predictedWinner: string;
  winProbability: number;
  confidenceScore: number;
  spread: { edge: number; line: number };
  claudeEffect?: ClaudeEffectResult;
  recommendation: {
    shouldBet: boolean;
    primaryPick: {
      type: string;
      side: string;
      recommendedWager: number;
    };
  };
}

export interface ANAIStatus {
  state: 'dormant' | 'active' | 'monitoring' | 'alert';
  gpu: {
    available: boolean;
    temperature: number;
    utilization: number;
    vram_used: number;
    vram_total: number;
    health: string;
  };
  processes: {
    node_running: boolean;
    count: number;
  };
  decision_count: number;
}

export interface UnifiedAnalysis {
  market: {
    ticker: string;
    title: string;
    yesPrice: number;
    noPrice: number;
    category: string;
  };
  massagerValidation: MassagerValidation;
  claudeEffect: ClaudeEffectResult | null;
  prognoPrediction: PrognoSportsPrediction | null;
  systemHealth: ANAIStatus;
  finalRecommendation: {
    shouldTrade: boolean;
    direction: 'YES' | 'NO' | 'SKIP';
    confidence: number;
    reasoning: string[];
    warnings: string[];
    suggestedSize: number;
  };
}

// ============================================
// MASSAGER INTEGRATION
// ============================================

export class MassagerIntegration {
  private massagerPath: string;
  private pythonCmd: string;
  private isAvailable: boolean = false;

  constructor(basePath: string = process.cwd()) {
    this.massagerPath = path.join(basePath, '..', 'progno-massager');
    this.pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
    this.checkAvailability();
  }

  private async checkAvailability(): Promise<void> {
    try {
      const massagerExists = fs.existsSync(path.join(this.massagerPath, 'logic'));
      const pythonExists = await this.testPython();
      this.isAvailable = massagerExists && pythonExists;
      
      if (this.isAvailable) {
        console.log('   ✅ Massager Integration: CONNECTED');
      } else {
        console.log('   ⚠️  Massager Integration: NOT AVAILABLE (fallback mode)');
      }
    } catch {
      this.isAvailable = false;
    }
  }

  private testPython(): Promise<boolean> {
    return new Promise((resolve) => {
      const proc = spawn(this.pythonCmd, ['--version'], { timeout: 2000 });
      proc.on('close', (code) => resolve(code === 0));
      proc.on('error', () => resolve(false));
      setTimeout(() => { proc.kill(); resolve(false); }, 2000);
    });
  }

  async validateMarketData(data: {
    title: string;
    yesPrice: number;
    noPrice: number;
    volume?: number;
    category?: string;
  }): Promise<MassagerValidation> {
    if (!this.isAvailable) {
      return this.fallbackValidation(data);
    }

    try {
      const payload = JSON.stringify({
        market: data.title,
        odds_yes: data.yesPrice / 100,
        odds_no: data.noPrice / 100,
        volume: data.volume || 0,
        category: data.category || 'unknown',
      });

      const result = await this.runPythonScript('anai.py', ['--analyze', '--json', payload]);
      return JSON.parse(result);
    } catch (error: any) {
      console.warn(`   ⚠️  Massager validation failed: ${error.message}`);
      return this.fallbackValidation(data);
    }
  }

  async findArbitrage(odds: number[], bankroll: number = 1000): Promise<ArbitrageOpportunity> {
    if (!this.isAvailable) {
      return this.calculateArbitrageLocal(odds, bankroll);
    }

    try {
      const result = await this.runPythonScript('arbitrage.py', [
        '--validate',
        JSON.stringify({ odds, stake: bankroll })
      ]);
      return JSON.parse(result);
    } catch {
      return this.calculateArbitrageLocal(odds, bankroll);
    }
  }

  async calculateHedge(
    originalStake: number,
    originalOdds: number,
    hedgeOdds: number
  ): Promise<HedgeRecommendation> {
    const totalPayout = originalStake * originalOdds;
    const hedgeStake = totalPayout / hedgeOdds;
    const totalInvested = originalStake + hedgeStake;
    const profitIfOriginal = totalPayout - hedgeStake - originalStake;
    const profitIfHedge = (hedgeStake * hedgeOdds) - totalInvested;
    const guaranteedProfit = (profitIfOriginal + profitIfHedge) / 2;
    const roi = (guaranteedProfit / totalInvested) * 100;

    return {
      hedge_stake: Math.round(hedgeStake * 100) / 100,
      total_invested: Math.round(totalInvested * 100) / 100,
      guaranteed_profit: Math.round(guaranteedProfit * 100) / 100,
      roi_pct: Math.round(roi * 100) / 100
    };
  }

  private fallbackValidation(data: { yesPrice: number; noPrice: number }): MassagerValidation {
    const impliedProb = (data.yesPrice + data.noPrice) / 100;
    const isEfficient = impliedProb >= 0.98 && impliedProb <= 1.08;
    
    return {
      validated: true,
      confidence: isEfficient ? 70 : 50,
      recommendations: ['Massager unavailable - using basic validation'],
      warnings: isEfficient ? [] : ['Market may have unusual pricing'],
    };
  }

  private calculateArbitrageLocal(odds: number[], bankroll: number): ArbitrageOpportunity {
    const impliedProbs = odds.map(o => 1 / o);
    const totalProb = impliedProbs.reduce((a, b) => a + b, 0);
    const isArb = totalProb < 1.0;
    
    if (!isArb) {
      return {
        is_arb: false,
        total_prob: totalProb * 100,
        margin: (totalProb - 1) * 100,
        profit_pct: 0,
        profit_amount: 0,
        stakes: []
      };
    }

    const stakes = impliedProbs.map(p => (bankroll * p) / totalProb);
    const totalReturn = bankroll / totalProb;
    const profit = totalReturn - bankroll;

    return {
      is_arb: true,
      total_prob: totalProb * 100,
      margin: (totalProb - 1) * 100,
      profit_pct: (profit / bankroll) * 100,
      profit_amount: profit,
      stakes
    };
  }

  private runPythonScript(script: string, args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      const scriptPath = path.join(this.massagerPath, 'logic', script);
      const proc = spawn(this.pythonCmd, [scriptPath, ...args], {
        cwd: this.massagerPath,
        timeout: 10000
      });

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (data) => { stdout += data.toString(); });
      proc.stderr.on('data', (data) => { stderr += data.toString(); });

      proc.on('close', (code) => {
        if (code !== 0) reject(new Error(stderr || `Exit code ${code}`));
        else resolve(stdout);
      });

      proc.on('error', reject);
      setTimeout(() => { proc.kill(); reject(new Error('Timeout')); }, 10000);
    });
  }
}

// ============================================
// PROGNO INTEGRATION (Claude Effect)
// ============================================

export class PrognoIntegration {
  private baseUrl: string;
  private apiKey?: string;
  private isAvailable: boolean = false;

  constructor() {
    this.baseUrl = process.env.PROGNO_BASE_URL || 'http://localhost:3008';
    this.apiKey = process.env.BOT_API_KEY;
    this.checkAvailability();
  }

  private async checkAvailability(): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/api/progno/v2?action=health`, {
        headers: this.apiKey ? { 'x-api-key': this.apiKey } : {},
        signal: AbortSignal.timeout(5000)
      });
      this.isAvailable = response.ok;
      
      if (this.isAvailable) {
        console.log('   ✅ Progno Integration: CONNECTED');
      } else {
        console.log('   ⚠️  Progno Integration: NOT AVAILABLE');
      }
    } catch {
      this.isAvailable = false;
      console.log('   ⚠️  Progno Integration: NOT AVAILABLE');
    }
  }

  async getSportsPredictions(sport?: string, limit: number = 50): Promise<PrognoSportsPrediction[]> {
    if (!this.isAvailable) return [];

    try {
      const params = new URLSearchParams({
        action: 'predictions',
        limit: limit.toString(),
        ...(sport && { sport })
      });

      const response = await fetch(`${this.baseUrl}/api/progno/v2?${params}`, {
        headers: this.apiKey ? { 'x-api-key': this.apiKey } : {},
      });

      if (!response.ok) return [];
      const data = await response.json();
      return data.data || [];
    } catch {
      return [];
    }
  }

  async getClaudeEffect(gameId: string): Promise<ClaudeEffectResult | null> {
    if (!this.isAvailable) return null;

    try {
      const response = await fetch(
        `${this.baseUrl}/api/progno/v2?action=claude-effect&gameId=${gameId}`,
        { headers: this.apiKey ? { 'x-api-key': this.apiKey } : {} }
      );

      if (!response.ok) return null;
      const data = await response.json();
      return data.data || null;
    } catch {
      return null;
    }
  }

  async getPredictionForMarket(marketTitle: string, category: string): Promise<PrognoSportsPrediction | null> {
    // Map Kalshi market to sports prediction
    const sportMapping: Record<string, string> = {
      'SPORTS': 'all',
      'NFL': 'nfl',
      'NBA': 'nba',
      'MLB': 'mlb',
      'NHL': 'nhl',
      'NCAAF': 'cfb',
      'NCAAB': 'cbb',
    };

    const sport = sportMapping[category.toUpperCase()] || null;
    if (!sport) return null;

    const predictions = await this.getSportsPredictions(sport, 100);
    
    // Try to match market title to a prediction
    const titleLower = marketTitle.toLowerCase();
    return predictions.find(p => 
      titleLower.includes(p.homeTeam.toLowerCase()) ||
      titleLower.includes(p.awayTeam.toLowerCase())
    ) || null;
  }

  generateLocalClaudeEffect(data: {
    yesPrice: number;
    noPrice: number;
    volume?: number;
    category?: string;
  }): ClaudeEffectResult {
    // Generate a simplified Claude Effect when Progno isn't available
    const impliedYes = data.yesPrice / 100;
    const impliedNo = data.noPrice / 100;
    const totalImplied = impliedYes + impliedNo;
    const marketEfficiency = Math.abs(1 - totalImplied);

    // Information Asymmetry based on market efficiency
    const iaiScore = marketEfficiency > 0.05 ? 0.15 : marketEfficiency > 0.02 ? 0.08 : 0;
    
    // Chaos Sensitivity based on category
    const chaosCategories = ['WEATHER', 'POLITICS', 'ENTERTAINMENT'];
    const csiScore = chaosCategories.includes(data.category?.toUpperCase() || '') ? 0.35 : 0.15;

    const totalEffect = iaiScore * 0.20; // Simplified

    return {
      totalEffect,
      totalConfidence: 0.65,
      dimensions: {
        sentimentField: { score: 0, confidence: 0.5 },
        narrativeMomentum: { score: 0, confidence: 0.5 },
        informationAsymmetry: { score: iaiScore, confidence: 0.7 },
        chaosSensitivity: { score: csiScore, category: csiScore > 0.3 ? 'moderate' : 'low' },
        networkInfluence: { score: 0, confidence: 0.5 },
        temporalRelevance: { overallDecay: 0.95 },
        emergentPatterns: { score: 0, confidence: 0.5 },
      },
      summary: `Market efficiency: ${(marketEfficiency * 100).toFixed(1)}%`,
      keyFactors: [],
      warnings: marketEfficiency > 0.05 ? ['High market inefficiency detected'] : [],
    };
  }
}

// ============================================
// ANAI INTEGRATION (System Monitoring)
// ============================================

export class ANAIIntegration {
  private state: 'dormant' | 'active' | 'monitoring' | 'alert' = 'dormant';
  private activationTime: Date | null = null;
  private decisionLog: Array<{ timestamp: string; action: string; details: any }> = [];
  
  // Safety limits
  private readonly MAX_GPU_TEMP = 85;
  private readonly CRITICAL_GPU_TEMP = 95;

  activate(reason: string = 'trading_session'): void {
    this.state = 'active';
    this.activationTime = new Date();
    this.logDecision('ACTIVATION', { reason });
    console.log(`🤖 ANAI ACTIVATED - Reason: ${reason}`);
  }

  deactivate(): void {
    const duration = this.activationTime 
      ? (Date.now() - this.activationTime.getTime()) / 3600000 
      : 0;
    this.logDecision('DEACTIVATION', { duration_hours: duration });
    this.state = 'dormant';
    this.activationTime = null;
    console.log(`🤖 ANAI Deactivated. Duration: ${duration.toFixed(2)}h`);
  }

  async getStatus(): Promise<ANAIStatus> {
    const gpu = await this.checkGPU();
    const processes = this.checkProcesses();

    return {
      state: this.state,
      gpu,
      processes,
      decision_count: this.decisionLog.length
    };
  }

  async checkSystemHealth(): Promise<{ healthy: boolean; issues: string[] }> {
    const status = await this.getStatus();
    const issues: string[] = [];

    if (status.gpu.temperature >= this.CRITICAL_GPU_TEMP) {
      issues.push(`CRITICAL: GPU temp ${status.gpu.temperature}°C`);
      this.state = 'alert';
    } else if (status.gpu.temperature >= this.MAX_GPU_TEMP) {
      issues.push(`WARNING: GPU temp ${status.gpu.temperature}°C`);
    }

    if (!status.processes.node_running) {
      issues.push('WARNING: No Node.js processes detected');
    }

    if (status.gpu.health === 'critical') {
      issues.push('CRITICAL: GPU health critical');
    }

    return {
      healthy: issues.length === 0,
      issues
    };
  }

  makeAutonomousDecision(situation: string, options: string[]): string {
    // Safety check - ANAI cannot make financial decisions
    const financialKeywords = ['bet', 'wager', 'stake', 'money', 'deposit', 'withdraw', 'trade'];
    if (financialKeywords.some(kw => situation.toLowerCase().includes(kw))) {
      const decision = 'BLOCKED: Financial decisions require human approval';
      this.logDecision('AUTONOMOUS_DECISION_BLOCKED', { situation, options, decision });
      return decision;
    }

    // For operational decisions, prefer conservative options
    let decision: string;
    if (options.includes('restart')) decision = 'restart';
    else if (options.includes('wait')) decision = 'wait';
    else decision = options[0] || 'no_action';

    this.logDecision('AUTONOMOUS_DECISION', { situation, options, decision });
    return decision;
  }

  private async checkGPU(): Promise<ANAIStatus['gpu']> {
    // Try nvidia-smi (Windows/Linux with NVIDIA)
    try {
      const { execSync } = require('child_process');
      const result = execSync(
        'nvidia-smi --query-gpu=temperature.gpu,utilization.gpu,memory.used,memory.total,power.draw --format=csv,noheader,nounits',
        { timeout: 5000, encoding: 'utf8' }
      );
      
      const parts = result.trim().split(', ');
      const temp = parseInt(parts[0]) || 0;
      
      return {
        available: true,
        temperature: temp,
        utilization: parseInt(parts[1]) || 0,
        vram_used: parseInt(parts[2]) || 0,
        vram_total: parseInt(parts[3]) || 0,
        health: temp >= this.CRITICAL_GPU_TEMP ? 'critical' : temp >= this.MAX_GPU_TEMP ? 'warning' : 'healthy'
      };
    } catch {
      // Fallback - simulated/no GPU
      return {
        available: false,
        temperature: 55,
        utilization: 35,
        vram_used: 4096,
        vram_total: 20480,
        health: 'simulated'
      };
    }
  }

  private checkProcesses(): ANAIStatus['processes'] {
    try {
      const { execSync } = require('child_process');
      const isWindows = process.platform === 'win32';
      
      const cmd = isWindows 
        ? 'tasklist /FI "IMAGENAME eq node.exe" /FO CSV'
        : 'pgrep -c node';
      
      const result = execSync(cmd, { timeout: 5000, encoding: 'utf8' });
      const count = isWindows 
        ? (result.match(/node\.exe/gi) || []).length
        : parseInt(result.trim()) || 0;

      return { node_running: count > 0, count };
    } catch {
      return { node_running: false, count: 0 };
    }
  }

  private logDecision(action: string, details: any): void {
    this.decisionLog.push({
      timestamp: new Date().toISOString(),
      action,
      details
    });
    
    // Keep only last 100 decisions
    if (this.decisionLog.length > 100) {
      this.decisionLog = this.decisionLog.slice(-100);
    }
  }

  generateStatusReport(): string {
    const status = this.checkProcesses();
    
    return `
================================================================================
                         ANAI STATUS REPORT
                         ${new Date().toISOString()}
================================================================================

ANAI STATE: ${this.state.toUpperCase()}
Activated: ${this.activationTime?.toISOString() || 'N/A'}

--------------------------------------------------------------------------------
PROCESS STATUS
--------------------------------------------------------------------------------
Node.js Running: ${status.node_running ? '✅ Yes' : '❌ No'}
Process Count: ${status.count}

--------------------------------------------------------------------------------
RECENT DECISIONS (${this.decisionLog.length})
--------------------------------------------------------------------------------
${this.decisionLog.slice(-5).map(d => `  [${d.timestamp}] ${d.action}`).join('\n')}

================================================================================
`;
  }
}

// ============================================
// UNIFIED ALPHA-HUNTER INTEGRATION
// ============================================

export class UnifiedAlphaHunterIntegration {
  private massager: MassagerIntegration;
  private progno: PrognoIntegration;
  private anai: ANAIIntegration;
  
  constructor(basePath: string = process.cwd()) {
    console.log('\n🔗 INITIALIZING UNIFIED INTEGRATION...');
    this.massager = new MassagerIntegration(basePath);
    this.progno = new PrognoIntegration();
    this.anai = new ANAIIntegration();
  }

  async initialize(): Promise<void> {
    // Activate ANAI for monitoring
    this.anai.activate('unified_trading_session');
    
    // Check system health
    const health = await this.anai.checkSystemHealth();
    if (!health.healthy) {
      console.log('⚠️  System health issues:', health.issues.join(', '));
    }
  }

  async analyzeMarket(market: {
    ticker: string;
    title: string;
    yesPrice: number;
    noPrice: number;
    volume?: number;
    category: string;
  }): Promise<UnifiedAnalysis> {
    console.log(`\n🔍 UNIFIED ANALYSIS: ${market.title.substring(0, 50)}...`);

    // Step 1: Massager Validation
    const massagerValidation = await this.massager.validateMarketData({
      title: market.title,
      yesPrice: market.yesPrice,
      noPrice: market.noPrice,
      volume: market.volume,
      category: market.category
    });

    // Step 2: Progno Claude Effect (if sports-related)
    let claudeEffect: ClaudeEffectResult | null = null;
    let prognoPrediction: PrognoSportsPrediction | null = null;

    const sportsCategories = ['SPORTS', 'NFL', 'NBA', 'MLB', 'NHL', 'NCAAF', 'NCAAB'];
    if (sportsCategories.includes(market.category.toUpperCase())) {
      prognoPrediction = await this.progno.getPredictionForMarket(market.title, market.category);
      if (prognoPrediction?.claudeEffect) {
        claudeEffect = prognoPrediction.claudeEffect;
      }
    }

    // Fall back to local Claude Effect if Progno unavailable
    if (!claudeEffect) {
      claudeEffect = this.progno.generateLocalClaudeEffect({
        yesPrice: market.yesPrice,
        noPrice: market.noPrice,
        volume: market.volume,
        category: market.category
      });
    }

    // Step 3: ANAI System Health
    const systemHealth = await this.anai.getStatus();

    // Step 4: Generate Final Recommendation
    const finalRecommendation = this.generateFinalRecommendation(
      market,
      massagerValidation,
      claudeEffect,
      prognoPrediction,
      systemHealth
    );

    return {
      market,
      massagerValidation,
      claudeEffect,
      prognoPrediction,
      systemHealth,
      finalRecommendation
    };
  }

  private generateFinalRecommendation(
    market: { yesPrice: number; noPrice: number },
    massager: MassagerValidation,
    claude: ClaudeEffectResult,
    progno: PrognoSportsPrediction | null,
    system: ANAIStatus
  ): UnifiedAnalysis['finalRecommendation'] {
    const warnings: string[] = [];
    const reasoning: string[] = [];
    
    // Check system health
    if (system.state === 'alert') {
      warnings.push('System health is critical');
    }

    // Check massager validation
    if (!massager.validated) {
      warnings.push('Market data validation failed');
    }
    if (massager.warnings.length > 0) {
      warnings.push(...massager.warnings);
    }

    // Check Claude Effect warnings
    if (claude.warnings.length > 0) {
      warnings.push(...claude.warnings);
    }

    // Calculate base confidence
    let confidence = massager.confidence;
    
    // Apply Claude Effect
    const claudeConfidenceBoost = claude.totalEffect * 100;
    confidence = Math.min(95, confidence + claudeConfidenceBoost);

    // Apply Chaos Sensitivity penalty
    const csiPenalty = claude.dimensions.chaosSensitivity.score * 20;
    confidence = Math.max(50, confidence - csiPenalty);

    // Determine direction
    let direction: 'YES' | 'NO' | 'SKIP' = 'SKIP';
    
    if (progno?.recommendation?.shouldBet) {
      direction = progno.predictedWinner.toLowerCase().includes('home') ? 'YES' : 'NO';
      reasoning.push(`Progno prediction: ${progno.predictedWinner} (${(progno.winProbability * 100).toFixed(1)}%)`);
    } else {
      // Use Information Asymmetry to determine direction
      const iaiScore = claude.dimensions.informationAsymmetry.score;
      if (Math.abs(iaiScore) > 0.05) {
        direction = iaiScore > 0 ? 'YES' : 'NO';
        reasoning.push(`Information Asymmetry suggests ${direction}`);
      }
    }

    // Check if we should trade
    const shouldTrade = 
      confidence >= 70 &&
      warnings.filter(w => w.includes('CRITICAL')).length === 0 &&
      direction !== 'SKIP';

    if (claude.keyFactors.length > 0) {
      reasoning.push(...claude.keyFactors.slice(0, 3));
    }

    // Calculate suggested size based on confidence
    const maxSize = 10; // $10 max
    const suggestedSize = shouldTrade 
      ? Math.round((confidence / 100) * maxSize * 100) / 100
      : 0;

    return {
      shouldTrade,
      direction,
      confidence: Math.round(confidence),
      reasoning,
      warnings,
      suggestedSize
    };
  }

  async findArbitrageOpportunities(
    markets: Array<{ ticker: string; yesPrice: number; noPrice: number }>
  ): Promise<ArbitrageOpportunity[]> {
    const opportunities: ArbitrageOpportunity[] = [];

    for (const market of markets) {
      // Convert to decimal odds
      const yesOdds = 100 / market.yesPrice;
      const noOdds = 100 / market.noPrice;
      
      const arb = await this.massager.findArbitrage([yesOdds, noOdds], 100);
      
      if (arb.is_arb && arb.profit_pct >= 0.5) {
        opportunities.push(arb);
      }
    }

    return opportunities.sort((a, b) => b.profit_pct - a.profit_pct);
  }

  shutdown(): void {
    this.anai.deactivate();
    console.log('🔌 Unified Integration shutdown complete');
  }
}

// ============================================
// SINGLETON INSTANCE
// ============================================

let _integrationInstance: UnifiedAlphaHunterIntegration | null = null;

export function getUnifiedIntegration(basePath?: string): UnifiedAlphaHunterIntegration {
  if (!_integrationInstance) {
    _integrationInstance = new UnifiedAlphaHunterIntegration(basePath);
  }
  return _integrationInstance;
}

export default UnifiedAlphaHunterIntegration;
