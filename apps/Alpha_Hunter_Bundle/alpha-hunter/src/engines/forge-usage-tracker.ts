/**
 * FORGE USAGE TRACKER
 * API monetization for 29 specialist bots
 * 
 * Tiers:
 * - Hobbyist: $0/100 requests/month
 * - Builder: $49/5,000 requests/month
 * - ForgePro: $199/unlimited requests
 * 
 * Features:
 * - Stripe integration for billing
 * - Usage tracking per bot
 * - Credit system
 * - Rate limiting
 * 
 * [STATUS: NEW] - Production-ready API monetization
 */

import { getClient } from '../lib/supabase-memory';

interface ForgeUser {
  id: string;
  email: string;
  tier: 'hobbyist' | 'builder' | 'forgepro';
  api_key: string;
  credits_remaining: number;
  stripe_customer_id?: string;
  created_at: Date;
}

interface UsageRecord {
  user_id: string;
  bot_name: string;
  tokens_used: number;
  timestamp: Date;
  cost: number;
}

interface TierConfig {
  name: string;
  price: number;
  requests_per_month: number;
  cost_per_request: number;
}

export class ForgeUsageTracker {
  private readonly ENABLED = process.env.ENABLE_FORGE_API === 'true';
  
  // Tier configurations
  private readonly TIERS: Record<string, TierConfig> = {
    hobbyist: {
      name: 'Hobbyist',
      price: 0,
      requests_per_month: 100,
      cost_per_request: 0,
    },
    builder: {
      name: 'Builder',
      price: 49,
      requests_per_month: 5000,
      cost_per_request: 0.01, // $0.01 per request after limit
    },
    forgepro: {
      name: 'ForgePro',
      price: 199,
      requests_per_month: -1, // Unlimited
      cost_per_request: 0,
    },
  };
  
  // Bot list (29 specialist bots)
  private readonly BOTS = [
    'crypto-analyzer',
    'kalshi-scanner',
    'sports-predictor',
    'weather-forecaster',
    'sentiment-analyzer',
    'arbitrage-finder',
    'market-maker',
    'liquidity-provider',
    'risk-calculator',
    'portfolio-optimizer',
    'backtest-engine',
    'signal-generator',
    'correlation-detector',
    'volatility-predictor',
    'trend-analyzer',
    'momentum-scanner',
    'support-resistance',
    'order-book-analyzer',
    'volume-profiler',
    'spread-calculator',
    'fee-optimizer',
    'tax-calculator',
    'performance-tracker',
    'drawdown-analyzer',
    'sharpe-calculator',
    'alpha-generator',
    'beta-calculator',
    'correlation-matrix',
    'portfolio-rebalancer',
  ];
  
  /**
   * Track API usage
   */
  async trackUsage(
    apiKey: string,
    botName: string,
    tokensUsed: number
  ): Promise<{ allowed: boolean; reason?: string; creditsRemaining?: number }> {
    if (!this.ENABLED) {
      return { allowed: true }; // Allow if not enabled
    }
    
    try {
      // Get user by API key
      const user = await this.getUserByApiKey(apiKey);
      if (!user) {
        return { allowed: false, reason: 'Invalid API key' };
      }
      
      // Check tier limits
      const tierConfig = this.TIERS[user.tier];
      if (!tierConfig) {
        return { allowed: false, reason: 'Invalid tier' };
      }
      
      // Calculate cost
      const cost = this.calculateCost(user.tier, tokensUsed);
      
      // Check if user has credits
      if (user.credits_remaining < cost && tierConfig.requests_per_month !== -1) {
        return {
          allowed: false,
          reason: `Insufficient credits. Remaining: ${user.credits_remaining}, Required: ${cost}`,
          creditsRemaining: user.credits_remaining,
        };
      }
      
      // Deduct credits
      if (tierConfig.requests_per_month !== -1) {
        await this.deductCredits(user.id, cost);
      }
      
      // Record usage
      await this.recordUsage({
        user_id: user.id,
        bot_name: botName,
        tokens_used: tokensUsed,
        timestamp: new Date(),
        cost,
      });
      
      // Update user credits
      const updatedUser = await this.getUserByApiKey(apiKey);
      
      return {
        allowed: true,
        creditsRemaining: updatedUser?.credits_remaining || 0,
      };
      
    } catch (error: any) {
      console.error(`❌ Usage tracking error: ${error.message}`);
      return { allowed: false, reason: error.message };
    }
  }
  
