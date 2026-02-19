/**
 * Alternative Market Strategies - Kalshi & Polymarket
 * Prognostication Capital
 * 
 * Advanced strategies for prediction markets:
 * - Calendar spread arbitrage (Kalshi)
 * - Volatility compression
 * - Cross-venue arbitrage
 * - Liquidity sniping (Polymarket)
 * - Event drift reversion
 */

export interface AlternativeMarket {
  id: string;
  venue: 'kalshi' | 'polymarket';
  event: string;
  contract: string; // YES/NO for Kalshi, outcome for Polymarket
  price: number; // 0-1 for Kalshi/Polymarket
  impliedProb: number;
  liquidity: number;
  expiry: string;
  volume24h?: number;
  spread?: number; // Bid-ask spread
}

export interface ArbitrageOpportunity {
  id: string;
  type: 'cross_venue' | 'calendar_spread' | 'liquidity_imbalance' | 'drift_reversion';
  venueA: AlternativeMarket;
  venueB?: AlternativeMarket;
  
  // Analysis
  edge: number;
  profitPotential: number;
  riskLevel: 'low' | 'medium' | 'high';
  confidence: number;
  
  // Execution
  recommendedAction: string;
  maxStake: number;
  timeHorizon: string; // e.g., "24h", "expiry"
  
  // Metadata
  detectedAt: string;
  expectedResolution: string;
}

// Kalshi Special Strategies

/**
 * Detect calendar spread arbitrage
 * Buy YES in near expiry, sell YES in far expiry (or vice versa)
 */
export function detectCalendarSpreadArbitrage(
  markets: AlternativeMarket[]
): ArbitrageOpportunity[] {
  const opportunities: ArbitrageOpportunity[] = [];
  
  // Group markets by event
  const byEvent: Record<string, AlternativeMarket[]> = {};
  for (const market of markets) {
    if (!byEvent[market.event]) byEvent[market.event] = [];
    byEvent[market.event].push(market);
  }
  
  // Check each event for calendar spreads
  for (const [event, eventMarkets] of Object.entries(byEvent)) {
    if (eventMarkets.length < 2) continue;
    
    // Sort by expiry
    eventMarkets.sort((a, b) => 
      new Date(a.expiry).getTime() - new Date(b.expiry).getTime()
    );
    
    for (let i = 0; i < eventMarkets.length - 1; i++) {
      for (let j = i + 1; j < eventMarkets.length; j++) {
        const near = eventMarkets[i];
        const far = eventMarkets[j];
        
        // Calendar spread logic
        const timeDiff = new Date(far.expiry).getTime() - new Date(near.expiry).getTime();
        const daysDiff = timeDiff / (1000 * 60 * 60 * 24);
        
        // Price should decrease as expiry approaches (for binary)
        const priceDiff = near.price - far.price;
        
        // If near expiry is priced lower than far, potential buy near/sell far
        if (priceDiff < -0.05) { // 5% difference threshold
          opportunities.push({
            id: `calendar-${near.id}-${far.id}`,
            type: 'calendar_spread',
            venueA: near,
            venueB: far,
            edge: Math.abs(priceDiff),
            profitPotential: Math.abs(priceDiff) * 1000, // Per $1000
            riskLevel: 'low',
            confidence: 70,
            recommendedAction: `Buy YES ${near.contract} @ ${near.price.toFixed(2)}, Sell YES ${far.contract} @ ${far.price.toFixed(2)}`,
            maxStake: Math.min(near.liquidity, far.liquidity) * 0.1,
            timeHorizon: `${Math.round(daysDiff)}d`,
            detectedAt: new Date().toISOString(),
            expectedResolution: near.expiry,
          });
        }
      }
    }
  }
  
  return opportunities.sort((a, b) => b.edge - a.edge);
}

/**
 * Detect YES/NO imbalance (mispricing)
 */
