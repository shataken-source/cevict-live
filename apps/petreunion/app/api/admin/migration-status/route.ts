import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { isAdminAuthed } from '@/lib/admin-auth';

function getSupabase() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase credentials');
  return createClient(url, key);
}

const LOST_PETS_REQUIRED_COLUMNS = [
  'age',
  'gender',
  'source_platform',
  'source_url',
  'source_post_id',
  'shelter_name',
] as const;

async function columnExists(supabase: any, table: string, column: string): Promise<boolean> {
  // If the column doesn't exist, PostgREST returns an error like:
  // "Could not find the 'age' column of 'lost_pets' in the schema cache"
  const { error } = await supabase.from(table).select(column).limit(1);
  return !error;
}

async function tableExists(supabase: any, table: string): Promise<boolean> {
  const { error } = await supabase.from(table).select('*').limit(1);
  return !error;
}

export async function GET(request: NextRequest) {
  try {
    if (!isAdminAuthed(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const supabase = getSupabase();

    const missingLostPetsCols: string[] = [];
    for (const col of LOST_PETS_REQUIRED_COLUMNS) {
      // eslint-disable-next-line no-await-in-loop
      const ok = await columnExists(supabase, 'lost_pets', col);
      if (!ok) missingLostPetsCols.push(col);
    }

    const hasLostPetMatches = await tableExists(supabase, 'lost_pet_matches');
    const hasPreRegisteredPets = await tableExists(supabase, 'pre_registered_pets');
    const hasPreRegisteredMatches = await tableExists(supabase, 'pre_registered_pet_matches');

    const missingTables = [
      ...(hasLostPetMatches ? [] : ['lost_pet_matches']),
      ...(hasPreRegisteredPets ? [] : ['pre_registered_pets']),
      ...(hasPreRegisteredMatches ? [] : ['pre_registered_pet_matches']),
    ];

    const success = missingLostPetsCols.length === 0 && missingTables.length === 0;
    return NextResponse.json({
      success,
      message: success
        ? 'Database migration looks good (required columns/tables present).'
        : 'Migration incomplete: missing required columns/tables.',
      missing: {
        lost_pets_columns: missingLostPetsCols,
        tables: missingTables,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to check migration status' },
      { status: 500 }
    );
  }
}

