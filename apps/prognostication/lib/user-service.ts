/**
 * USER SERVICE
 * Manages user authentication, tiers, and performance tracking
 */

import { supabase } from './supabase/client';
import Stripe from 'stripe';

// Types
export interface User {
  id: string;
  email: string;
  stripeCustomerId?: string;
  tier: 'free' | 'pro' | 'elite';
  tierExpiresAt?: Date;
  subscriptionId?: string;
  subscriptionStatus?: string;
  smsEnabled: boolean;
  phoneNumber?: string;
  createdAt: Date;
  lastLoginAt?: Date;
}

export interface UserPick {
  id: string;
  userId: string;
  gameId: string;
  sport: string;
  pickType: 'moneyline' | 'spread' | 'total';
  pickValue: string;
  confidencePct: number;
  edgePct?: number;
  result?: 'win' | 'loss' | 'push' | 'pending';
  betAmount?: number;
  tierAtPick: string;
  createdAt: Date;
}

export interface UserPerformance {
  totalPicks: number;
  wins: number;
  losses: number;
  pushes: number;
  winRate: number;
  roi: number;
  currentStreak: number;
  bestWinStreak: number;
  bySport: Record<string, { wins: number; losses: number; winRate: number }>;
}

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

/**
 * Get or create user by email
 */
export async function getOrCreateUser(email: string): Promise<User | null> {
  if (!email) return null;
  
  const normalizedEmail = email.toLowerCase().trim();
  
  // Try to find existing user
  const { data: existingUser, error: findError } = await supabase
    .from('users')
    .select('*')
    .eq('email', normalizedEmail)
    .single();
  
  if (existingUser) {
    return mapDbUserToUser(existingUser);
  }
  
  // Create new user
  const { data: newUser, error: createError } = await supabase
    .from('users')
    .insert({
      email: normalizedEmail,
      tier: 'free',
      sms_enabled: false,
    })
    .select()
    .single();
  
  if (createError) {
    console.error('Error creating user:', createError);
    return null;
  }
  
  return mapDbUserToUser(newUser);
}

/**
 * Get user by Stripe customer ID
 */
export async function getUserByStripeCustomer(customerId: string): Promise<User | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('stripe_customer_id', customerId)
    .single();
  
  if (error || !data) return null;
  return mapDbUserToUser(data);
}

/**
 * Update user tier from Stripe subscription
 */
export async function updateUserTierFromStripe(
  email: string,
  stripeCustomerId: string,
  subscriptionId: string,
  priceId: string
): Promise<User | null> {
  // Determine tier from price ID
  const tier = determineTierFromPriceId(priceId);
  
  // Calculate expiration (1 month for monthly, 1 week for weekly)
  const isWeekly = priceId.includes('weekly') || 
    priceId === process.env.NEXT_PUBLIC_STRIPE_PRO_WEEKLY_PRICE_ID ||
    priceId === process.env.NEXT_PUBLIC_STRIPE_ELITE_WEEKLY_PRICE_ID;
  
  const expiresAt = new Date();
  if (isWeekly) {
    expiresAt.setDate(expiresAt.getDate() + 7);
  } else {
    expiresAt.setMonth(expiresAt.getMonth() + 1);
  }
  
  const { data, error } = await supabase
    .from('users')
    .upsert({
      email: email.toLowerCase().trim(),
      stripe_customer_id: stripeCustomerId,
      subscription_id: subscriptionId,
      tier,
      tier_expires_at: expiresAt.toISOString(),
      subscription_status: 'active',
      billing_cycle: isWeekly ? 'weekly' : 'monthly',
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'email',
    })
    .select()
    .single();
  
  if (error) {
    console.error('Error updating user tier:', error);
    return null;
  }
  
  return mapDbUserToUser(data);
}

/**
 * Check user's current tier (validates against Stripe)
 */