export function detectImbalanceOpportunities(
  markets: AlternativeMarket[],
  modelProbabilities: Record<string, number>
): ArbitrageOpportunity[] {
  const opportunities: ArbitrageOpportunity[] = [];
  
  for (const market of markets) {
    const modelProb = modelProbabilities[market.event];
    if (!modelProb) continue;
    
    const marketProb = market.price;
    const edge = modelProb - marketProb;
    
    // Significant edge threshold
    if (Math.abs(edge) > 0.05) { // 5% edge
      const isYes = edge > 0;
      
      opportunities.push({
        id: `imbalance-${market.id}`,
        type: 'liquidity_imbalance',
        venueA: market,
        edge: Math.abs(edge),
        profitPotential: Math.abs(edge) * 1000,
        riskLevel: edge > 0.10 ? 'medium' : 'low',
        confidence: Math.min(95, 50 + Math.abs(edge) * 500),
        recommendedAction: isYes 
          ? `Buy YES @ ${market.price.toFixed(2)} (Model: ${modelProb.toFixed(2)})`
          : `Buy NO @ ${(1 - market.price).toFixed(2)} (Model: ${(1 - modelProb).toFixed(2)})`,
        maxStake: market.liquidity * 0.05,
        timeHorizon: 'expiry',
        detectedAt: new Date().toISOString(),
        expectedResolution: market.expiry,
      });
    }
  }
  
  return opportunities.sort((a, b) => b.edge - a.edge);
}

// Polymarket Special Strategies

/**
 * Detect liquidity sniping opportunities
 * Low liquidity contracts often misprice
 */
export function detectLiquiditySniping(
  markets: AlternativeMarket[],
  minLiquidity: number = 50000
): ArbitrageOpportunity[] {
  return markets
    .filter(m => m.liquidity < minLiquidity && m.liquidity > 10000)
    .filter(m => m.spread && m.spread > 0.02) // Wide spread indicates inefficiency
    .map(m => ({
      id: `liquidity-${m.id}`,
      type: 'liquidity_imbalance',
      venueA: m,
      edge: m.spread! * 0.5, // Half the spread as potential edge
      profitPotential: m.spread! * 500,
      riskLevel: 'high',
      confidence: 45,
      recommendedAction: `Snipe ${m.spread! > 0.05 ? 'aggressive' : 'passive'} - Wide spread (${(m.spread! * 100).toFixed(1)}%) on low liquidity (${(m.liquidity / 1000).toFixed(0)}k)`,
      maxStake: Math.min(500, m.liquidity * 0.01), // Very small
      timeHorizon: '24h',
      detectedAt: new Date().toISOString(),
      expectedResolution: m.expiry,
    }))
    .sort((a, b) => b.edge - a.edge);
}

/**
 * Event drift reversion strategy
 * Contracts tend to revert to mean near resolution
 */
