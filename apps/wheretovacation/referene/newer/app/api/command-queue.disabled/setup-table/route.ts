import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export async function POST(request: NextRequest) {
  try {
    const adminToken = process.env.COMMAND_QUEUE_ADMIN_TOKEN || '';
    const provided = request.headers.get('x-admin-token') || '';

    if (!adminToken || provided !== adminToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    const { error: checkError } = await supabase.from('command_queue').select('id').limit(1);

    if (!checkError || checkError.code === 'PGRST116') {
      const fs = require('fs');
      const path = require('path');

      const sqlPath = path.join(process.cwd(), 'CREATE_COMMAND_QUEUE_TABLE.sql');
      const sql = fs.readFileSync(sqlPath, 'utf8');

      const statements = sql
        .split(';')
        .map((s: string) => s.trim())
        .filter((s: string) => s.length > 0 && !s.startsWith('--'));

      for (const statement of statements) {
        if (!statement) continue;
        const { error } = await supabase.rpc('exec_sql', { sql: statement });
        if (error && !error.message.includes('already exists')) {
          console.error('SQL error:', error);
        }
      }

      return NextResponse.json({ success: true, message: 'Table created successfully' });
    }

    return NextResponse.json({ success: true, message: 'Table already exists' });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Unknown error' }, { status: 500 });
  }
}
