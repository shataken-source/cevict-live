import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createClient as createAnonClient } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

type LawCard = {
  state_code: string;
  state_name: string;
  category: string;
  summary: string;
  details?: string;
  last_verified_at?: string;
  is_active?: boolean;
};

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const ENV_API_KEY = process.env.REGCHECK_API_KEY || '';

const ranges: { start: number; end: number; state: string }[] = [
  { start: 350, end: 369, state: 'AL' },
  { start: 995, end: 999, state: 'AK' },
  { start: 850, end: 865, state: 'AZ' },
  { start: 716, end: 729, state: 'AR' },
  { start: 755, end: 755, state: 'AR' },
  { start: 900, end: 961, state: 'CA' },
  { start: 800, end: 816, state: 'CO' },
  { start: 600, end: 638, state: 'CT' },
  { start: 197, end: 199, state: 'DE' },
  { start: 320, end: 349, state: 'FL' },
  { start: 300, end: 319, state: 'GA' },
  { start: 398, end: 399, state: 'GA' },
  { start: 967, end: 969, state: 'HI' },
  { start: 832, end: 838, state: 'ID' },
  { start: 600, end: 629, state: 'IL' },
  { start: 460, end: 479, state: 'IN' },
  { start: 500, end: 528, state: 'IA' },
  { start: 660, end: 679, state: 'KS' },
  { start: 400, end: 427, state: 'KY' },
  { start: 700, end: 715, state: 'LA' },
  { start: 390, end: 399, state: 'ME' },
  { start: 206, end: 219, state: 'MD' },
  { start: 10, end: 27, state: 'MA' },
  { start: 55, end: 55, state: 'MA' },
  { start: 480, end: 499, state: 'MI' },
  { start: 550, end: 567, state: 'MN' },
  { start: 386, end: 397, state: 'MS' },
  { start: 630, end: 658, state: 'MO' },
  { start: 590, end: 599, state: 'MT' },
  { start: 680, end: 693, state: 'NE' },
  { start: 889, end: 898, state: 'NV' },
  { start: 30, end: 38, state: 'NH' },
  { start: 70, end: 89, state: 'NJ' },
  { start: 870, end: 884, state: 'NM' },
  { start: 100, end: 149, state: 'NY' },
  { start: 270, end: 289, state: 'NC' },
  { start: 580, end: 588, state: 'ND' },
  { start: 430, end: 459, state: 'OH' },
  { start: 730, end: 749, state: 'OK' },
  { start: 970, end: 979, state: 'OR' },
  { start: 150, end: 196, state: 'PA' },
  { start: 28, end: 29, state: 'RI' },
  { start: 290, end: 299, state: 'SC' },
  { start: 570, end: 577, state: 'SD' },
  { start: 370, end: 385, state: 'TN' },
  { start: 750, end: 799, state: 'TX' },
  { start: 885, end: 885, state: 'TX' },
  { start: 840, end: 847, state: 'UT' },
  { start: 50, end: 59, state: 'VT' },
  { start: 201, end: 246, state: 'VA' },
  { start: 980, end: 994, state: 'WA' },
  { start: 247, end: 268, state: 'WV' },
  { start: 530, end: 549, state: 'WI' },
  { start: 820, end: 831, state: 'WY' },
  { start: 200, end: 205, state: 'DC' },
  { start: 569, end: 569, state: 'DC' },
  { start: 6, end: 9, state: 'PR' },
];

function zipToState(zip: string): string | null {
  const z = parseInt((zip || '').slice(0, 3), 10);
  if (Number.isNaN(z)) return null;
  const match = ranges.find(r => z >= r.start && z <= r.end);
  return match ? match.state : null;
}

function hashKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex');
}

function maskKey(key: string): string {
  if (!key) return '';
  if (key.length <= 6) return '***';
  return `${key.slice(0, 3)}...${key.slice(-3)}`;
}

