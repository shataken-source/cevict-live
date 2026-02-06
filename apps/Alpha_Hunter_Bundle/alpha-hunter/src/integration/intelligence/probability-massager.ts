/**
 * PROBABILITY MASSAGER
 * 10 Gemini commands to adjust probabilities based on market signals
 * 
 * CRYPTO (5):
 * - whale_splash: whales buying +12%, selling -12%
 * - exchange_flow: inflows -5%, outflows +5%
 * - beta_correlation: dampen alts when BTC weak
 * - liquidity_penalty: thin books -10%
 * - fear_greed: Fear<20 +8%, Greed>80 -8%
 * 
 * KALSHI (5):
 * - deadline_urgency: <3 days = 70% market trust
 * - bid_ask_spread: >10¢ spread = push to neutral
 * - smart_money_vol: high volume = follow direction
 * - conditional_prob: linked events boost each other
 * - poll_weighting: 60% model + 40% polls
 * 
 * [STATUS: NEW] - Production-ready probability adjustment
 */

export interface MassageResult {
  originalProbability: number;
  massagedProbability: number;
  adjustments: Array<{ command: string; adjustment: number; reason: string }>;
}

export interface CryptoMarketData {
  pair: string;
  price: number;
  volume24h?: number;
  change24h?: number;
  orderBookDepth?: number;
  exchangeInflows?: number;
  exchangeOutflows?: number;
  btcCorrelation?: number;
  btcPrice?: number;
  btcChange24h?: number;
  fearGreedIndex?: number;
  whaleBuyVolume?: number;
  whaleSellVolume?: number;
}

export interface KalshiMarketData {
  marketId: string;
  title: string;
  yesPrice: number;
  noPrice: number;
  bidAskSpread: number;
  volume?: number;
  expiresAt?: Date;
  daysUntilExpiry?: number;
  linkedMarkets?: string[];
  pollData?: {
    yesVotes: number;
    noVotes: number;
    totalVotes: number;
  };
}

