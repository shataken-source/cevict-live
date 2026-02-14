import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Need service role for deletion

const supabase = supabaseUrl && supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

export async function POST(request: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database not configured. Service role key required.' },
        { status: 500 }
      );
    }

    // Get confirmation from request
    const { confirm, dryRun = true } = await request.json();

    if (!confirm && !dryRun) {
      return NextResponse.json(
        { error: 'Must confirm deletion or use dryRun=true' },
        { status: 400 }
      );
    }

    // First, identify test data
    const { data: testPets, error: findError } = await supabase
      .from('lost_pets')
      .select('id, pet_name, owner_name, owner_email, created_at, status')
      .or(`
        pet_name.ilike.%test%,
        pet_name.ilike.%demo%,
        pet_name.ilike.%sample%,
        owner_name.ilike.%test%,
        owner_name.ilike.%demo%,
        owner_email.ilike.%test%,
        owner_email.ilike.%example%,
        owner_email.ilike.%@test.%,
        owner_email.ilike.%@example.%,
        owner_email.ilike.%@demo.%
      `);

    if (findError) {
      throw findError;
    }

    const testPetIds = testPets?.map(p => p.id) || [];

    // Also find old test data (30+ days old, still lost)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const { data: oldPets, error: oldError } = await supabase
      .from('lost_pets')
      .select('id')
      .eq('status', 'lost')
      .lt('created_at', thirtyDaysAgo.toISOString());

    const oldPetIds = oldPets?.map(p => p.id) || [];
    const allTestIds = [...new Set([...testPetIds, ...oldPetIds])];

    // DRY RUN - Just report what would be deleted
    if (dryRun) {
      return NextResponse.json({
        dryRun: true,
        testPetsFound: testPets?.length || 0,
        oldPetsFound: oldPets?.length || 0,
        totalToDelete: allTestIds.length,
        testPets: testPets,
        message: 'This is a dry run. Set dryRun=false and confirm=true to actually delete.'
      });
    }

    // ACTUAL DELETION
    if (!confirm) {
      return NextResponse.json(
        { error: 'Must set confirm=true to delete' },
        { status: 400 }
      );
    }

    // Delete test pets
    const { error: deleteError } = await supabase
      .from('lost_pets')
      .delete()
      .in('id', allTestIds);

    if (deleteError) {
      throw deleteError;
    }

    // Get final count
    const { count: finalCount } = await supabase
      .from('lost_pets')
      .select('*', { count: 'exact', head: true });

    return NextResponse.json({
      success: true,
      deleted: allTestIds.length,
      remainingPets: finalCount || 0,
      message: `Deleted ${allTestIds.length} test pets. ${finalCount || 0} pets remaining.`
    });

  } catch (error: any) {
    console.error('Cleanup error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to cleanup test data' },
      { status: 500 }
    );
  }
}

