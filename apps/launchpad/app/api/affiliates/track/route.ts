import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabaseAdmin = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null;

// POST - Track affiliate click
export async function POST(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ success: false, error: 'Supabase not configured' }, { status: 500 });
    }

    const body = await request.json();
    const { affiliate_id, website } = body;

    if (!affiliate_id || !website) {
      return NextResponse.json(
        { success: false, error: 'affiliate_id and website are required' },
        { status: 400 }
      );
    }

    // Get client IP and user agent
    const ipAddress = request.headers.get('x-forwarded-for') ||
                     request.headers.get('x-real-ip') ||
                     'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';
    const referrer = request.headers.get('referer') || null;

    // Update affiliate click count
    const { data: affiliate } = await supabaseAdmin
      .from('affiliates')
      .select('click_count')
      .eq('id', affiliate_id)
      .single();

    if (affiliate) {
      await supabaseAdmin
        .from('affiliates')
        .update({
          click_count: (affiliate.click_count || 0) + 1,
          last_used_at: new Date().toISOString(),
        })
        .eq('id', affiliate_id);
    }

    // Log the click
    await supabaseAdmin
      .from('affiliate_clicks')
      .insert({
        affiliate_id,
        website,
        user_agent: userAgent,
        ip_address: ipAddress,
        referrer,
      });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[Affiliate Track] Error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to track click' },
      { status: 500 }
    );
  }
}

