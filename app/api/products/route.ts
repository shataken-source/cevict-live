import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Public product feed for marketplace/affiliates.
 * RLS on affiliate_products controls visibility (is_active = true).
 */
export async function GET() {
  try {
    const supabase = createClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 });
    }

    const { data, error } = await supabase
      .from('affiliate_products')
      .select('id,name,category,price,affiliate_link,commission_rate,description,sponsor,image_url')
      .eq('is_active', true)
      .order('sponsor', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(200);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Map into legacy UI shape used by existing components
    const products = (data ?? []).map((p: any) => ({
      id: String(p.id),
      name: String(p.name ?? ''),
      category: String(p.category ?? ''),
      price: typeof p.price === 'number' ? `$${p.price.toFixed(2)}` : String(p.price ?? ''),
      commission: p.commission_rate != null ? `${Math.round(Number(p.commission_rate) * 100)}%` : 'N/A',
      link: String(p.affiliate_link ?? ''),
      description: String(p.description ?? ''),
      sponsor: !!p.sponsor,
      image_url: p.image_url ? String(p.image_url) : null,
    }));

    return NextResponse.json({ products }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Failed to load products' }, { status: 500 });
  }
}

