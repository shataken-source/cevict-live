/**
 * Progno Massager Bridge
 * 
 * Provides integration between the main Progno Next.js app and the
 * Python/Streamlit Massager service. Exposes massager capabilities via
 * a TypeScript API for use in the prediction pipeline.
 * 
 * Capabilities exposed:
 * - 11 Data Massage Commands (injury processing, normalization, etc.)
 * - Arbitrage Detection across bookmakers
 * - Hedge Calculation for risk management
 * - Supabase Memory Sync
 */

import { fetchOddsJamGames, OddsJamGame, OddsJamOdds } from './oddsjam-fetcher';

export interface MassageCommand {
  name: string;
  description: string;
  appliesTo: 'odds' | 'injuries' | 'all';
}

export interface ArbitrageOpportunity {
  gameId: string;
  homeTeam: string;
  awayTeam: string;
  profitPercentage: number;
  homeStake: number;
  awayStake: number;
  homeOdds: number;
  awayOdds: number;
  sportsbook1: string;
  sportsbook2: string;
}

export interface HedgeResult {
  hedgeStake: number;
  guaranteedProfit: number;
  roiPercentage: number;
  isValid: boolean;
}

// 11 Massager Commands available
export const MASSAGER_COMMANDS: MassageCommand[] = [
  { name: 'Trim Noise', description: 'Clean text fields and standardize team names', appliesTo: 'all' },
  { name: 'Home Bias', description: 'Apply +5% home field advantage adjustment', appliesTo: 'odds' },
  { name: 'Volatility', description: 'Flag high-risk games based on odds movement', appliesTo: 'odds' },
  { name: 'Time-Decay', description: 'Weight recent data more heavily', appliesTo: 'all' },
  { name: 'Normalize', description: 'Scale values to 0-1 range', appliesTo: 'all' },
  { name: 'Momentum', description: 'Apply ±10% streak adjustment', appliesTo: 'odds' },
  { name: 'Injury', description: 'Process injury reports and calculate impact', appliesTo: 'injuries' },
  { name: 'Sentiment', description: 'Adjust for public betting sentiment', appliesTo: 'odds' },
  { name: 'Arb Finder', description: 'Find cross-book arbitrage opportunities', appliesTo: 'odds' },
  { name: 'Hedge Calc', description: 'Calculate insurance hedge bets', appliesTo: 'odds' },
  { name: 'JSON Export', description: 'Export processed data as web-ready JSON', appliesTo: 'all' }
];

/**
 * Calculate implied probability from American odds
 */
function americanToImplied(odds: number): number {
  if (odds > 0) {
    return 100 / (odds + 100);
  } else {
    return Math.abs(odds) / (Math.abs(odds) + 100);
  }
}

/**
 * Find arbitrage opportunities between two sets of odds
 */
export function findArbitrage(
  homeOdds: number,
  awayOdds: number,
  bankroll: number = 1000,
  sportsbook1: string = 'Book A',
  sportsbook2: string = 'Book B'
): ArbitrageOpportunity | null {
  const homeImplied = americanToImplied(homeOdds);
  const awayImplied = americanToImplied(awayOdds);
  const totalImplied = homeImplied + awayImplied;

  // Arbitrage exists if total implied probability < 100%
  if (totalImplied >= 1.0) {
    return null;
  }

  const profitPct = (1 - totalImplied) * 100;
  
  // Calculate optimal stakes using the arbitrage formula
  // Stake on outcome = (Bankroll × implied prob of other outcome) / total implied
  const homeStake = (bankroll * awayImplied) / totalImplied;
  const awayStake = (bankroll * homeImplied) / totalImplied;

  return {
    gameId: `arb_${Date.now()}`,
    homeTeam: 'Home',
    awayTeam: 'Away',
    profitPercentage: profitPct,
    homeStake,
    awayStake,
    homeOdds,
    awayOdds,
    sportsbook1,
    sportsbook2
  };
}

/**
 * Calculate optimal hedge bet
 */
export function calculateHedge(
  originalStake: number,
  originalOdds: number,
  hedgeOdds: number
): HedgeResult {
  // Calculate potential return from original bet
  const originalReturn = originalStake * (originalOdds > 0 
    ? (originalOdds / 100 + 1) 
    : (100 / Math.abs(originalOdds) + 1));

  // Calculate hedge stake needed to guarantee profit
  // hedgeStake × hedgeReturn = originalReturn (approximately)
  const hedgeReturn = hedgeOdds > 0 
    ? (hedgeOdds / 100 + 1) 
    : (100 / Math.abs(hedgeOdds) + 1);
  
  const hedgeStake = originalReturn / hedgeReturn;
  
  // Guaranteed profit is the minimum of both outcomes minus total stakes
  const totalStaked = originalStake + hedgeStake;
  const hedgeOutcomeReturn = hedgeStake * hedgeReturn;
  const guaranteedProfit = Math.min(originalReturn, hedgeOutcomeReturn) - totalStaked;
  
  const roiPct = (guaranteedProfit / totalStaked) * 100;

  return {
    hedgeStake,
    guaranteedProfit,
    roiPercentage: roiPct,
    isValid: guaranteedProfit > 0
  };
}

/**
 * Apply Home Bias adjustment (+5% to home team probability)
 */
export function applyHomeBias(homeProbability: number): number {
  return Math.min(0.95, homeProbability + 0.05);
}

/**
 * Calculate injury impact score from OddsJam data
 */
