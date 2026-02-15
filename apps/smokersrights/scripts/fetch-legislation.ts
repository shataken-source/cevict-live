import { createClient } from '@supabase/supabase-js';
import type { LegislationBill, LegislationAlert } from '../lib/legislation-tracker';

/**
 * Fetch legislation data from LegiScan API
 * Run: npx ts-node scripts/fetch-legislation.ts
 *
 * Environment variables needed:
 * - LEGISCAN_API_KEY
 * - NEXT_PUBLIC_SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 */

const LEGISCAN_API_KEY = process.env.LEGISCAN_API_KEY || '';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const STATES = ['AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC'];

// Keywords to filter tobacco/smoking/vaping/hemp/marijuana bills
const KEYWORDS = [
  'tobacco', 'smoking', 'vape', 'vaping', 'e-cigarette', 'electronic cigarette',
  'nicotine', 'flavor', 'flavored', 'smoke', 'cigar', 'hookah', 'snuff',
  'chewing tobacco', 'smokeless tobacco', 'alternative tobacco',
  'hemp', 'marijuana', 'cannabis', 'cbd', 'delta-8', 'delta-9', 'thc',
  'edible', 'gummy', 'gummies', 'infused', 'dispensary', 'recreational'
];

async function fetchLegiScanBill(billId: number): Promise<any> {
  const res = await fetch(
    `https://api.legiscan.com/v1/?key=${LEGISCAN_API_KEY}&op=getBill&id=${billId}`
  );
  const data = await res.json();
  return data.bill || null;
}

async function searchLegiScanBills(state: string): Promise<any[]> {
  const res = await fetch(
    `https://api.legiscan.com/v1/?key=${LEGISCAN_API_KEY}&op=getSearch&state=${state}&query=tobacco+vape+smoking&page=1`
  );
  const data = await res.json();
  return data.searchresult || [];
}

async function fetchAndStoreLegislation() {
  console.log('Starting legislation fetch job...');
  console.log(`Processing ${STATES.length} states...`);

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Missing Supabase credentials!');
    process.exit(1);
  }

  if (!LEGISCAN_API_KEY) {
    console.error('Missing LEGISCAN_API_KEY! Set it in environment variables.');
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  let newBills = 0;
  let updatedBills = 0;

  // Process each state
  for (const state of STATES) {
    console.log(`Fetching bills for ${state}...`);

    try {
      const bills = await searchLegiScanBills(state);

      for (const bill of bills) {
        // Filter by keywords
        const title = bill.title || '';
        const description = bill.description || '';
        const text = `${title} ${description}`.toLowerCase();

        if (!KEYWORDS.some(k => text.includes(k))) {
          continue; // Skip non-tobacco bills
        }

        const billId = bill.bill_id;
        const existing = await supabase
          .from('sr_legislation_bills')
          .select('id')
          .eq('external_id', billId.toString())
          .single();

        if (existing.error) {
          // New bill - fetch details
          const billDetails = await fetchLegiScanBill(billId);
          if (billDetails) {
            const transformed = transformLegiScanBill(billDetails, state);
            await storeBill(supabase, transformed);
            newBills++;
          }
        } else {
          updatedBills++;
        }
      }

      // Rate limit - 1 request per second
      await new Promise(r => setTimeout(r, 1000));
    } catch (err) {
      console.error(`Error fetching ${state}:`, err);
    }
  }

  console.log(`\nFetch complete!`);
  console.log(`New bills: ${newBills}`);
  console.log(`Existing bills: ${updatedBills}`);
}

function transformLegiScanBill(raw: any, state: string): LegislationBill {
  const status = raw.status || 0;
  const progress = raw.progress || [];

  return {
    id: crypto.randomUUID(),
    bill_number: raw.bill_number || 'HB XXX',
    title: raw.title || 'Unknown',
    description: raw.description || '',
    state: state,
    status: mapLegiScanStatus(status),
    impact: determineImpact(raw.title + raw.description),
    last_action: progress[0]?.action || 'Unknown',
    last_action_date: progress[0]?.date || new Date().toISOString(),
    session: raw.session?.session_name || '2026',
    external_id: raw.bill_id?.toString(),
    url: raw.state_link || raw.url || '',
    sponsor: raw.sponsors?.[0]?.name || 'Unknown',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
}

async function storeBill(supabase: any, bill: LegislationBill) {
  const { error } = await supabase.from('sr_legislation_bills').upsert(bill, {
    onConflict: 'external_id'
  });

  if (error) {
    console.error('Error storing bill:', error);
  }
}

function mapLegiScanStatus(status: number): 'introduced' | 'committee' | 'passed' | 'signed' | 'vetoed' | 'failed' {
  // LegiScan status codes
  const statusMap: { [key: number]: any } = {
    1: 'introduced',
    2: 'committee',
    3: 'committee',
    4: 'passed',
    5: 'passed',
    6: 'signed',
    7: 'vetoed',
    8: 'failed'
  };
  return statusMap[status] || 'introduced';
}

function determineImpact(text: string): 'positive' | 'negative' | 'neutral' {
  const lower = text.toLowerCase();
  const positive = ['protect', 'allow', 'permit', 'rights', 'freedom', 'exempt'];
  const negative = ['ban', 'prohibit', 'restrict', 'tax', 'increase', 'limit'];

  const posCount = positive.filter(p => lower.includes(p)).length;
  const negCount = negative.filter(n => lower.includes(n)).length;

  if (posCount > negCount) return 'positive';
  if (negCount > posCount) return 'negative';
  return 'neutral';
}

// Run if called directly
if (require.main === module) {
  fetchAndStoreLegislation().catch(console.error);
}

export { fetchAndStoreLegislation };
