/**
 * PROGNO-KALSHI ALPHA LOOP ENGINE
 * Connects PROGNO picks (from Supabase) to Kalshi sports markets
 * 
 * Strategy:
 * - Fetch PROGNO predictions from Supabase (progno_predictions table)
 * - Match to Kalshi sports markets (KXNFL, KXNBA, etc.)
 * - Trade when PROGNO probability > Kalshi implied probability by 5%+
 * 
 * [STATUS: NEW] - Production-ready alpha loop
 */

import { KalshiTrader } from '../intelligence/kalshi-trader';
import { TradeProtectionService } from '../services/trade-protection';
import { getClient } from '../lib/supabase-memory';

interface PrognoPick {
  id: string;
  event_name: string;
  prediction_type: string;
  category: string;
  progno_score: number; // 0-1 probability
  predicted_outcome: string;
  confidence_level: string;
  created_at: Date;
}

interface AlphaOpportunity {
  prognoPick: PrognoPick;
  kalshiMarket: any;
  prognoProbability: number; // PROGNO's probability (0-1)
  kalshiProbability: number; // Kalshi's implied probability (0-1)
  edge: number; // Difference in percentage points
  recommendedSide: 'yes' | 'no';
  confidence: number;
}

export class PrognoKalshiAlphaLoop {
  private kalshi: KalshiTrader;
  private tradeProtection: TradeProtectionService;
  
  // Configuration
  private readonly ENABLED = process.env.ENABLE_PROGNO_ALPHA === 'true';
  private readonly MIN_EDGE = 0.05; // 5% minimum edge
  private readonly MIN_CONFIDENCE = 70; // 70% minimum confidence
  private readonly MAX_TRADES_PER_CYCLE = 3;
  
  constructor(kalshi: KalshiTrader, tradeProtection: TradeProtectionService) {
    this.kalshi = kalshi;
    this.tradeProtection = tradeProtection;
  }
  
  /**
   * Main alpha loop cycle
   */
  async runCycle(): Promise<void> {
    if (!this.ENABLED) {
      return;
    }
    
    try {
      console.log(`\n${'\x1b[96m'}🔄 PROGNO-KALSHI ALPHA LOOP${'\x1b[0m'}`);
      
      // Reset cycle tracking
      this.tradeProtection.resetCycleTracking();
      
      // Fetch PROGNO picks from Supabase
      const prognoPicks = await this.fetchPrognoPicks();
      console.log(`   📊 Fetched ${prognoPicks.length} PROGNO picks`);
      
      if (prognoPicks.length === 0) {
        return;
      }
      
      // Get Kalshi sports markets
      const kalshiMarkets = await this.kalshi.getMarkets();
      const sportsMarkets = kalshiMarkets.filter(m => 
        m.id?.startsWith('KXNFL') || 
        m.id?.startsWith('KXNBA') || 
        m.id?.startsWith('KXMLB') ||
        m.id?.startsWith('KXNHL')
      );
      
      console.log(`   📊 Found ${sportsMarkets.length} Kalshi sports markets`);
      
      // Find alpha opportunities
      const opportunities = this.findAlphaOpportunities(prognoPicks, sportsMarkets);
      console.log(`   🎯 Found ${opportunities.length} alpha opportunities`);
      
      // Execute on top opportunities
      let tradesExecuted = 0;
      for (const opp of opportunities.slice(0, this.MAX_TRADES_PER_CYCLE)) {
        // Check deduplication
        const shouldSkip = this.tradeProtection.shouldSkipMarket(opp.kalshiMarket.id, opp.kalshiMarket.id);
        if (shouldSkip.shouldSkip) {
          console.log(`   ⏭️ ${opp.kalshiMarket.id?.substring(0, 30)}: ${shouldSkip.reason}`);
          continue;
        }
        
        // Execute trade
        const executed = await this.executeAlphaTrade(opp);
        if (executed) {
          tradesExecuted++;
          this.tradeProtection.markAnalyzed(opp.kalshiMarket.id, true);
          this.tradeProtection.markBetted(opp.kalshiMarket.id);
        }
      }
      
      console.log(`   ✅ Executed ${tradesExecuted} alpha trades`);
      
    } catch (error: any) {
      console.error(`   ❌ Alpha loop error: ${error.message}`);
    }
  }
  
