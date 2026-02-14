import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServiceClient } from '@/lib/supabase';
import { auth } from '@clerk/nextjs/server';

/**
 * POST /api/visitors/track
 * Body: { websiteId: string, date?: string (YYYY-MM-DD), uniqueVisitors: number, totalVisits?: number }
 * Upserts visitor_stats for the given website and date (default: today). Auth required; must own website.
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
    }

    const body = await request.json();
    const { websiteId, date, uniqueVisitors, totalVisits } = body;

    if (!websiteId || uniqueVisitors === undefined) {
      return NextResponse.json(
        { error: 'websiteId and uniqueVisitors are required' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServiceClient();
    const { data: site } = await supabase
      .from('monitored_websites')
      .select('id')
      .eq('id', websiteId)
      .eq('owner_id', userId)
      .single();
    if (!site) {
      return NextResponse.json({ error: 'Website not found or access denied' }, { status: 404 });
    }

    const dateStr = date || new Date().toISOString().split('T')[0];
    const total = typeof totalVisits === 'number' ? totalVisits : uniqueVisitors;

    const { data, error } = await supabase
      .from('visitor_stats')
      .upsert(
        {
          website_id: websiteId,
          date: dateStr,
          unique_visitors: Math.max(0, Math.floor(Number(uniqueVisitors))),
          total_visits: Math.max(0, Math.floor(Number(total))),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'website_id,date' }
      )
      .select()
      .single();

    if (error) {
      console.error('Error upserting visitor stats:', error);
      return NextResponse.json({ error: 'Failed to save visitor stats' }, { status: 500 });
    }

    return NextResponse.json({ success: true, stat: data }, { status: 200 });
  } catch (error: any) {
    console.error('Error in visitors/track:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
