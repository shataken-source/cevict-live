import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { SAMPLE_AFFILIATE_PRODUCTS } from '@/lib/marketplace/affiliateProducts';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Populate products table with affiliate products
 * This endpoint can be called to seed the marketplace
 */
export async function POST(request: NextRequest) {
  try {
    // Optional: Add authentication check
    const authHeader = request.headers.get('authorization');
    const adminPassword = request.headers.get('x-admin-password') || request.nextUrl.searchParams.get('password');
    const expectedPassword = process.env.ADMIN_PASSWORD;

    if (expectedPassword && adminPassword !== expectedPassword) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { success: false, error: 'Database not configured' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check if products already exist
    const { data: existingProducts, error: checkError } = await supabase
      .from('products')
      .select('id, name')
      .limit(1);

    if (checkError && checkError.code !== 'PGRST116') {
      return NextResponse.json(
        { success: false, error: `Database error: ${checkError.message}` },
        { status: 500 }
      );
    }

    const hasExisting = existingProducts && existingProducts.length > 0;
    const body = await request.json().catch(() => ({}));
    const overwrite = body.overwrite === true;

    if (hasExisting && !overwrite) {
      return NextResponse.json({
        success: false,
        error: 'Products already exist. Use ?overwrite=true to replace them.',
        existingCount: existingProducts.length,
      });
    }

    // Delete existing products if overwriting
    if (hasExisting && overwrite) {
      const { error: deleteError } = await supabase
        .from('products')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

      if (deleteError) {
        return NextResponse.json(
          { success: false, error: `Failed to delete existing products: ${deleteError.message}` },
          { status: 500 }
        );
      }
    }

    // Insert new products
    const productsToInsert = SAMPLE_AFFILIATE_PRODUCTS.map(product => ({
      name: product.name,
      description: product.description,
      price: product.price,
      category: product.category,
      link: product.link,
      sponsor: product.sponsor || false,
      commission: product.commission || null,
      active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    const { data: insertedProducts, error: insertError } = await supabase
      .from('products')
      .insert(productsToInsert)
      .select();

    if (insertError) {
      return NextResponse.json(
        { success: false, error: `Failed to insert products: ${insertError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: hasExisting ? 'Products replaced successfully' : 'Products populated successfully',
      count: insertedProducts?.length || 0,
      products: insertedProducts,
    });
  } catch (error: any) {
    console.error('Populate products error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to populate products',
      },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to preview products that would be inserted
 */
export async function GET(request: NextRequest) {
  return NextResponse.json({
    success: true,
    preview: true,
    count: SAMPLE_AFFILIATE_PRODUCTS.length,
    categories: Array.from(new Set(SAMPLE_AFFILIATE_PRODUCTS.map(p => p.category))),
    products: SAMPLE_AFFILIATE_PRODUCTS.map(p => ({
      name: p.name,
      category: p.category,
      price: p.price,
      sponsor: p.sponsor || false,
    })),
  });
}