export async function checkUserTier(email: string): Promise<{
  tier: 'free' | 'pro' | 'elite';
  hasAccess: boolean;
  expiresAt?: Date;
}> {
  const user = await getOrCreateUser(email);
  
  if (!user) {
    return { tier: 'free', hasAccess: false };
  }
  
  // Check if tier is expired
  if (user.tierExpiresAt && new Date(user.tierExpiresAt) < new Date()) {
    // Verify with Stripe
    if (stripe && user.stripeCustomerId) {
      try {
        const subscriptions = await stripe.subscriptions.list({
          customer: user.stripeCustomerId,
          status: 'active',
          limit: 1,
        });
        
        if (subscriptions.data.length === 0) {
          // Downgrade to free
          await supabase
            .from('users')
            .update({ tier: 'free', subscription_status: 'expired' })
            .eq('id', user.id);
          
          return { tier: 'free', hasAccess: false };
        }
      } catch (e) {
        console.error('Error checking Stripe subscription:', e);
      }
    }
  }
  
  return {
    tier: user.tier,
    hasAccess: user.tier !== 'free',
    expiresAt: user.tierExpiresAt,
  };
}

/**
 * Record a pick for a user
 */
export async function recordUserPick(
  userId: string,
  pick: {
    gameId: string;
    sport: string;
    pickType: 'moneyline' | 'spread' | 'total';
    pickValue: string;
    confidencePct: number;
    edgePct?: number;
    betAmount?: number;
  },
  tier: string
): Promise<UserPick | null> {
  const { data, error } = await supabase
    .from('user_picks')
    .insert({
      user_id: userId,
      pick_id: `${pick.gameId}-${Date.now()}`,
      game_id: pick.gameId,
      sport: pick.sport,
      pick_type: pick.pickType,
      pick_value: pick.pickValue,
      confidence_pct: pick.confidencePct,
      edge_pct: pick.edgePct,
      bet_amount: pick.betAmount,
      tier_at_pick: tier,
      result: 'pending',
    })
    .select()
    .single();
  
  if (error) {
    console.error('Error recording pick:', error);
    return null;
  }
  
  return mapDbPickToUserPick(data);
}

/**
 * Update pick result
 */
export async function updatePickResult(
  pickId: string,
  result: 'win' | 'loss' | 'push',
  actualScoreHome?: number,
  actualScoreAway?: number
): Promise<boolean> {
  const { error } = await supabase
    .from('user_picks')
    .update({
      result,
      actual_score_home: actualScoreHome,
      actual_score_away: actualScoreAway,
      settled_at: new Date().toISOString(),
    })
    .eq('id', pickId);
  
  return !error;
}

/**
 * Get user performance stats
 */
export async function getUserPerformance(
  userId: string,
  periodType: 'daily' | 'weekly' | 'monthly' | 'all_time' = 'all_time'
): Promise<UserPerformance> {
  const { data, error } = await supabase
    .from('user_performance')
    .select('*')
    .eq('user_id', userId)
    .eq('period_type', periodType)
    .order('period_start', { ascending: false })
    .limit(1)
    .single();
  
  if (error || !data) {
    // Calculate from picks directly
    return calculatePerformanceFromPicks(userId);
  }
  
  return {
    totalPicks: data.total_picks || 0,
    wins: data.wins || 0,
    losses: data.losses || 0,
    pushes: data.pushes || 0,
    winRate: data.win_rate || 0,
    roi: data.roi || 0,
    currentStreak: data.current_streak || 0,
    bestWinStreak: data.best_win_streak || 0,
    bySport: data.by_sport || {},
  };
}

/**
 * Calculate performance from picks directly
 */
