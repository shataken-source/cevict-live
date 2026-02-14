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
    const { 
      shelter_name, 
      email, 
      password, 
      phone, 
      address, 
      city, 
      state, 
      zipcode,
      shelter_url,
      shelter_type = 'adoptapet'
    } = body;

    if (!shelter_name || !email || !password) {
      return NextResponse.json(
        { error: 'Shelter name, email, and password required' },
        { status: 400 }
      );
    }

    // Check if email already exists
    const { data: existing } = await supabase
      .from('shelters')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 400 });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create shelter
    const { data: newShelter, error: createError } = await supabase
      .from('shelters')
      .insert({
        shelter_name,
        email,
        password_hash: passwordHash,
        phone,
        address,
        city,
        state,
        zipcode,
        shelter_url,
        shelter_type,
        login_enabled: true,
        auto_scrape_enabled: false
      })
      .select()
      .single();

    if (createError) {
      console.error('[SHELTER REGISTER] Error:', createError);
      return NextResponse.json(
        { error: 'Failed to create shelter', details: createError.message },
        { status: 500 }
      );
    }

    // Return shelter info (without password hash)
    const { password_hash, ...shelterInfo } = newShelter;

    return NextResponse.json({
      success: true,
      shelter: shelterInfo,
      message: 'Shelter registered successfully'
    });

  } catch (error: any) {
    console.error('[SHELTER REGISTER] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Unknown error' },
      { status: 500 }
    );
  }
}