export class ProbabilityMassager {
  /**
   * Massage crypto probability with 5 Gemini commands
   */
  massageCrypto(
    originalProbability: number,
    marketData: CryptoMarketData
  ): MassageResult {
    let massaged = originalProbability;
    const adjustments: Array<{ command: string; adjustment: number; reason: string }> = [];

    // 1. WHALE_SPLASH: whales buying +12%, selling -12%
    if (marketData.whaleBuyVolume && marketData.whaleSellVolume) {
      const whaleNet = marketData.whaleBuyVolume - marketData.whaleSellVolume;
      const whaleRatio = whaleNet / (marketData.whaleBuyVolume + marketData.whaleSellVolume);
      
      if (whaleRatio > 0.1) {
        // Whales buying heavily
        const adjustment = 12 * whaleRatio;
        massaged = Math.min(100, massaged + adjustment);
        adjustments.push({
          command: 'whale_splash',
          adjustment: +adjustment,
          reason: `Whales buying (net: ${(whaleRatio * 100).toFixed(1)}%)`,
        });
      } else if (whaleRatio < -0.1) {
        // Whales selling heavily
        const adjustment = 12 * Math.abs(whaleRatio);
        massaged = Math.max(0, massaged - adjustment);
        adjustments.push({
          command: 'whale_splash',
          adjustment: -adjustment,
          reason: `Whales selling (net: ${(whaleRatio * 100).toFixed(1)}%)`,
        });
      }
    }

    // 2. EXCHANGE_FLOW: inflows -5%, outflows +5%
    if (marketData.exchangeInflows !== undefined && marketData.exchangeOutflows !== undefined) {
      const netFlow = marketData.exchangeInflows - marketData.exchangeOutflows;
      const totalFlow = marketData.exchangeInflows + marketData.exchangeOutflows;
      
      if (totalFlow > 0) {
        const flowRatio = netFlow / totalFlow;
        
        if (flowRatio < -0.2) {
          // Significant outflows (people moving to exchanges = bearish)
          const adjustment = 5 * Math.abs(flowRatio);
          massaged = Math.min(100, massaged + adjustment);
          adjustments.push({
            command: 'exchange_flow',
            adjustment: +adjustment,
            reason: `Exchange outflows (${(flowRatio * 100).toFixed(1)}%)`,
          });
        } else if (flowRatio > 0.2) {
          // Significant inflows (people moving from exchanges = bullish)
          const adjustment = -5 * flowRatio;
          massaged = Math.max(0, massaged - adjustment);
          adjustments.push({
            command: 'exchange_flow',
            adjustment: -adjustment,
            reason: `Exchange inflows (${(flowRatio * 100).toFixed(1)}%)`,
          });
        }
      }
    }

    // 3. BETA_CORRELATION: dampen alts when BTC weak
    if (marketData.pair !== 'BTC-USD' && marketData.btcCorrelation && marketData.btcChange24h !== undefined) {
      const btcWeak = marketData.btcChange24h < -2; // BTC down >2%
      const correlation = marketData.btcCorrelation;
      
      if (btcWeak && correlation > 0.7) {
        // High correlation alt, BTC weak = dampen probability
        const dampening = (correlation - 0.7) * 10; // Up to 3% dampening for 1.0 correlation
        massaged = Math.max(0, massaged - dampening);
        adjustments.push({
          command: 'beta_correlation',
          adjustment: -dampening,
          reason: `BTC weak (${marketData.btcChange24h.toFixed(1)}%), high correlation (${(correlation * 100).toFixed(0)}%)`,
        });
      }
    }

    // 4. LIQUIDITY_PENALTY: thin books -10%
    if (marketData.orderBookDepth !== undefined) {
      const thinBook = marketData.orderBookDepth < 10000; // Less than $10k depth
      
      if (thinBook) {
        const penalty = 10 * (1 - marketData.orderBookDepth / 10000); // Up to 10% penalty
        massaged = Math.max(0, massaged - penalty);
        adjustments.push({
          command: 'liquidity_penalty',
          adjustment: -penalty,
          reason: `Thin order book ($${marketData.orderBookDepth.toLocaleString()} depth)`,
        });
      }
    }

    // 5. FEAR_GREED: Fear<20 +8%, Greed>80 -8%
    if (marketData.fearGreedIndex !== undefined) {
      if (marketData.fearGreedIndex < 20) {
        // Extreme fear = buying opportunity
        const adjustment = 8 * (1 - marketData.fearGreedIndex / 20); // Up to 8%
        massaged = Math.min(100, massaged + adjustment);
        adjustments.push({
          command: 'fear_greed',
          adjustment: +adjustment,
          reason: `Extreme fear (${marketData.fearGreedIndex})`,
        });
      } else if (marketData.fearGreedIndex > 80) {
        // Extreme greed = selling opportunity
        const adjustment = 8 * ((marketData.fearGreedIndex - 80) / 20); // Up to 8%
        massaged = Math.max(0, massaged - adjustment);
        adjustments.push({
          command: 'fear_greed',
          adjustment: -adjustment,
          reason: `Extreme greed (${marketData.fearGreedIndex})`,
        });
      }
    }

    // Clamp to 0-100
    massaged = Math.max(0, Math.min(100, massaged));

    return {
      originalProbability,
      massagedProbability: massaged,
      adjustments,
    };
  }

