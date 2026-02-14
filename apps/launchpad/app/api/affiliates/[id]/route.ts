import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServiceClient } from '@/lib/supabase';

function getSupabaseAdmin() {
  try { return createSupabaseServiceClient(); } catch { return null; }
}
const supabaseAdmin = getSupabaseAdmin();

// GET - Get single affiliate
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Supabase not configured' },
        { status: 500 }
      );
    }

    const { id } = await params;
    const { data, error } = await supabaseAdmin
      .from('affiliates')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Affiliate not found' },
          { status: 404 }
        );
      }
      console.error('[Affiliate GET] Error:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ affiliate: data });
  } catch (error: any) {
    console.error('[Affiliate GET] Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch affiliate' },
      { status: 500 }
    );
  }
}

// PATCH - Update affiliate
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Supabase not configured' },
        { status: 500 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const updates: any = {
      updated_at: new Date().toISOString(),
    };

    if (body.name !== undefined) updates.name = body.name;
    if (body.website_url !== undefined) updates.website_url = body.website_url;
    if (body.affiliate_url !== undefined) updates.affiliate_url = body.affiliate_url;
    if (body.description !== undefined) updates.description = body.description;
    if (body.category !== undefined) updates.category = body.category;
    if (body.website !== undefined) updates.website = body.website;
    if (body.is_active !== undefined) updates.is_active = body.is_active;
    if (body.commission_rate !== undefined) updates.commission_rate = body.commission_rate;
    if (body.tags !== undefined) updates.tags = body.tags;
    if (body.notes !== undefined) updates.notes = body.notes;

    const { data, error } = await supabaseAdmin
      .from('affiliates')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[Affiliate PATCH] Error:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ affiliate: data });
  } catch (error: any) {
    console.error('[Affiliate PATCH] Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to update affiliate' },
      { status: 500 }
    );
  }
}

// DELETE - Delete affiliate
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Supabase not configured' },
        { status: 500 }
      );
    }

    const { id } = await params;
    const { error } = await supabaseAdmin
      .from('affiliates')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[Affiliate DELETE] Error:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[Affiliate DELETE] Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to delete affiliate' },
      { status: 500 }
    );
  }
}

