/**
 * Bargain Bot
 * Specialist in saving money, finding deals, and maximizing existing resources
 */

import { BaseBot, BotConfig } from './base-bot.js';

const config: BotConfig = {
  name: 'Penny (Savings)',
  specialty: 'Bargain Hunting, Cost Savings, Resource Optimization',
  systemPrompt: `You are Penny, an expert savings and bargain hunting AI assistant specializing in:
- Price Comparison and Deal Finding
- Coupon and Cashback Strategies
- Subscription Optimization
- Utility Bill Reduction
- Insurance Savings
- Credit Card Rewards Optimization
- Bulk Buying Strategies
- DIY vs Buy Analysis
- Repair vs Replace Decisions
- Free and Low-Cost Alternatives
- Seasonal Buying Strategies
- Negotiation Tactics
- Warranty and Return Maximization
- Existing Resource Utilization

You help save money using existing resources and smart strategies.
You stay current with deals, savings techniques, and frugal living tips.
You focus on SAVING money, not making money - maximizing what you already have.`,
  learningTopics: [
    'Credit card rewards optimization',
    'Subscription audit techniques',
    'Utility rate negotiation',
    'Insurance comparison strategies',
    'Seasonal sale calendars',
    'Cashback stacking methods',
    'DIY repair resources',
    'Free software alternatives',
  ],
  dailyTasks: [
    'Review current best deals and coupons',
    'Check subscription optimization tips',
    'Monitor utility saving strategies',
    'Update price comparison resources',
  ],
};

export class BargainBot extends BaseBot {
  constructor() {
    super(config);
  }

  protected async executeTask(task: string): Promise<string> {
    switch (task) {
      case 'Review current best deals and coupons':
        return this.reviewDeals();
      case 'Check subscription optimization tips':
        return this.checkSubscriptions();
      case 'Monitor utility saving strategies':
        return this.monitorUtilities();
      case 'Update price comparison resources':
        return this.updatePriceTools();
      default:
        return this.ask(task);
    }
  }

  private async reviewDeals(): Promise<string> {
    return this.ask(`What are current deal-finding strategies?
Include:
1. Best deal aggregator sites
2. Browser extensions for savings
3. Cashback stacking techniques
4. Seasonal buying tips`);
  }

  private async checkSubscriptions(): Promise<string> {
    return this.ask(`How to optimize subscriptions?
Cover:
1. Audit techniques
2. Negotiation scripts
3. Alternatives to common subscriptions
4. Family/group plan strategies`);
  }

  private async monitorUtilities(): Promise<string> {
    return this.ask(`How to reduce utility bills?
Include:
1. Electricity savings
2. Water conservation
3. Internet/phone negotiation
4. Smart device savings`);
  }

  private async updatePriceTools(): Promise<string> {
    return this.ask(`What are the best price comparison tools?
Cover:
1. Browser extensions
2. Price tracking sites
3. Coupon aggregators
4. Cashback platforms`);
  }

  /**
   * Audit expenses
   */
  async auditExpenses(expenses: string): Promise<string> {
    return this.ask(`Audit these expenses for savings opportunities:
${expenses}

Provide:
1. Immediate cuts possible
2. Negotiation opportunities
3. Cheaper alternatives
4. Subscription redundancies
5. Estimated monthly savings
6. Priority order for changes`);
  }

  /**
   * Find cheaper alternative
   */
  async findAlternative(item: string, budget: string, requirements: string): Promise<string> {
    return this.ask(`Find cheaper alternative:
Item/Service: ${item}
Budget: ${budget}
Must-have Features: ${requirements}

Provide:
1. Budget alternatives
2. Free alternatives
3. DIY options
4. Used/refurbished sources
5. Price comparison
6. Quality tradeoffs`);
  }

  /**
   * Negotiate bill
   */
  async negotiateBill(billType: string, currentAmount: string, provider: string): Promise<string> {
    return this.ask(`How to negotiate this bill:
Bill Type: ${billType}
Current Amount: ${currentAmount}
Provider: ${provider}

Provide:
1. Negotiation script
2. Competitor rates to mention
3. Retention department tips
4. Best time to call
5. Realistic savings target
6. Alternative providers
7. Loyalty discount requests`);
  }

  /**
   * Maximize credit card rewards
   */
  async optimizeRewards(spendingCategories: string, currentCards: string): Promise<string> {
    return this.ask(`Optimize credit card rewards:
Monthly Spending Categories: ${spendingCategories}
Current Cards: ${currentCards}

Provide:
1. Category optimization strategy
2. Stacking opportunities
3. Sign-up bonus targets
4. Annual fee analysis
5. Points/cashback maximization
6. Downgrade vs cancel strategy`);
  }

  /**
   * Repair vs replace analysis
   */
  async repairOrReplace(item: string, age: string, repairCost: string): Promise<string> {
    return this.ask(`Should I repair or replace:
Item: ${item}
Age: ${age}
Estimated Repair Cost: ${repairCost}

Analyze:
1. Expected lifespan remaining
2. Repair cost vs replacement
3. DIY repair possibility
4. Parts availability
5. Energy efficiency comparison
6. Recommendation with reasoning`);
  }

  /**
   * Seasonal buying guide
   */
  async seasonalBuying(items: string): Promise<string> {
    return this.ask(`When is the best time to buy:
Items: ${items}

Provide:
1. Best months for each item
2. Sale events to watch
3. Off-season opportunities
4. Price tracking recommendations
5. Current deals if applicable`);
  }

  /**
   * Maximize existing resources
   */
  async maximizeResources(resources: string, goal: string): Promise<string> {
    return this.ask(`How to maximize existing resources:
What I Have: ${resources}
Goal: ${goal}

Provide:
1. Ways to use what you have
2. Repurposing ideas
3. Sharing/borrowing options
4. DIY solutions
5. Free resources available
6. Community resources`);
  }

  /**
   * Free alternatives finder
   */
  async freeAlternatives(paidService: string): Promise<string> {
    return this.ask(`Find free alternatives to: ${paidService}

Provide:
1. Completely free options
2. Freemium alternatives
3. Open source options
4. Library/community resources
5. Trial stacking strategies
6. Feature comparison
7. Limitations to consider`);
  }
}

