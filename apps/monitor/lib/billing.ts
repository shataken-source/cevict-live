import { createSupabaseAdminClient } from '@/lib/supabase-admin';

export type MonitorAccount = {
  owner_id: string;
  plan: 'free' | 'pro' | 'enterprise';
  allow_sms: boolean;
  max_websites: number | null;
  paid_until: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
};

const DEFAULTS: Omit<MonitorAccount, 'owner_id'> = {
  plan: 'free',
  allow_sms: false,
  max_websites: 3,
  paid_until: null,
  stripe_customer_id: null,
  stripe_subscription_id: null,
};

export function isPaidActive(acct: MonitorAccount): boolean {
  if (acct.plan === 'free') return false;
  if (!acct.paid_until) return true; // treat as active if paid plan but no expiry recorded
  return new Date(acct.paid_until).getTime() > Date.now();
}

export function effectiveMaxWebsites(acct: MonitorAccount): number {
  if (acct.max_websites && acct.max_websites > 0) return acct.max_websites;
  if (acct.plan === 'enterprise') return 100;
  if (acct.plan === 'pro') return 25;
  return 3;
}

export async function getOrCreateMonitorAccount(ownerId: string): Promise<MonitorAccount> {
  const supabase = createSupabaseAdminClient();

  // Table may not exist in older schemas; in that case, fall back to defaults.
  try {
    const { data, error } = await supabase
      .from('monitor_accounts')
      .select('*')
      .eq('owner_id', ownerId)
      .limit(1)
      .maybeSingle();

    if (error) {
      // If missing table, degrade gracefully.
      if (String(error.code) === '42P01' || String(error.message || '').includes('does not exist')) {
        return { owner_id: ownerId, ...DEFAULTS };
      }
      throw new Error(error.message);
    }

    if (data) return data as MonitorAccount;

    const insertPayload: MonitorAccount = { owner_id: ownerId, ...DEFAULTS };
    const ins = await supabase.from('monitor_accounts').insert(insertPayload).select('*').single();
    if (ins.error) {
      if (String(ins.error.code) === '42P01' || String(ins.error.message || '').includes('does not exist')) {
        return insertPayload;
      }
      throw new Error(ins.error.message);
    }
    return ins.data as MonitorAccount;
  } catch {
    return { owner_id: ownerId, ...DEFAULTS };
  }
}

