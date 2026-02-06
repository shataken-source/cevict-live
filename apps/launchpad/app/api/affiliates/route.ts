import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabaseAdmin = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null;

// GET - List all affiliates
export async function GET(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      // Return empty array instead of error if Supabase not configured
      return NextResponse.json(
        { affiliates: [] },
        { status: 200 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const website = searchParams.get('website');
    const category = searchParams.get('category');
    const isActive = searchParams.get('is_active');
    const search = searchParams.get('search');

    let query = supabaseAdmin
      .from('affiliates')
      .select('*')
      .order('created_at', { ascending: false });

    if (website) {
      query = query.contains('website', [website]);
    }

    if (category) {
      query = query.eq('category', category);
    }

    if (isActive !== null) {
      query = query.eq('is_active', isActive === 'true');
    }

    if (search) {
      query = query.or(
        `name.ilike.%${search}%,description.ilike.%${search}%,affiliate_url.ilike.%${search}%`
      );
    }

    const { data, error } = await query;

    if (error) {
      console.error('[Affiliates GET] Error:', error);
      return NextResponse.json(
        { affiliates: [], error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ affiliates: data || [] });
  } catch (error: any) {
    console.error('[Affiliates GET] Error:', error);
    return NextResponse.json(
      { affiliates: [], error: error?.message || 'Failed to fetch affiliates' },
      { status: 500 }
    );
  }
}

// POST - Create new affiliate
export async function POST(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Supabase not configured' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const {
      name,
      website_url,
      affiliate_url,
      description,
      category,
      website,
      is_active,
      commission_rate,
      tags,
      notes,
    } = body;

    if (!name || !affiliate_url) {
      return NextResponse.json(
        { error: 'Name and affiliate_url are required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('affiliates')
      .insert({
        name,
        website_url: website_url || null,
        affiliate_url,
        description: description || null,
        category: category || null,
        website: website || [],
        is_active: is_active !== undefined ? is_active : true,
        commission_rate: commission_rate || null,
        tags: tags || [],
        notes: notes || null,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('[Affiliates POST] Error:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ affiliate: data });
  } catch (error: any) {
    console.error('[Affiliates POST] Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to create affiliate' },
      { status: 500 }
    );
  }
}

