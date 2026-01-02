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
  if (!supabase) return getSampleLegislation(stateCode);

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
    return getSampleLegislation(stateCode);
  }
}

// Fetch legislation alerts
export async function fetchLegislationAlerts(states: string[]): Promise<LegislationAlert[]> {
  if (!supabase) return getSampleAlerts();

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
    return getSampleAlerts();
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

// Sample data
function getSampleLegislation(stateCode: string): LegislationBill[] {
  const stateLegislation: Record<string, LegislationBill[]> = {
    GA: [
      {
        id: 'ga-hb-123',
        state: 'GA',
        billNumber: 'HB 123',
        title: 'Tobacco Product Tax Increase Act',
        summary: 'Proposes increasing the state tobacco tax by $1.00 per pack to fund healthcare programs.',
        status: 'committee',
        category: 'taxation',
        impact: 'negative',
        impactDescription: 'Would increase cigarette prices significantly',
        sponsors: ['Rep. Smith', 'Rep. Johnson'],
        introducedDate: '2024-01-15',
        lastActionDate: '2024-12-20',
        lastAction: 'Referred to Ways and Means Committee',
        alertLevel: 'important',
      },
      {
        id: 'ga-sb-456',
        state: 'GA',
        billNumber: 'SB 456',
        title: 'Outdoor Smoking Area Designation Act',
        summary: 'Would require designated outdoor smoking areas in public spaces rather than complete bans.',
        status: 'introduced',
        category: 'outdoor_smoking',
        impact: 'positive',
        impactDescription: 'Would protect smokers\' rights in outdoor areas',
        sponsors: ['Sen. Williams'],
        introducedDate: '2024-11-01',
        lastActionDate: '2024-12-15',
        lastAction: 'First reading',
        alertLevel: 'monitor',
      },
    ],
    FL: [
      {
        id: 'fl-hb-789',
        state: 'FL',
        billNumber: 'HB 789',
        title: 'Vaping Product Flavor Ban',
        summary: 'Would ban flavored vaping products except tobacco flavor.',
        status: 'passed_house',
        category: 'vaping',
        impact: 'negative',
        impactDescription: 'Would eliminate most vaping options',
        sponsors: ['Rep. Garcia'],
        introducedDate: '2024-02-01',
        lastActionDate: '2024-12-18',
        lastAction: 'Passed House 78-42',
        votes: { house: { yea: 78, nay: 42 } },
        alertLevel: 'urgent',
      },
    ],
    NC: [
      {
        id: 'nc-sb-101',
        state: 'NC',
        billNumber: 'SB 101',
        title: 'Tobacco Heritage Preservation Act',
        summary: 'Would prevent localities from enacting smoking restrictions stricter than state law.',
        status: 'committee',
        category: 'indoor_smoking',
        impact: 'positive',
        impactDescription: 'Would preempt local smoking bans',
        sponsors: ['Sen. Brown', 'Sen. Davis'],
        introducedDate: '2024-03-15',
        lastActionDate: '2024-12-10',
        lastAction: 'Referred to Commerce Committee',
        alertLevel: 'important',
      },
    ],
  };

  return stateLegislation[stateCode] || [];
}

function getSampleAlerts(): LegislationAlert[] {
  return [
    {
      id: 'alert-1',
      billId: 'fl-hb-789',
      type: 'passed',
      message: '🚨 URGENT: Florida HB 789 (Vaping Flavor Ban) passed the House! Moving to Senate.',
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      read: false,
    },
    {
      id: 'alert-2',
      billId: 'ga-hb-123',
      type: 'vote_scheduled',
      message: '📅 Georgia HB 123 (Tobacco Tax) committee vote scheduled for January 5th',
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      read: false,
    },
    {
      id: 'alert-3',
      billId: 'nc-sb-101',
      type: 'status_change',
      message: '📋 NC SB 101 (Heritage Act) received new co-sponsors',
      createdAt: new Date(Date.now() - 172800000).toISOString(),
      read: false,
    },
  ];
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

