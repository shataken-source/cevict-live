import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = supabaseUrl && supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

export async function POST(request: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { migrationName } = body;

    // Check if table already exists
    let tableName = '';
    if (migrationName === 'pet_alerts') {
      tableName = 'pet_alerts';
    } else if (migrationName === 'lost_pets') {
      tableName = 'lost_pets';
    } else if (migrationName === 'shelters') {
      tableName = 'shelters';
    } else {
      return NextResponse.json(
        { error: 'Unknown migration name' },
        { status: 400 }
      );
    }

    // Check if table exists
    const { error: checkError } = await supabase
      .from(tableName)
      .select('*')
      .limit(1);

    if (!checkError) {
      return NextResponse.json({
        success: true,
        message: `✅ The ${tableName} table already exists! No migration needed.`
      });
    }

    // Table doesn't exist - provide instructions
    if (checkError.code === '42P01' || checkError.message?.includes('does not exist')) {
      return NextResponse.json({
        success: false,
        message: `❌ The ${tableName} table doesn't exist yet. Please run the SQL migration in your Supabase dashboard:\n\n1. Go to your Supabase project\n2. Click "SQL Editor"\n3. Copy and paste the SQL from: supabase/migrations/create_pet_alerts_table.sql\n4. Click "Run"\n\nOr use the Supabase CLI: supabase migration up`,
        needsManualMigration: true,
        sqlFile: migrationName === 'pet_alerts' ? 'create_pet_alerts_table.sql' : 
                 migrationName === 'lost_pets' ? 'CREATE_LOST_PETS_TABLE.sql' :
                 'UPDATE_SHELTERS_TABLE.sql'
      });
    }

    return NextResponse.json({
      success: false,
      error: checkError.message || 'Unknown error checking table'
    }, { status: 500 });

  } catch (error: any) {
    console.error('[RUN MIGRATION] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to check migration status' },
      { status: 500 }
    );
  }
}