async function validateApiKey(apiKey: string): Promise<boolean> {
  if (ENV_API_KEY && apiKey === ENV_API_KEY) return true;
  if (!SUPABASE_URL || !SERVICE_KEY) return false;
  try {
    const svc = createSupabaseClient(SUPABASE_URL, SERVICE_KEY);
    const { data, error } = await svc
      .from('regcheck_api_keys')
      .select('api_key, active')
      .eq('api_key', apiKey)
      .eq('active', true)
      .limit(1)
      .maybeSingle();
    if (error) {
      console.warn('regcheck_api_keys lookup failed:', error.message);
      return false;
    }
    return !!data;
  } catch (err: any) {
    console.warn('regcheck_api_keys lookup exception:', err?.message);
    return false;
  }
}

async function logUsage(input: {
  apiKey: string;
  zip: string;
  state: string | null;
  productCategory?: string;
  status: string;
}) {
  if (!SUPABASE_URL || !SERVICE_KEY) return;
  try {
    const svc = createSupabaseClient(SUPABASE_URL, SERVICE_KEY);
    await svc.from('regcheck_usage').insert({
      api_key_hash: hashKey(input.apiKey),
      api_key_masked: maskKey(input.apiKey),
      zip_code: input.zip,
      state_code: input.state,
      product_category: input.productCategory,
      status: input.status,
      created_at: new Date().toISOString(),
    });
  } catch (err: any) {
    console.warn('regcheck_usage insert failed:', err?.message);
  }
}

export async function POST(req: NextRequest) {
  const apiKey = req.headers.get('x-api-key');
  if (!apiKey) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createAnonClient();

  try {
    const body = await req.json();
    const { zip_code, product_category, product_type } = body || {};
    const category = product_category || product_type;
    if (!zip_code || !category) {
      return NextResponse.json({ error: 'zip_code and product_category are required' }, { status: 400 });
    }

    const keyValid = await validateApiKey(apiKey);
    if (!keyValid) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
    }

    const state = zipToState(String(zip_code));
    if (!state) {
      await logUsage({ apiKey, zip: zip_code, state: null, productCategory: category, status: 'UNKNOWN_ZIP' });
      return NextResponse.json({ status: 'UNKNOWN', message: 'Zip code outside tracked regions' }, { status: 404 });
    }

    if (!supabase) {
      await logUsage({ apiKey, zip: zip_code, state, productCategory: category, status: 'NO_CLIENT' });
      return NextResponse.json({ status: 'ERROR', message: 'Supabase not configured' }, { status: 500 });
    }

    const { data: lawCard, error } = await supabase
      .from('sr_law_cards')
      .select('state_name,state_code,category,summary,details,last_verified_at,is_active')
      .eq('state_code', state)
      .eq('category', category)
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      await logUsage({ apiKey, zip: zip_code, state, productCategory: category, status: 'QUERY_ERROR' });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const isRestricted = lawCard
      ? /(ban|prohibit|restricted|tax)/i.test(lawCard.summary || '')
      : false;

    const response = {
      status: lawCard ? (isRestricted ? 'RESTRICTED' : 'CAUTION') : 'ALLOW',
      state: lawCard?.state_name || state,
      category,
      summary: lawCard?.summary || 'No specific restrictions found',
      details: lawCard?.details || null,
      last_verified: lawCard?.last_verified_at || null,
      shipping_restrictions: isRestricted ? ['Signature required', 'ID verification'] : [],
      disclaimer: 'Information is guidance only. Consult counsel for final compliance decisions.',
    };

    await logUsage({
      apiKey,
      zip: zip_code,
      state,
      productCategory: category,
      status: response.status,
    });

    return NextResponse.json(response);
  } catch (e: any) {
    await logUsage({
      apiKey,
      zip: 'unknown',
      state: null,
      productCategory: undefined,
      status: 'ERROR',
    });
    return NextResponse.json({ error: e?.message || 'Server error' }, { status: 500 });
  }
}

