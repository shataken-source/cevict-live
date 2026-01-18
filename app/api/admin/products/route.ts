import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { securityMiddleware } from '@/lib/security-middleware';

// Helper to check admin authentication
async function isAuthed(request: NextRequest): Promise<boolean> {
  const adminPassword = process.env.SMOKERSRIGHTS_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD;
  if (!adminPassword) return false;

  const cookie = request.cookies.get('smokersrights_admin')?.value;
  if (!cookie) return false;

  // Verify HMAC cookie
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(adminPassword),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, enc.encode('smokersrights-admin'));
  const bytes = new Uint8Array(signature);
  const expected = Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');

  return cookie === expected;
}

// GET - Fetch all products
export async function GET(request: NextRequest) {
  const sec = await securityMiddleware(request, { rateLimitType: 'admin' });
  if (sec && sec.status !== 200) return sec;

  if (!(await isAuthed(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = createClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Supabase client not initialized' }, { status: 500 });
    }
    if (!supabase) {
      return NextResponse.json({ error: 'Supabase client not initialized' }, { status: 500 });
    }
    if (!supabase) {
      return NextResponse.json({ error: 'Supabase client not initialized' }, { status: 500 });
    }
    if (!supabase) {
      return NextResponse.json({ error: 'Supabase client not initialized' }, { status: 500 });
    }
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }
    const client = supabase as NonNullable<typeof supabase>;
    const { data, error } = await client
      .from('affiliate_products')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching products:', error);
      return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
    }

    return NextResponse.json({ products: data || [] });
  } catch (error: any) {
    console.error('Error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

// POST - Create new product
export async function POST(request: NextRequest) {
  const sec = await securityMiddleware(request, { rateLimitType: 'admin' });
  if (sec && sec.status !== 200) return sec;

  if (!(await isAuthed(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, category, price, link, commission_rate } = body;

    if (!name || !category || !price || !link) {
      return NextResponse.json(
        { error: 'Missing required fields: name, category, price, link' },
        { status: 400 }
      );
    }

    const supabase = createClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Supabase client not initialized' }, { status: 500 });
    }
    const client = supabase as NonNullable<typeof supabase>;
    const { data, error } = await client
      .from('affiliate_products')
      .insert({
        name,
        category,
        price: parseFloat(price),
        affiliate_link: link,
        commission_rate: commission_rate || 0.10, // Default 10%
        clicks: 0,
        sales: 0,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating product:', error);
      return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
    }

    return NextResponse.json({ product: data }, { status: 201 });
  } catch (error: any) {
    console.error('Error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

// PUT - Update product
export async function PUT(request: NextRequest) {
  const sec = await securityMiddleware(request, { rateLimitType: 'admin' });
  if (sec && sec.status !== 200) return sec;

  if (!(await isAuthed(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { id, name, category, price, link, commission_rate } = body;

    if (!id) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
    }

    const supabase = createClient();
    const updateData: any = {};
    if (name) updateData.name = name;
    if (category) updateData.category = category;
    if (price !== undefined) updateData.price = parseFloat(price);
    if (link) updateData.affiliate_link = link;
    if (commission_rate !== undefined) updateData.commission_rate = parseFloat(commission_rate);

    const client = supabase as NonNullable<typeof supabase>;
    const { data, error } = await client
      .from('affiliate_products')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating product:', error);
      return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
    }

    return NextResponse.json({ product: data });
  } catch (error: any) {
    console.error('Error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Delete product
export async function DELETE(request: NextRequest) {
  const sec = await securityMiddleware(request, { rateLimitType: 'admin' });
  if (sec && sec.status !== 200) return sec;

  if (!(await isAuthed(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
    }

    const supabase = createClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Supabase client not initialized' }, { status: 500 });
    }
    const client = supabase as NonNullable<typeof supabase>;
    const { error } = await client
      .from('affiliate_products')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting product:', error);
      return NextResponse.json({ error: 'Failed to delete product' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