export function detectDriftReversion(
  markets: AlternativeMarket[],
  priceHistory: Record<string, number[]>
): ArbitrageOpportunity[] {
  const opportunities: ArbitrageOpportunity[] = [];
  
  for (const market of markets) {
    const history = priceHistory[market.id];
    if (!history || history.length < 5) continue;
    
    // Calculate recent drift
    const recentAvg = history.slice(-3).reduce((a, b) => a + b, 0) / 3;
    const olderAvg = history.slice(0, 3).reduce((a, b) => a + b, 0) / 3;
    const drift = recentAvg - olderAvg;
    
    // Days until expiry
    const daysToExpiry = (new Date(market.expiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    
    // Reversion setup: significant drift with short time to expiry
    if (Math.abs(drift) > 0.10 && daysToExpiry < 7) {
      const revertDirection = drift > 0 ? 'DOWN' : 'UP';
      
      opportunities.push({
        id: `drift-${market.id}`,
        type: 'drift_reversion',
        venueA: market,
        edge: Math.abs(drift) * 0.5, // Conservative half-drift expectation
        profitPotential: Math.abs(drift) * 500,
        riskLevel: 'medium',
        confidence: 55,
        recommendedAction: `Reversion play: Expect price to revert ${revertDirection} from ${market.price.toFixed(2)} (drifted ${(drift * 100).toFixed(1)}%)`,
        maxStake: market.liquidity * 0.02,
        timeHorizon: `${Math.round(daysToExpiry)}d`,
        detectedAt: new Date().toISOString(),
        expectedResolution: market.expiry,
      });
    }
  }
  
  return opportunities.sort((a, b) => b.edge - a.edge);
}

// Cross-venue arbitrage

/**
 * Detect arbitrage between Kalshi and Polymarket
 */
export function detectCrossVenueArbitrage(
  kalshiMarkets: AlternativeMarket[],
  polymarketMarkets: AlternativeMarket[]
): ArbitrageOpportunity[] {
  const opportunities: ArbitrageOpportunity[] = [];
  
  // Match events between venues
  for (const k of kalshiMarkets) {
    const p = polymarketMarkets.find(pm => 
      pm.event.toLowerCase().includes(k.event.toLowerCase()) ||
      k.event.toLowerCase().includes(pm.event.toLowerCase())
    );
    
    if (!p) continue;
    
    // Both venues trade 0-1, check for price difference
    const priceDiff = k.price - p.price;
    
    if (Math.abs(priceDiff) > 0.03) { // 3% arbitrage threshold
      const buyVenue = priceDiff > 0 ? 'polymarket' : 'kalshi';
      const sellVenue = priceDiff > 0 ? 'kalshi' : 'polymarket';
      
      opportunities.push({
        id: `arb-${k.id}-${p.id}`,
        type: 'cross_venue',
        venueA: k,
        venueB: p,
        edge: Math.abs(priceDiff),
        profitPotential: Math.abs(priceDiff) * 1000,
        riskLevel: 'low',
        confidence: 80,
        recommendedAction: `Arbitrage: Buy YES on ${buyVenue} @ ${Math.min(k.price, p.price).toFixed(2)}, Sell on ${sellVenue} @ ${Math.max(k.price, p.price).toFixed(2)}`,
        maxStake: Math.min(k.liquidity, p.liquidity) * 0.05,
        timeHorizon: 'immediate',
        detectedAt: new Date().toISOString(),
        expectedResolution: k.expiry < p.expiry ? k.expiry : p.expiry,
      });
    }
  }
  
  return opportunities.sort((a, b) => b.edge - a.edge);
}

// Strategy aggregator

/**
 * Run all alternative market strategies
 */
export function runAlternativeStrategies(
  kalshiMarkets: AlternativeMarket[],
  polymarketMarkets: AlternativeMarket[],
  modelProbabilities: Record<string, number>,
  priceHistory: Record<string, number[]>
): ArbitrageOpportunity[] {
  const allOpportunities: ArbitrageOpportunity[] = [];
  
  // Kalshi strategies
  allOpportunities.push(...detectCalendarSpreadArbitrage(kalshiMarkets));
  allOpportunities.push(...detectImbalanceOpportunities(kalshiMarkets, modelProbabilities));
  
  // Polymarket strategies
  allOpportunities.push(...detectLiquiditySniping(polymarketMarkets));
  allOpportunities.push(...detectDriftReversion(polymarketMarkets, priceHistory));
  
  // Cross-venue
  allOpportunities.push(...detectCrossVenueArbitrage(kalshiMarkets, polymarketMarkets));
  
  // Sort by edge and confidence
  return allOpportunities
    .sort((a, b) => (b.edge * b.confidence) - (a.edge * a.confidence))
    .slice(0, 20); // Top 20
}

// Export utilities

export function formatOpportunity(opp: ArbitrageOpportunity): string {
  const emoji = opp.type === 'cross_venue' ? '⚡' : 
                opp.type === 'calendar_spread' ? '📅' :
                opp.type === 'liquidity_imbalance' ? '💧' : '🔄';
  
  return `${emoji} ${opp.type.replace('_', ' ')}: ${opp.venueA.event} - ${(opp.edge * 100).toFixed(1)}% edge`;
}

export function exportOpportunitiesCSV(opportunities: ArbitrageOpportunity[]): string {
  const headers = ['Type', 'Event', 'Edge %', 'Profit $', 'Risk', 'Confidence', 'Action', 'Max Stake'];
  
  const rows = opportunities.map(o => [
    o.type,
    o.venueA.event,
    (o.edge * 100).toFixed(2),
    o.profitPotential.toFixed(2),
    o.riskLevel,
    o.confidence.toFixed(0),
    o.recommendedAction,
    o.maxStake.toFixed(2),
  ]);
  
  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}
