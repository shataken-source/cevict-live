import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export async function GET(request: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500 }
      );
    }

    // Check if table exists first
    const { data: tableCheck, error: tableError } = await supabase
      .from('lost_pets')
      .select('id')
      .limit(1);

    if (tableError && tableError.code === '42P01') {
      // Table doesn't exist
      return NextResponse.json({
        total_pets: 0,
        message: 'Database table not created yet. Run the migration first.',
        by_status: {},
        by_type: {},
        table_exists: false
      });
    }

    // Get total count
    const { count: totalCount, error: countError } = await supabase
      .from('lost_pets')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      throw countError;
    }

    // Get count by status
    const { data: statusData, error: statusError } = await supabase
      .from('lost_pets')
      .select('status');

    const byStatus: Record<string, number> = {};
    if (statusData) {
      statusData.forEach(pet => {
        byStatus[pet.status] = (byStatus[pet.status] || 0) + 1;
      });
    }

    // Get count by pet type
    const { data: typeData, error: typeError } = await supabase
      .from('lost_pets')
      .select('pet_type');

    const byType: Record<string, number> = {};
    if (typeData) {
      typeData.forEach(pet => {
        byType[pet.pet_type] = (byType[pet.pet_type] || 0) + 1;
      });
    }

    // Get count by shelter
    const { data: shelterData, error: shelterError } = await supabase
      .from('lost_pets')
      .select('shelter_id');

    const shelterCount = shelterData?.filter(p => p.shelter_id).length || 0;

    return NextResponse.json({
      total_pets: totalCount || 0,
      by_status: byStatus,
      by_type: byType,
      from_shelters: shelterCount,
      from_public: (totalCount || 0) - shelterCount,
      table_exists: true,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Stats error:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Failed to get stats',
        total_pets: 0,
        table_exists: false
      },
      { status: 500 }
    );
  }
}

