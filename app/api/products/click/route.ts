import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';

// Track product click
export async function POST(request: NextRequest) {
  try {
    const { productId } = await request.json();

    if (!productId) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
    }

    const supabase = createClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Supabase client not initialized' }, { status: 500 });
    }
    const client = supabase as NonNullable<typeof supabase>;

    // Record the click
    const { error: clickError } = await client
      .from('product_clicks')
      .insert({
        product_id: productId,
        ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        user_agent: request.headers.get('user-agent') || 'unknown',
      });

    if (clickError) {
      console.error('Error recording click:', clickError);
    }

    // Increment click count on product
    const { data: product } = await client
      .from('affiliate_products')
      .select('clicks')
      .eq('id', productId)
      .single();

    if (product) {
      await client
        .from('affiliate_products')
        .update({ clicks: (product.clicks || 0) + 1 })
        .eq('id', productId);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error tracking click:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

