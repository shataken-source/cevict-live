import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = supabaseUrl && supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

// Get crawler status and statistics
export async function GET(request: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    // Get all tracked shelters
    const { data: shelters, error: sheltersError } = await supabase
      .from('shelter_tracking')
      .select('*')
      .order('last_scanned_at', { ascending: false });

    if (sheltersError) {
      return NextResponse.json({ error: sheltersError.message }, { status: 500 });
    }

    // Calculate statistics
    const stats = {
      totalShelters: shelters?.length || 0,
      activeShelters: shelters?.filter(s => s.is_active && !s.is_blocked).length || 0,
      blockedShelters: shelters?.filter(s => s.is_blocked).length || 0,
      sheltersByType: {
        shelter: shelters?.filter(s => s.shelter_type === 'shelter').length || 0,
        rescue: shelters?.filter(s => s.shelter_type === 'rescue').length || 0,
        community_page: shelters?.filter(s => s.shelter_type === 'community_page').length || 0,
        community_group: shelters?.filter(s => s.shelter_type === 'community_group').length || 0
      },
      totalPetsFound: shelters?.reduce((sum, s) => sum + (s.total_pets_found || 0), 0) || 0,
      totalScans: shelters?.reduce((sum, s) => sum + (s.scan_count || 0), 0) || 0,
      nextScansDue: shelters?.filter(s => s.is_active && new Date(s.next_scan_at) <= new Date()).length || 0
    };

    // Get shelters due for scanning
    const { data: dueShelters } = await supabase
      .from('shelter_tracking')
      .select('*')
      .eq('is_active', true)
      .lte('next_scan_at', new Date().toISOString())
      .order('next_scan_at', { ascending: true })
      .limit(10);

    return NextResponse.json({
      success: true,
      stats,
      shelters: shelters || [],
      dueShelters: dueShelters || [],
      message: `Tracking ${stats.totalShelters} shelters. ${stats.nextScansDue} due for scanning.`
    });

  } catch (error: any) {
    console.error('[CRAWLER STATUS] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Unknown error' },
      { status: 500 }
    );
  }
}


