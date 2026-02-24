import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = supabaseUrl && supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

/**
 * Verify database - Show sample records and stats
 */
export async function GET(request: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500 }
      );
    }

    // Get total count
    const { count: totalPets } = await supabase
      .from('lost_pets')
      .select('*', { count: 'exact', head: true });

    // Get sample records (10 recent)
    const { data: samplePets, error: sampleError } = await supabase
      .from('lost_pets')
      .select('id, pet_name, pet_type, breed, color, location_city, location_state, status, photo_url, description, created_at')
      .order('created_at', { ascending: false })
      .limit(10);

    if (sampleError) throw sampleError;

    // Get breakdown by status
    const { data: statusBreakdown } = await supabase
      .from('lost_pets')
      .select('status');

    const statusCounts: Record<string, number> = {};
    statusBreakdown?.forEach(pet => {
      statusCounts[pet.status] = (statusCounts[pet.status] || 0) + 1;
    });

    // Get breakdown by pet type
    const { data: typeBreakdown } = await supabase
      .from('lost_pets')
      .select('pet_type');

    const typeCounts: Record<string, number> = {};
    typeBreakdown?.forEach(pet => {
      typeCounts[pet.pet_type] = (typeCounts[pet.pet_type] || 0) + 1;
    });

    // Get breakdown by state
    const { data: stateBreakdown } = await supabase
      .from('lost_pets')
      .select('location_state')
      .not('location_state', 'is', null);

    const stateCounts: Record<string, number> = {};
    stateBreakdown?.forEach(pet => {
      const state = pet.location_state;
      stateCounts[state] = (stateCounts[state] || 0) + 1;
    });

    // Check data quality
    const { count: withPhotosCount } = await supabase
      .from('lost_pets')
      .select('id', { count: 'exact', head: true })
      .not('photo_url', 'is', null);

    const { count: withDescriptionsCount } = await supabase
      .from('lost_pets')
      .select('id', { count: 'exact', head: true })
      .not('description', 'is', null)
      .neq('description', '')
      .neq('description', 'Unknown');

    return NextResponse.json({
      success: true,
      summary: {
        totalPets: totalPets || 0,
        statusBreakdown: statusCounts,
        typeBreakdown: typeCounts,
        stateBreakdown: stateCounts,
        dataQuality: {
          withPhotos: withPhotosCount || 0,
          withDescriptions: withDescriptionsCount || 0,
          photoPercentage: totalPets ? Math.round(((withPhotosCount || 0) / totalPets) * 100) : 0,
          descriptionPercentage: totalPets ? Math.round(((withDescriptionsCount || 0) / totalPets) * 100) : 0
        }
      },
      sampleRecords: samplePets || [],
      message: `Database verification complete. Found ${totalPets || 0} pets.`
    });

  } catch (error: any) {
    console.error('[VERIFY] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to verify database' },
      { status: 500 }
    );
  }
}

