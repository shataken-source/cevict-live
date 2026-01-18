/**
 * Legislation Tracker
 * Track real-time legislative changes affecting smoking/vaping
 * Unique feature: No direct competitor has this
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = supabaseUrl ? createClient(supabaseUrl, supabaseKey) : null;

export interface LegislationBill {
  id: string;
  state: string;
  billNumber: string;
  title: string;
  summary: string;
  status: 'introduced' | 'committee' | 'passed_house' | 'passed_senate' | 'signed' | 'vetoed' | 'dead';
  category: 'indoor_smoking' | 'outdoor_smoking' | 'vaping' | 'taxation' | 'age_restrictions' | 'retail';
  impact: 'positive' | 'negative' | 'neutral';
  impactDescription: string;
  sponsors: string[];
  introducedDate: string;
  lastActionDate: string;
  lastAction: string;
  votes?: {
    house?: { yea: number; nay: number };
    senate?: { yea: number; nay: number };
  };
  effectiveDate?: string;
  sourceUrl?: string;
  alertLevel: 'urgent' | 'important' | 'monitor';
}

export interface LegislationAlert {
  id: string;
  billId: string;
  type: 'status_change' | 'new_bill' | 'vote_scheduled' | 'passed' | 'signed';
  message: string;
  createdAt: string;
  read: boolean;
}

// Fetch active legislation for a state
export async function fetchStateLegislation(stateCode: string): Promise<LegislationBill[]> {
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from('legislation_bills')
      .select('*')
      .eq('state', stateCode)
      .not('status', 'in', '("dead","signed")')
      .order('last_action_date', { ascending: false });

    if (error) throw error;
    return data as LegislationBill[];
  } catch (error) {
    console.error('Error fetching legislation:', error);
    return [];
  }
}

// Fetch legislation alerts
export async function fetchLegislationAlerts(states: string[]): Promise<LegislationAlert[]> {
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from('legislation_alerts')
      .select('*')
      .in('state', states)
      .eq('read', false)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;
    return data as LegislationAlert[];
  } catch (error) {
    console.error('Error fetching alerts:', error);
    return [];
  }
}

// Subscribe to legislation updates
export async function subscribeToLegislation(
  email: string,
  states: string[],
  categories: string[]
): Promise<boolean> {
  if (!supabase) return false;

  try {
    const { error } = await supabase
      .from('legislation_subscriptions')
      .upsert({
        email,
        states,
        categories,
        active: true,
        updated_at: new Date().toISOString(),
      });

    return !error;
  } catch {
    return false;
  }
}

// Track a specific bill
export async function trackBill(billId: string, userId: string): Promise<boolean> {
  if (!supabase) return false;

  try {
    const { error } = await supabase
      .from('tracked_bills')
      .insert({
        bill_id: billId,
        user_id: userId,
        created_at: new Date().toISOString(),
      });

    return !error;
  } catch {
    return false;
  }
}

// Get status badge color
export function getStatusColor(status: LegislationBill['status']): string {
  switch (status) {
    case 'introduced': return 'bg-blue-100 text-blue-700';
    case 'committee': return 'bg-yellow-100 text-yellow-700';
    case 'passed_house': return 'bg-orange-100 text-orange-700';
    case 'passed_senate': return 'bg-purple-100 text-purple-700';
    case 'signed': return 'bg-green-100 text-green-700';
    case 'vetoed': return 'bg-red-100 text-red-700';
    case 'dead': return 'bg-gray-100 text-gray-700';
    default: return 'bg-gray-100 text-gray-700';
  }
}

// Get impact badge color
export function getImpactColor(impact: LegislationBill['impact']): string {
  switch (impact) {
    case 'positive': return 'bg-green-100 text-green-700';
    case 'negative': return 'bg-red-100 text-red-700';
    case 'neutral': return 'bg-gray-100 text-gray-700';
  }
}

// Get alert level color
export function getAlertLevelColor(level: LegislationBill['alertLevel']): string {
  switch (level) {
    case 'urgent': return 'bg-red-500 text-white';
    case 'important': return 'bg-orange-500 text-white';
    case 'monitor': return 'bg-blue-500 text-white';
  }
}

