/**
 * Subscription state: in-memory by default; uses Supabase when env is set.
 * Table: subscriptions (user_id, status, plan, current_period_end, free_trial_ends_at)
 */

export interface SubscriptionRow {
  user_id: string;
  status: string;
  plan: string;
  current_period_end: string | null;
  free_trial_ends_at?: string | null;
}

const inMemory = new Map<string, SubscriptionRow>();

async function getSupabaseClient(): Promise<unknown | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  try {
    const { createClient } = await import('@supabase/supabase-js');
    return createClient(url, key);
  } catch {
    return null;
  }
}

type SupabaseClient = {
  from: (table: string) => {
    upsert: (row: SubscriptionRow, opts?: { onConflict?: string; ignoreDuplicates?: boolean }) => Promise<{ error: unknown }>;
    select: (cols: string) => { eq: (col: string, val: string) => { single: () => Promise<{ data: SubscriptionRow | null }> } };
    delete: () => { eq: (col: string, val: string) => Promise<{ error: unknown }> };
  };
};

const TRIAL_DAYS = 30;

/** Set free_trial_ends_at to now + TRIAL_DAYS (ISO string). */
export function getDefaultTrialEnd(): string {
  const d = new Date();
  d.setDate(d.getDate() + TRIAL_DAYS);
  return d.toISOString();
}

export async function upsertSubscription(row: SubscriptionRow): Promise<void> {
  const supabase = await getSupabaseClient();
  if (supabase) {
    await (supabase as SupabaseClient).from('subscriptions').upsert(row, {
      onConflict: 'user_id',
    });
  } else {
    inMemory.set(row.user_id, row);
  }
}

export async function getSubscription(userId: string): Promise<SubscriptionRow | null> {
  const supabase = await getSupabaseClient();
  if (supabase) {
    const { data } = await (supabase as SupabaseClient)
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single();
    return data;
  }
  return inMemory.get(userId) ?? null;
}

export async function deleteSubscription(userId: string): Promise<void> {
  const supabase = await getSupabaseClient();
  if (supabase) {
    await (supabase as SupabaseClient).from('subscriptions').delete().eq('user_id', userId);
  } else {
    inMemory.delete(userId);
  }
}

/** Ensure a free-trial row exists for this user (first sign-in). Idempotent: only inserts if no row. */
export async function ensureFreeTrialRow(userId: string): Promise<void> {
  const existing = await getSubscription(userId);
  if (existing) return;

  const trialEndsAt = getDefaultTrialEnd();
  const row: SubscriptionRow = {
    user_id: userId,
    status: 'active',
    plan: 'free',
    current_period_end: null,
    free_trial_ends_at: trialEndsAt,
  };

  const supabase = await getSupabaseClient();
  if (supabase) {
    await (supabase as SupabaseClient).from('subscriptions').upsert(row, {
      onConflict: 'user_id',
      ignoreDuplicates: true, // do not overwrite existing row (e.g. already Pro)
    });
  } else {
    inMemory.set(userId, row);
  }
}
