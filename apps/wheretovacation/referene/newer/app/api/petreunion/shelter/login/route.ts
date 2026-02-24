import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = supabaseUrl && supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

export async function POST(request: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
    }

    // Find shelter by email
    const { data: shelter, error: shelterError } = await supabase
      .from('shelters')
      .select('*')
      .eq('email', email)
      .eq('login_enabled', true)
      .single();

    if (shelterError || !shelter) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Verify password
    if (!shelter.password_hash) {
      return NextResponse.json({ error: 'Password not set for this shelter' }, { status: 401 });
    }

    const passwordValid = await bcrypt.compare(password, shelter.password_hash);
    if (!passwordValid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Return shelter info (without password hash)
    const { password_hash, ...shelterInfo } = shelter;

    return NextResponse.json({
      success: true,
      shelter: shelterInfo,
      message: 'Login successful'
    });

  } catch (error: any) {
    console.error('[SHELTER LOGIN] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Unknown error' },
      { status: 500 }
    );
  }
}