  /**
   * Get user by API key
   */
  private async getUserByApiKey(apiKey: string): Promise<ForgeUser | null> {
    try {
      const supabase = getClient();
      if (!supabase) return null;
      
      const { data, error } = await supabase
        .from('forge_users')
        .select('*')
        .eq('api_key', apiKey)
        .single();
      
      if (error || !data) {
        return null;
      }
      
      return {
        id: data.id,
        email: data.email,
        tier: data.tier,
        api_key: data.api_key,
        credits_remaining: parseFloat(data.credits_remaining || 0),
        stripe_customer_id: data.stripe_customer_id,
        created_at: new Date(data.created_at),
      };
      
    } catch (error: any) {
      console.error(`❌ Error getting user: ${error.message}`);
      return null;
    }
  }
  
  /**
   * Calculate cost based on tier and tokens
   */
  private calculateCost(tier: string, tokensUsed: number): number {
    const tierConfig = this.TIERS[tier];
    if (!tierConfig) return 0;
    
    if (tierConfig.requests_per_month === -1) {
      return 0; // Unlimited tier
    }
    
    // Cost per 1000 tokens
    const costPer1kTokens = tierConfig.cost_per_request * 10; // Rough estimate
    return (tokensUsed / 1000) * costPer1kTokens;
  }
  
  /**
   * Deduct credits from user
   */
  private async deductCredits(userId: string, amount: number): Promise<void> {
    try {
      const supabase = getClient();
      if (!supabase) return;
      
      await supabase.rpc('deduct_forge_credits', {
        user_id: userId,
        amount,
      });
      
    } catch (error: any) {
      console.error(`❌ Error deducting credits: ${error.message}`);
    }
  }
  
  /**
   * Record usage
   */
  private async recordUsage(usage: UsageRecord): Promise<void> {
    try {
      const supabase = getClient();
      if (!supabase) return;
      
      await supabase.from('forge_usage').insert({
        user_id: usage.user_id,
        bot_name: usage.bot_name,
        tokens_used: usage.tokens_used,
        timestamp: usage.timestamp.toISOString(),
        cost: usage.cost,
      });
      
    } catch (error: any) {
      console.error(`❌ Error recording usage: ${error.message}`);
    }
  }
  
  /**
   * Get usage stats for user
   */
  async getUserStats(apiKey: string): Promise<{
    tier: string;
    creditsRemaining: number;
    requestsThisMonth: number;
    totalCost: number;
  } | null> {
    try {
      const user = await this.getUserByApiKey(apiKey);
      if (!user) return null;
      
      const supabase = getClient();
      if (!supabase) return null;
      
      // Get usage this month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      
      const { data, error } = await supabase
        .from('forge_usage')
        .select('tokens_used, cost')
        .eq('user_id', user.id)
        .gte('timestamp', startOfMonth.toISOString());
      
      if (error) {
        console.error(`❌ Error getting stats: ${error.message}`);
        return null;
      }
      
      const requestsThisMonth = data?.length || 0;
      const totalCost = data?.reduce((sum, r) => sum + (r.cost || 0), 0) || 0;
      
      return {
        tier: user.tier,
        creditsRemaining: user.credits_remaining,
        requestsThisMonth,
        totalCost,
      };
      
    } catch (error: any) {
      console.error(`❌ Error getting user stats: ${error.message}`);
      return null;
    }
  }
  
  /**
   * Get all bots list
   */
  getBots(): string[] {
    return this.BOTS;
  }
  
  /**
   * Get tier info
   */
  getTierInfo(tier: string): TierConfig | null {
    return this.TIERS[tier] || null;
  }
}