export function calculateInjuryImpact(
  injuries: Array<{ player: string; status: string; impact: 'high' | 'medium' | 'low' }>
): number {
  if (!injuries || injuries.length === 0) return 0;

  let totalImpact = 0;
  
  for (const injury of injuries) {
    const statusMultiplier = injury.status.toLowerCase() === 'out' ? 1.0 :
                           injury.status.toLowerCase() === 'doubtful' ? 0.8 :
                           injury.status.toLowerCase() === 'questionable' ? 0.4 : 0.5;
    
    const impactWeight = injury.impact === 'high' ? 0.4 :
                        injury.impact === 'medium' ? 0.25 : 0.1;
    
    totalImpact += impactWeight * statusMultiplier;
  }

  return Math.min(1.0, totalImpact);
}

/**
 * Process data through massager commands
 * Returns processed data with applied transformations
 */
export async function processWithMassager(
  data: any,
  commands: string[]
): Promise<{ processed: any; appliedCommands: string[]; messages: string[] }> {
  const messages: string[] = [];
  const appliedCommands: string[] = [];
  let processed = { ...data };

  for (const cmd of commands) {
    const command = MASSAGER_COMMANDS.find(c => c.name === cmd);
    if (!command) {
      messages.push(`Unknown command: ${cmd}`);
      continue;
    }

    try {
      switch (cmd) {
        case 'Trim Noise':
          processed = trimNoise(processed);
          messages.push('✅ Trimmed text noise and standardized names');
          appliedCommands.push(cmd);
          break;
        
        case 'Home Bias':
          if (processed.homeProbability !== undefined) {
            processed.homeProbability = applyHomeBias(processed.homeProbability);
            messages.push('✅ Applied +5% home field advantage');
            appliedCommands.push(cmd);
          }
          break;

        case 'Normalize':
          processed = normalizeData(processed);
          messages.push('✅ Normalized values to 0-1 range');
          appliedCommands.push(cmd);
          break;

        case 'Arb Finder':
          if (processed.homeOdds && processed.awayOdds) {
            const arb = findArbitrage(processed.homeOdds, processed.awayOdds);
            processed.arbitrage = arb;
            messages.push(arb ? `🔥 Arbitrage found: ${arb.profitPercentage.toFixed(2)}% profit` : '❌ No arbitrage opportunity');
            appliedCommands.push(cmd);
          }
          break;

        case 'Hedge Calc':
          if (processed.originalStake && processed.originalOdds && processed.hedgeOdds) {
            const hedge = calculateHedge(processed.originalStake, processed.originalOdds, processed.hedgeOdds);
            processed.hedge = hedge;
            messages.push(hedge.isValid ? `✅ Hedge calculated: $${hedge.guaranteedProfit.toFixed(2)} guaranteed profit` : '❌ Invalid hedge');
            appliedCommands.push(cmd);
          }
          break;

        case 'Injury':
          if (processed.injuries) {
            processed.injuryImpact = calculateInjuryImpact(processed.injuries);
            messages.push(`✅ Processed ${processed.injuries.length} injuries, impact score: ${(processed.injuryImpact * 100).toFixed(1)}%`);
            appliedCommands.push(cmd);
          }
          break;

        default:
          messages.push(`⏭️ Command ${cmd} not yet implemented in bridge`);
      }
    } catch (error) {
      messages.push(`❌ Error applying ${cmd}: ${error}`);
    }
  }

  return { processed, appliedCommands, messages };
}

/**
 * Trim noise from data (standardize text)
 */
function trimNoise(data: any): any {
  const cleaned: any = {};
  
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'string') {
      // Standardize team names, remove extra whitespace
      cleaned[key] = value
        .trim()
        .replace(/\s+/g, ' ')
        .replace(/[^a-zA-Z0-9\s\-\.]/g, '');
    } else {
      cleaned[key] = value;
    }
  }
  
  return cleaned;
}

/**
 * Normalize numeric values to 0-1 range
 */
function normalizeData(data: any): any {
  const normalized: any = { ...data };
  
  // Find numeric fields and normalize them
  const numericFields = Object.entries(data).filter(([_, v]) => typeof v === 'number');
  
  if (numericFields.length > 0) {
    const values = numericFields.map(([_, v]) => v as number);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1; // Avoid division by zero
    
    for (const [key, value] of numericFields) {
      normalized[key] = ((value as number) - min) / range;
    }
  }
  
  return normalized;
}

/**
 * Export data as web-ready JSON (matches progno prediction format)
 */
export function exportAsPredictionJSON(data: any[]): string {
  const predictions = data.map((item, index) => ({
    predictionId: `massaged_${Date.now()}_${index}`,
    gameId: item.gameId || item.id || `game_${index}`,
    winner: item.winner || item.predictedWinner,
    confidence: item.confidence || item.probability || 0.5,
    edge: item.edge || item.profitPercentage || 0,
    keyFactors: item.keyFactors || item.messages || [],
    methodsUsed: item.appliedCommands || ['massager'],
    odds: {
      home: item.homeOdds || -110,
      away: item.awayOdds || -110
    },
    timestamp: new Date().toISOString(),
    source: 'massager_bridge'
  }));

  return JSON.stringify(predictions, null, 2);
}

// Export singleton instance for easy access
export const massagerBridge = {
  commands: MASSAGER_COMMANDS,
  findArbitrage,
  calculateHedge,
  applyHomeBias,
  calculateInjuryImpact,
  processWithMassager,
  exportAsPredictionJSON
};
