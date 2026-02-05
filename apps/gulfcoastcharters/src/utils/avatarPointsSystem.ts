import { supabase } from '@/lib/supabase';

/**
 * Enterprise Avatar Points System
 * Manages point awards, deductions, and transaction logging
 */

interface PointTransaction {
  userId: string;
  amount: number;
  reason: string;
  metadata?: Record<string, unknown>;

}

export const POINT_REWARDS = {
  PHOTO_UPLOAD: 5,
  REVIEW_WRITTEN: 3,
  BOOKING_COMPLETED: 10,
  REFERRAL: 20,
  DAILY_LOGIN: 1,
  PROFILE_COMPLETE: 15,
  FIRST_BOOKING: 25,
  CONTEST_WIN: 50,
  MONTHLY_ACTIVE: 30
};

/**
 * Award points to a user with transaction logging
 */
export async function awardPoints({ userId, amount, reason, metadata }: PointTransaction) {
  try {
    // Get current points
    const { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select('points')
      .eq('id', userId)
      .single();

    if (fetchError) throw fetchError;

    const currentPoints = profile?.points || 0;
    const newPoints = currentPoints + amount;

    // Update points
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ points: newPoints })
      .eq('id', userId);

    if (updateError) throw updateError;

    // Log transaction
    await supabase.from('avatar_purchase_log').insert({
      user_id: userId,
      points_spent: -amount, // Negative for earning
      transaction_type: 'earned',
      metadata: { reason, ...metadata }
    });

    // Analytics
    await supabase.from('avatar_analytics').insert({
      event_type: 'points_earned',
      user_id: userId,
      metadata: { amount, reason, new_total: newPoints }
    });

    return { success: true, newPoints };
  } catch (error) {
    console.error('Error awarding points:', error);
    return { success: false, error };
  }
}

/**
 * Deduct points from a user (for purchases)
 */
export async function deductPoints({ userId, amount, reason, metadata }: PointTransaction) {
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('points')
      .eq('id', userId)
      .single();

    if (!profile || profile.points < amount) {
      throw new Error('Insufficient points');
    }

    const newPoints = profile.points - amount;

    await supabase
      .from('profiles')
      .update({ points: newPoints })
      .eq('id', userId);

    await supabase.from('avatar_purchase_log').insert({
      user_id: userId,
      points_spent: amount,
      transaction_type: 'spent',
      metadata: { reason, ...metadata }
    });

    return { success: true, newPoints };
  } catch (error) {
    console.error('Error deducting points:', error);
    return { success: false, error };
  }
}

/**
 * Get user's point balance
 */
export async function getPointBalance(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('points')
    .eq('id', userId)
    .single();

  if (error) return 0;
  return data?.points || 0;
}

/**
 * Get user's point transaction history
 */
export async function getPointHistory(userId: string, limit = 50) {
  const { data, error } = await supabase
    .from('avatar_purchase_log')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) return [];
  return data || [];
}

/**
 * Check if user has earned points for an action today
 */
export async function hasEarnedToday(userId: string, reason: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { data } = await supabase
    .from('avatar_purchase_log')
    .select('id')
    .eq('user_id', userId)
    .eq('transaction_type', 'earned')
    .gte('created_at', today.toISOString())
    .contains('metadata', { reason });

  return (data?.length || 0) > 0;
}

/**
 * Award daily login points (once per day)
 */
export async function awardDailyLogin(userId: string) {
  const alreadyEarned = await hasEarnedToday(userId, 'daily_login');
  if (alreadyEarned) {
    return { success: false, message: 'Already earned today' };
  }

  return await awardPoints({
    userId,
    amount: POINT_REWARDS.DAILY_LOGIN,
    reason: 'daily_login',
    metadata: { date: new Date().toISOString() }
  });
}
