/**
 * Subscription state for Monitor. Uses Supabase when env is set.
 * Table: subscriptions (user_id, plan, status, current_period_end, trial_ends_at)
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export type Plan = 'free' | 'pro' | 'team';

export interface SubscriptionRow {
  user_id: string;
  plan: Plan;
  status: string | null;
  stripe_subscription_id?: string | null;
  current_period_end: string | null;
  trial_ends_at: string | null;
}

const PLAN_LIMITS: Record<Plan, number> = {
  free: 3,
  pro: 20,
  team: 25,
};

export function getPlanLimit(plan: Plan): number {
  return PLAN_LIMITS[plan] ?? 2;
}

let _supabase: SupabaseClient | null | undefined;

async function getSupabaseClient(): Promise<SupabaseClient | null> {
  if (_supabase !== undefined) return _supabase;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    _supabase = null;
    return null;
  }
  try {
    const { createClient } = await import('@supabase/supabase-js');
    _supabase = createClient(url, key);
    return _supabase;
  } catch {
    _supabase = null;
    return null;
  }
}

export async function upsertSubscription(row: SubscriptionRow): Promise<void> {
  const supabase = await getSupabaseClient();
  if (supabase) {
    await supabase.from('subscriptions').upsert(
      {
        user_id: row.user_id,
        plan: row.plan,
        status: row.status ?? null,
        stripe_subscription_id: row.stripe_subscription_id ?? null,
        current_period_end: row.current_period_end ?? null,
        trial_ends_at: row.trial_ends_at ?? null,
      },
      { onConflict: 'user_id' }
    );
  }
}

export async function getSubscription(userId: string): Promise<SubscriptionRow | null> {
  const supabase = await getSupabaseClient();
  if (supabase) {
    const { data } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single();
    return data as SubscriptionRow | null;
  }
  return null;
}

export async function deleteSubscription(userId: string): Promise<void> {
  const supabase = await getSupabaseClient();
  if (supabase) {
    await supabase.from('subscriptions').delete().eq('user_id', userId);
  }
}
