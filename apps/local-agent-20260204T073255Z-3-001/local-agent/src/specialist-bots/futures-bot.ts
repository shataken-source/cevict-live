/**
 * Futures Bot
 * Specialist in futures trading, commodities, and futures strategies
 */

import { BaseBot, BotConfig } from './base-bot.js';

const config: BotConfig = {
  name: 'Future (Futures)',
  specialty: 'Futures Trading, Commodities, Index Futures, Currency Futures',
  systemPrompt: `You are Future, an expert futures trading AI assistant specializing in:
- Futures Trading Strategies
- Commodity Futures (Energy, Metals, Agriculture, Livestock)
- Index Futures (S&P 500, NASDAQ, Dow, Russell)
- Currency Futures (FX Futures)
- Interest Rate Futures (Treasury, Eurodollar)
- Futures Spread Trading (Calendar, Inter-commodity, Inter-market)
- Basis Trading
- Contango and Backwardation
- Futures Arbitrage
- Margin Requirements and Position Sizing
- Roll Strategies
- Futures Options
- Micro Futures
- E-mini and E-micro Contracts
- Risk Management for Futures
- Futures Portfolio Management

DISCLAIMER: You provide educational information about futures trading, not trading advice. Futures trading involves significant risk including leverage. Users should consult a licensed financial professional.

You help develop futures strategies, analyze basis relationships, understand contango/backwardation, and identify opportunities. You stay current with futures market trends, commodity fundamentals, and regulatory changes.`,
  learningTopics: [
    'Futures market structure',
    'Commodity fundamentals',
    'Basis trading strategies',
    'Contango and backwardation dynamics',
    'Futures arbitrage',
    'Spread trading techniques',
    'Futures roll strategies',
    'Margin and leverage management',
    'Futures on different asset classes',
    'Regulatory changes in futures',
    'Futures market microstructure',
    'Seasonal patterns in commodities',
  ],
  dailyTasks: [
    'Analyze futures market opportunities',
    'Review basis relationships',
    'Monitor contango/backwardation',
    'Identify spread opportunities',
  ],
};

export class FuturesBot extends BaseBot {
  constructor() {
    super(config);
  }

  protected async executeTask(task: string): Promise<string> {
    switch (task) {
      case 'Analyze futures market opportunities':
        return this.analyzeOpportunities();
      case 'Review basis relationships':
        return this.reviewBasis();
      case 'Monitor contango/backwardation':
        return this.analyzeTermStructure();
      case 'Identify spread opportunities':
        return this.findSpreads();
      default:
        return this.ask(task);
    }
  }

  private async analyzeOpportunities(): Promise<string> {
    return this.ask(`What are current opportunities in futures markets?
Include:
1. Commodity futures trends
2. Index futures opportunities
3. Currency futures setups
4. Interest rate futures plays
5. Micro futures opportunities
6. Cross-asset opportunities`);
  }

  private async reviewBasis(): Promise<string> {
    return this.ask(`Analyze current basis relationships in futures markets.
Include:
1. Cash-futures basis
2. Calendar spreads
3. Inter-commodity spreads
4. Inter-market spreads
5. Basis trading opportunities
6. Convergence patterns`);
  }

  private async analyzeTermStructure(): Promise<string> {
    return this.ask(`Analyze contango and backwardation in futures markets.
Include:
1. Current term structure patterns
2. Contango opportunities
3. Backwardation opportunities
4. Roll yield analysis
5. Storage cost implications
6. Carry trade opportunities`);
  }

  private async findSpreads(): Promise<string> {
    return this.ask(`Identify futures spread trading opportunities.
Include:
1. Calendar spread opportunities
2. Inter-commodity spreads
3. Inter-market spreads
4. Crack spreads (energy)
5. Crush spreads (agriculture)
6. Spark spreads (power)`);
  }

  /**
   * Design futures strategy
   */
  async designStrategy(objective: string, marketView: string, assetClass: string): Promise<string> {
    return this.ask(`Design a futures trading strategy:
Objective: ${objective}
Market View: ${marketView}
Asset Class: ${assetClass}

Include:
1. Recommended contracts
2. Position sizing
3. Entry and exit criteria
4. Risk management
5. Margin requirements
6. Roll strategy`);
  }

  /**
   * Analyze futures arbitrage
   */
  async analyzeArbitrage(futures: string, cash: string): Promise<string> {
    return this.ask(`Analyze futures arbitrage opportunity:
Futures: ${futures}
Cash: ${cash}

Include:
1. Basis calculation
2. Arbitrage profit potential
3. Transaction costs
4. Execution strategy
5. Risk factors
6. Optimal timing`);
  }

  /**
   * Calculate roll strategy
   */
  async calculateRollStrategy(contract: string, currentMonth: string, nextMonth: string): Promise<string> {
    return this.ask(`Calculate optimal roll strategy:
Contract: ${contract}
Current Month: ${currentMonth}
Next Month: ${nextMonth}

Include:
1. Roll cost analysis
2. Optimal roll timing
3. Contango/backwardation impact
4. Alternative roll strategies
5. Tax considerations
6. Execution plan`);
  }

  /**
   * Analyze commodity fundamentals
   */
  async analyzeCommodityFundamentals(commodity: string, factors: string): Promise<string> {
    return this.ask(`Analyze commodity fundamentals for futures trading:
Commodity: ${commodity}
Key Factors: ${factors}

Include:
1. Supply and demand analysis
2. Seasonal patterns
3. Storage and inventory
4. Geopolitical factors
5. Weather impacts
6. Futures price implications`);
  }
}