  /**
   * Massage Kalshi probability with 5 Gemini commands
   */
  massageKalshi(
    originalProbability: number,
    marketData: KalshiMarketData
  ): MassageResult {
    let massaged = originalProbability;
    const adjustments: Array<{ command: string; adjustment: number; reason: string }> = [];

    // 1. DEADLINE_URGENCY: <3 days = 70% market trust
    if (marketData.daysUntilExpiry !== undefined && marketData.daysUntilExpiry < 3) {
      // When close to deadline, trust market price more (move toward 50%)
      const marketPrice = marketData.yesPrice / 100; // Convert cents to 0-1
      const trustWeight = 0.7; // 70% trust in market
      const modelWeight = 1 - trustWeight; // 30% trust in model
      
      const marketAdjusted = (marketPrice * trustWeight) + (originalProbability / 100 * modelWeight);
      const adjustment = (marketAdjusted * 100) - originalProbability;
      
      massaged = marketAdjusted * 100;
      adjustments.push({
        command: 'deadline_urgency',
        adjustment,
        reason: `Deadline <3 days (${marketData.daysUntilExpiry}), trusting market (70%)`,
      });
    }

    // 2. BID_ASK_SPREAD: >10¢ spread = push to neutral
    if (marketData.bidAskSpread > 10) {
      // Wide spread = uncertainty, push toward 50%
      const neutral = 50;
      const spreadFactor = Math.min(1, (marketData.bidAskSpread - 10) / 20); // 0-1 factor for 10-30¢ spread
      const pushToNeutral = (neutral - originalProbability) * spreadFactor * 0.5; // Up to 50% of distance
      
      massaged = originalProbability + pushToNeutral;
      adjustments.push({
        command: 'bid_ask_spread',
        adjustment: pushToNeutral,
        reason: `Wide spread (${marketData.bidAskSpread}¢), pushing toward neutral`,
      });
    }

    // 3. SMART_MONEY_VOL: high volume = follow direction
    if (marketData.volume !== undefined) {
      const highVolume = marketData.volume > 10000; // Arbitrary threshold
      
      if (highVolume) {
        // High volume = smart money active, trust market direction
        const marketPrice = marketData.yesPrice / 100;
        const volumeWeight = Math.min(0.3, marketData.volume / 100000); // Up to 30% weight
        const marketDirection = marketPrice > 0.5 ? 1 : -1; // Above 50% = bullish, below = bearish
        
        const adjustment = marketDirection * volumeWeight * 10; // Up to 3% adjustment
        massaged = massaged + adjustment;
        adjustments.push({
          command: 'smart_money_vol',
          adjustment,
          reason: `High volume (${marketData.volume.toLocaleString()}), following smart money direction`,
        });
      }
    }

    // 4. CONDITIONAL_PROB: linked events boost each other
    if (marketData.linkedMarkets && marketData.linkedMarkets.length > 0) {
      // If we have linked markets, boost probability slightly
      // (Simplified: assume linked markets increase confidence)
      const boost = Math.min(5, marketData.linkedMarkets.length * 1); // Up to 5% boost
      massaged = Math.min(100, massaged + boost);
      adjustments.push({
        command: 'conditional_prob',
        adjustment: +boost,
        reason: `Linked events (${marketData.linkedMarkets.length} markets) boost confidence`,
      });
    }

    // 5. POLL_WEIGHTING: 60% model + 40% polls
    if (marketData.pollData) {
      const pollYes = marketData.pollData.yesVotes;
      const pollNo = marketData.pollData.noVotes;
      const totalVotes = marketData.pollData.totalVotes;
      
      if (totalVotes > 0) {
        const pollProbability = (pollYes / totalVotes) * 100;
        const modelWeight = 0.6; // 60% model
        const pollWeight = 0.4; // 40% polls
        
        const weighted = (originalProbability * modelWeight) + (pollProbability * pollWeight);
        const adjustment = weighted - originalProbability;
        
        massaged = weighted;
        adjustments.push({
          command: 'poll_weighting',
          adjustment,
          reason: `Poll data: ${pollYes}/${totalVotes} (${pollProbability.toFixed(1)}%), weighted 60/40`,
        });
      }
    }

    // Clamp to 0-100
    massaged = Math.max(0, Math.min(100, massaged));

    return {
      originalProbability,
      massagedProbability: massaged,
      adjustments,
    };
  }

  /**
   * Format adjustment log
   */
  formatLog(result: MassageResult, asset: string): string {
    const adjustmentsStr = result.adjustments.length > 0
      ? result.adjustments.map(a => `${a.command}: ${a.adjustment >= 0 ? '+' : ''}${a.adjustment.toFixed(1)}%`).join(', ')
      : 'no adjustments';
    
    return `Raw: ${result.originalProbability.toFixed(1)}% → Massaged: ${result.massagedProbability.toFixed(1)}% (${adjustmentsStr})`;
  }

  /**
   * Get detailed adjustment messages for logging
   */
  getAdjustmentMessages(result: MassageResult): string[] {
    return result.adjustments.map(a => {
      const emoji = this.getCommandEmoji(a.command);
      return `${emoji} ${a.reason}`;
    });
  }

  /**
   * Get emoji for command
   */
  private getCommandEmoji(command: string): string {
    const emojiMap: Record<string, string> = {
      'whale_splash': '🐋',
      'exchange_flow': '🌊',
      'beta_correlation': '🔗',
      'liquidity_penalty': '💧',
      'fear_greed': '😱',
      'deadline_urgency': '⏳',
      'bid_ask_spread': '↔️',
      'smart_money_vol': '📡',
      'conditional_prob': '🔗',
      'poll_weighting': '🗳️',
    };
    return emojiMap[command] || '📊';
  }
}