async function calculatePerformanceFromPicks(userId: string): Promise<UserPerformance> {
  const { data: picks, error } = await supabase
    .from('user_picks')
    .select('*')
    .eq('user_id', userId)
    .not('result', 'is', null);
  
  if (error || !picks) {
    return {
      totalPicks: 0,
      wins: 0,
      losses: 0,
      pushes: 0,
      winRate: 0,
      roi: 0,
      currentStreak: 0,
      bestWinStreak: 0,
      bySport: {},
    };
  }
  
  const wins = picks.filter(p => p.result === 'win').length;
  const losses = picks.filter(p => p.result === 'loss').length;
  const pushes = picks.filter(p => p.result === 'push').length;
  const total = wins + losses;
  
  // Calculate by sport
  const bySport: Record<string, { wins: number; losses: number; winRate: number }> = {};
  for (const pick of picks) {
    if (!bySport[pick.sport]) {
      bySport[pick.sport] = { wins: 0, losses: 0, winRate: 0 };
    }
    if (pick.result === 'win') bySport[pick.sport].wins++;
    if (pick.result === 'loss') bySport[pick.sport].losses++;
  }
  for (const sport of Object.keys(bySport)) {
    const sportTotal = bySport[sport].wins + bySport[sport].losses;
    bySport[sport].winRate = sportTotal > 0 
      ? Math.round((bySport[sport].wins / sportTotal) * 100) 
      : 0;
  }
  
  // Calculate streak
  let currentStreak = 0;
  let bestWinStreak = 0;
  let tempWinStreak = 0;
  
  const sortedPicks = picks.sort((a, b) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  
  for (const pick of sortedPicks) {
    if (pick.result === 'win') {
      if (currentStreak >= 0) currentStreak++;
      else currentStreak = 1;
      tempWinStreak++;
      bestWinStreak = Math.max(bestWinStreak, tempWinStreak);
    } else if (pick.result === 'loss') {
      if (currentStreak <= 0) currentStreak--;
      else currentStreak = -1;
      tempWinStreak = 0;
    }
  }
  
  return {
    totalPicks: picks.length,
    wins,
    losses,
    pushes,
    winRate: total > 0 ? Math.round((wins / total) * 100) : 0,
    roi: 0, // Would need bet amounts to calculate
    currentStreak,
    bestWinStreak,
    bySport,
  };
}

// Helper functions
function determineTierFromPriceId(priceId: string): 'free' | 'pro' | 'elite' {
  const elitePriceIds = [
    process.env.NEXT_PUBLIC_STRIPE_ELITE_WEEKLY_PRICE_ID,
    process.env.NEXT_PUBLIC_STRIPE_ELITE_MONTHLY_PRICE_ID,
    process.env.NEXT_PUBLIC_STRIPE_ELITE_PRICE_ID,
  ].filter(Boolean);
  
  const proPriceIds = [
    process.env.NEXT_PUBLIC_STRIPE_PRO_WEEKLY_PRICE_ID,
    process.env.NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID,
    process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID,
  ].filter(Boolean);
  
  if (elitePriceIds.includes(priceId)) return 'elite';
  if (proPriceIds.includes(priceId)) return 'pro';
  return 'free';
}

function mapDbUserToUser(data: any): User {
  return {
    id: data.id,
    email: data.email,
    stripeCustomerId: data.stripe_customer_id,
    tier: data.tier || 'free',
    tierExpiresAt: data.tier_expires_at ? new Date(data.tier_expires_at) : undefined,
    subscriptionId: data.subscription_id,
    subscriptionStatus: data.subscription_status,
    smsEnabled: data.sms_enabled || false,
    phoneNumber: data.phone_number,
    createdAt: new Date(data.created_at),
    lastLoginAt: data.last_login_at ? new Date(data.last_login_at) : undefined,
  };
}

function mapDbPickToUserPick(data: any): UserPick {
  return {
    id: data.id,
    userId: data.user_id,
    gameId: data.game_id,
    sport: data.sport,
    pickType: data.pick_type,
    pickValue: data.pick_value,
    confidencePct: data.confidence_pct,
    edgePct: data.edge_pct,
    result: data.result,
    betAmount: data.bet_amount,
    tierAtPick: data.tier_at_pick,
    createdAt: new Date(data.created_at),
  };
}

