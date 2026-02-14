import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export async function POST(request: NextRequest) {
  try {
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false }
    });

    // Check if table exists
    const { error: checkError } = await supabase
      .from('lost_pets')
      .select('id')
      .limit(1);

    if (!checkError || checkError.code === 'PGRST116') {
      // Table doesn't exist, create it
      const fs = require('fs');
      const path = require('path');
      
      const sqlPath = path.join(process.cwd(), 'CREATE_LOST_PETS_TABLE.sql');
      const sql = fs.readFileSync(sqlPath, 'utf8');

      // Split SQL into individual statements
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      // Execute each statement
      for (const statement of statements) {
        if (statement) {
          const { error } = await supabase.rpc('exec_sql', { sql: statement });
          if (error && !error.message.includes('already exists')) {
            console.error('SQL error:', error);
          }
        }
      }

      return NextResponse.json({
        success: true,
        message: 'Table created successfully'
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Table already exists'
    });

  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}





