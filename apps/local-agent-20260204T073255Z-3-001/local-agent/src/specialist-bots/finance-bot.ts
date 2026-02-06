/**
 * Finance Bot
 * Specialist in business finance, pricing, revenue, and financial planning
 */

import { BaseBot, BotConfig } from './base-bot.js';

const config: BotConfig = {
  name: 'Finn (Finance)',
  specialty: 'Business Finance, Pricing Strategy, Revenue Optimization',
  systemPrompt: `You are Finn, an expert finance AI assistant specializing in:
- SaaS Business Models
- Pricing Strategy
- Revenue Optimization
- Unit Economics
- Financial Forecasting
- Subscription Metrics (MRR, ARR, Churn)
- Cost Analysis
- Fundraising and Valuation
- Tax Considerations for Online Businesses
- Affiliate Revenue

DISCLAIMER: You provide financial information, not financial advice. Users should consult a financial professional for specific situations.

You help optimize revenue, understand metrics, and make data-driven financial decisions.
You stay current with SaaS industry benchmarks and financial best practices.`,
  learningTopics: [
    'SaaS pricing strategies',
    'Subscription business metrics',
    'Revenue optimization techniques',
    'Online business tax considerations',
    'Affiliate marketing economics',
    'Betting industry revenue models',
    'Payment processing optimization',
    'Financial forecasting methods',
  ],
  dailyTasks: [
    'Review revenue metrics',
    'Analyze pricing opportunities',
    'Check payment processing costs',
    'Monitor industry benchmarks',
  ],
};

export class FinanceBot extends BaseBot {
  constructor() {
    super(config);
  }

  protected async executeTask(task: string): Promise<string> {
    switch (task) {
      case 'Review revenue metrics':
        return this.reviewMetrics();
      case 'Analyze pricing opportunities':
        return this.analyzePricing();
      case 'Check payment processing costs':
        return this.checkPaymentCosts();
      case 'Monitor industry benchmarks':
        return this.checkBenchmarks();
      default:
        return this.ask(task);
    }
  }

  private async reviewMetrics(): Promise<string> {
    return this.ask(`What are the key revenue metrics for a SaaS/subscription business?
Include:
1. MRR/ARR calculation
2. Churn rate analysis
3. LTV calculation
4. CAC and LTV:CAC ratio
5. Net Revenue Retention
6. ARPU tracking
Provide formulas and benchmarks.`);
  }

  private async analyzePricing(): Promise<string> {
    return this.ask(`Analyze pricing strategies for a sports prediction subscription service.
Consider:
1. Freemium vs. paid only
2. Tier structure (Free, Pro, Elite)
3. Annual vs. monthly pricing
4. Price anchoring
5. Competitor pricing
6. Value-based pricing`);
  }

  private async checkPaymentCosts(): Promise<string> {
    return this.ask(`How to optimize payment processing costs?
Compare:
1. Stripe pricing
2. PayPal fees
3. Alternative processors
4. Reducing chargebacks
5. International payments
6. Subscription billing optimization`);
  }

  private async checkBenchmarks(): Promise<string> {
    return this.ask(`What are current SaaS industry benchmarks?
Include:
1. Average churn rates
2. LTV:CAC ratios
3. Net Revenue Retention
4. Gross margins
5. Growth rates by stage`);
  }

  /**
   * Create pricing strategy
   */
  async createPricingStrategy(product: string, market: string): Promise<string> {
    return this.ask(`Create a pricing strategy for: ${product}
Market: ${market}

Include:
1. Pricing tiers and features
2. Price points with justification
3. Discount strategy
4. Annual vs. monthly
5. Enterprise pricing
6. Competitor comparison`);
  }

  /**
   * Calculate unit economics
   */
  async calculateUnitEconomics(data: string): Promise<string> {
    return this.ask(`Calculate unit economics from this data:
${data}

Provide:
1. LTV calculation
2. CAC calculation
3. LTV:CAC ratio
4. Payback period
5. Analysis and recommendations`);
  }

  /**
   * Revenue forecast
   */
  async createRevenueForecast(current: string, assumptions: string): Promise<string> {
    return this.ask(`Create a 12-month revenue forecast:
Current state: ${current}
Assumptions: ${assumptions}

Include:
1. Monthly projections
2. Best/worst/expected scenarios
3. Key drivers
4. Sensitivity analysis`);
  }

  /**
   * Analyze affiliate economics
   */
  async analyzeAffiliateEconomics(program: string): Promise<string> {
    return this.ask(`Analyze affiliate economics for: ${program}
Include:
1. Commission structures
2. EPC calculations
3. Conversion optimization
4. Compliance costs
5. Net revenue analysis`);
  }
}

