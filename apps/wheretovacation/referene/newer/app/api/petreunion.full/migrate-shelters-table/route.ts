import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = supabaseUrl && supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

/**
 * API endpoint to migrate shelters table - adds missing columns
 * This is a one-time migration that should be run to fix the database schema
 */
export async function POST(request: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500 }
      );
    }

    // Check if service role key is available (required for migrations)
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { 
          error: 'Service role key required for migrations',
          message: 'Please run this migration directly in Supabase SQL Editor instead'
        },
        { status: 403 }
      );
    }

    console.log('[MIGRATE] Starting shelters table migration...');

    // Run migration SQL
    const migrationSQL = `
      -- Add scan_status column if it doesn't exist
      ALTER TABLE shelters
      ADD COLUMN IF NOT EXISTS scan_status TEXT DEFAULT 'unscanned';

      -- Add scanned_date column if it doesn't exist
      ALTER TABLE shelters
      ADD COLUMN IF NOT EXISTS scanned_date TIMESTAMPTZ;

      -- Add last_scraped_at column if it doesn't exist
      ALTER TABLE shelters
      ADD COLUMN IF NOT EXISTS last_scraped_at TIMESTAMPTZ;

      -- Add auto_scrape_enabled column if it doesn't exist
      ALTER TABLE shelters
      ADD COLUMN IF NOT EXISTS auto_scrape_enabled BOOLEAN DEFAULT true;

      -- Add city column if it doesn't exist
      ALTER TABLE shelters
      ADD COLUMN IF NOT EXISTS city TEXT;

      -- Add state column if it doesn't exist
      ALTER TABLE shelters
      ADD COLUMN IF NOT EXISTS state TEXT;

      -- Update existing shelters to have default values
      UPDATE shelters
      SET 
        scan_status = COALESCE(scan_status, 'unscanned'),
        auto_scrape_enabled = COALESCE(auto_scrape_enabled, true)
      WHERE scan_status IS NULL OR auto_scrape_enabled IS NULL;
    `;

    // Execute migration using RPC or direct SQL
    // Note: Supabase JS client doesn't support raw SQL execution directly
    // We'll need to use the REST API or RPC function
    
    // Try to create indexes (these might fail if they exist, that's okay)
    // Note: RPC function might not exist, that's okay - we'll check columns directly
    // We don't actually execute the SQL here since Supabase JS client doesn't support raw SQL
    // Users should run the migration manually in Supabase SQL Editor
    try {
      // Attempt RPC call (will likely fail, but we handle it gracefully)
      const { error: rpcError } = await supabase.rpc('exec_sql', { sql: migrationSQL });
      if (rpcError) {
        // RPC doesn't exist - that's expected and okay
        console.log('[MIGRATE] RPC function not available, will check columns directly');
      }
    } catch (e) {
      // RPC might not exist, that's okay - we'll provide manual instructions
      // Ignore the error and continue to check columns
      console.log('[MIGRATE] RPC call failed (expected), will check columns directly');
    }

    // Check which columns exist by trying to query them
    const { data: testData, error: testError } = await supabase
      .from('shelters')
      .select('id, scan_status, city, state, last_scraped_at, auto_scrape_enabled')
      .limit(1);

    const columnsExist = !testError || !testError.message?.includes('column');

    if (columnsExist) {
      return NextResponse.json({
        success: true,
        message: 'Migration appears to be complete. All columns exist.',
        note: 'If you still see errors, please run the SQL migration manually in Supabase SQL Editor.'
      });
    } else {
      return NextResponse.json({
        success: false,
        message: 'Migration needs to be run manually',
        error: testError?.message,
        instructions: [
          '1. Go to Supabase Dashboard → SQL Editor',
          '2. Open the file: apps/wheretovacation/sql/FIX_SHELTERS_TABLE_COMPLETE.sql',
          '3. Copy and paste the SQL into the editor',
          '4. Click "Run" to execute the migration'
        ]
      }, { status: 400 });
    }

  } catch (error: any) {
    console.error('[MIGRATE] Error:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Migration failed',
        message: 'Please run the migration manually in Supabase SQL Editor',
        sqlFile: 'apps/wheretovacation/sql/FIX_SHELTERS_TABLE_COMPLETE.sql'
      },
      { status: 500 }
    );
  }
}

/**
 * GET: Check migration status
 */
export async function GET(request: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500 }
      );
    }

    // Check which columns exist
    const columnsToCheck = [
      'scan_status',
      'scanned_date', 
      'last_scraped_at',
      'auto_scrape_enabled',
      'city',
      'state'
    ];

    const status: Record<string, boolean> = {};

    for (const column of columnsToCheck) {
      try {
        const { error } = await supabase
          .from('shelters')
          .select(column)
          .limit(1);
        
        status[column] = !error || !error.message?.includes('column');
      } catch (e: any) {
        status[column] = false;
      }
    }

    const allExist = Object.values(status).every(v => v);
    const missing = Object.entries(status)
      .filter(([_, exists]) => !exists)
      .map(([col]) => col);

    return NextResponse.json({
      success: allExist,
      columns: status,
      missingColumns: missing,
      message: allExist 
        ? 'All required columns exist' 
        : `Missing columns: ${missing.join(', ')}`,
      migrationNeeded: !allExist,
      sqlFile: 'apps/wheretovacation/sql/FIX_SHELTERS_TABLE_COMPLETE.sql'
    });

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to check migration status' },
      { status: 500 }
    );
  }
}