  /**
   * Fetch PROGNO picks from Supabase
   */
  private async fetchPrognoPicks(): Promise<PrognoPick[]> {
    try {
      const supabase = getClient();
      if (!supabase) {
        console.warn(`   ⚠️ Supabase client not available`);
        return [];
      }
      
      // Fetch recent PROGNO predictions (sports only, pending status)
      const { data, error } = await supabase
        .from('progno_predictions')
        .select('*')
        .eq('domain', 'sports')
        .is('actual_outcome', null) // Only pending predictions
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) {
        console.error(`   ❌ Error fetching PROGNO picks: ${error.message}`);
        return [];
      }
      
      return (data || []).map((p: any) => ({
        id: p.id,
        event_name: p.event_name || '',
        prediction_type: p.prediction_type || 'sports',
        category: p.category || '',
        progno_score: parseFloat(p.progno_score || 0),
        predicted_outcome: p.predicted_outcome || '',
        confidence_level: p.confidence_level || 'medium',
        created_at: new Date(p.created_at),
      }));
      
    } catch (error: any) {
      console.error(`   ❌ Error in fetchPrognoPicks: ${error.message}`);
      return [];
    }
  }
  
  /**
   * Find alpha opportunities (PROGNO probability > Kalshi probability by 5%+)
   */
  private findAlphaOpportunities(
    prognoPicks: PrognoPick[],
    kalshiMarkets: any[]
  ): AlphaOpportunity[] {
    const opportunities: AlphaOpportunity[] = [];
    
    for (const pick of prognoPicks) {
      // Try to match pick to Kalshi market
      const matchedMarket = this.matchPickToMarket(pick, kalshiMarkets);
      
      if (!matchedMarket) continue;
      
      // Calculate probabilities
      const prognoProbability = pick.progno_score; // 0-1
      const kalshiYesPrice = matchedMarket.yesPrice || 50;
      const kalshiProbability = kalshiYesPrice / 100; // Convert cents to 0-1
      
      // Calculate edge
      const edge = Math.abs(prognoProbability - kalshiProbability);
      
      // Must have minimum edge
      if (edge < this.MIN_EDGE) continue;
      
      // Determine recommended side
      let recommendedSide: 'yes' | 'no' = 'yes';
      if (prognoProbability < kalshiProbability) {
        // PROGNO thinks less likely than market → bet NO
        recommendedSide = 'no';
      }
      
      // Calculate confidence
      const confidence = Math.min(95, Math.max(70, (edge * 100) + 50));
      
      opportunities.push({
        prognoPick: pick,
        kalshiMarket: matchedMarket,
        prognoProbability,
        kalshiProbability,
        edge,
        recommendedSide,
        confidence,
      });
    }
    
    // Sort by edge (highest first)
    return opportunities.sort((a, b) => b.edge - a.edge);
  }
  
  /**
   * Match PROGNO pick to Kalshi market
   */
  private matchPickToMarket(pick: PrognoPick, markets: any[]): any | null {
    // Simple matching: look for markets with similar event names
    const eventNameLower = pick.event_name.toLowerCase();
    
    for (const market of markets) {
      const marketTitle = (market.title || '').toLowerCase();
      
      // Check if market title contains key words from event name
      const eventWords = eventNameLower.split(/\s+/).filter(w => w.length > 3);
      const matchCount = eventWords.filter(word => marketTitle.includes(word)).length;
      
      if (matchCount >= 2) {
        return market; // Good enough match
      }
    }
    
    return null;
  }
  
  /**
   * Execute alpha trade
   */
  private async executeAlphaTrade(opp: AlphaOpportunity): Promise<boolean> {
    try {
      console.log(`\n   🎯 Alpha Opportunity:`);
      console.log(`      Event: ${opp.prognoPick.event_name}`);
      console.log(`      PROGNO: ${(opp.prognoProbability * 100).toFixed(1)}% | Kalshi: ${(opp.kalshiProbability * 100).toFixed(1)}%`);
      console.log(`      Edge: ${(opp.edge * 100).toFixed(1)}% | Side: ${opp.recommendedSide.toUpperCase()}`);
      
      // Calculate trade size
      const tradeSize = Math.min(50, 100); // $50 per alpha trade
      const marketPrice = opp.recommendedSide === 'yes' 
        ? (opp.kalshiMarket.yesPrice || 50)
        : (opp.kalshiMarket.noPrice || 50);
      
      const contracts = Math.floor((tradeSize * 100) / marketPrice);
      
      if (contracts < 10) {
        console.log(`   ⚠️ Contract count too low (${contracts})`);
        return false;
      }
      
      // Place bet
      const order = await this.kalshi.placeBet(
        opp.kalshiMarket.id || '',
        opp.recommendedSide,
        contracts,
        marketPrice
      );
      
      if (order) {
        console.log(`   ✅ Alpha trade executed: ${contracts} contracts @ ${marketPrice}¢`);
        return true;
      }
      
      return false;
      
    } catch (error: any) {
      console.error(`   ❌ Alpha trade failed: ${error.message}`);
      return false;
    }
  }
  
  /**
   * Get stats
   */
  getStats(): {
    enabled: boolean;
    lastCycleTime?: Date;
  } {
    return {
      enabled: this.ENABLED,
    };
  }
}

