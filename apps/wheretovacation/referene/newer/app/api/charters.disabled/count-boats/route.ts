import { NextRequest, NextResponse } from 'next/server';

// Dynamic import to avoid webpack issues
const getSupabaseClient = async () => {
  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (supabaseUrl && supabaseServiceKey) {
      return createClient(supabaseUrl, supabaseServiceKey);
    }
    return null;
  } catch (error) {
    console.error('[CHARTERS] Failed to load Supabase client:', error);
    return null;
  }
};

export async function GET(request: NextRequest) {
  const supabase = await getSupabaseClient();
  if (!supabase) {
    return NextResponse.json(
      { error: 'Database not configured' },
      { status: 500 }
    );
  }

  try {
    // Get total count
    const { count: totalCount, error: countError } = await supabase
      .from('scraped_boats')
      .select('*', { count: 'exact', head: true });

    if (countError) throw countError;

    // Get counts by source
    const { data: sourceData, error: sourceError } = await supabase
      .from('scraped_boats')
      .select('source');

    const sourceCounts: Record<string, number> = {};
    if (sourceData) {
      sourceData.forEach(boat => {
        sourceCounts[boat.source] = (sourceCounts[boat.source] || 0) + 1;
      });
    }

    // Get counts by claimed status
    const { count: claimedCount } = await supabase
      .from('scraped_boats')
      .select('*', { count: 'exact', head: true })
      .eq('claimed', true);

    const { count: unclaimedCount } = await supabase
      .from('scraped_boats')
      .select('*', { count: 'exact', head: true })
      .eq('claimed', false);

    return NextResponse.json({
      total: totalCount || 0,
      claimed: claimedCount || 0,
      unclaimed: unclaimedCount || 0,
      bySource: sourceCounts,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error counting boats:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}






