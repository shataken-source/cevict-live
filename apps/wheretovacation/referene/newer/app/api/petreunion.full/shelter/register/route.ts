import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = supabaseUrl && supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

export async function POST(request: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const rawShelterName = typeof body?.shelter_name === 'string' ? body.shelter_name.trim() : '';
    const rawEmail = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
    const rawPassword = typeof body?.password === 'string' ? body.password : '';
    const rawPhone = typeof body?.phone === 'string' ? body.phone : undefined;
    const rawAddress = typeof body?.address === 'string' ? body.address.trim() : undefined;
    const rawCity = typeof body?.city === 'string' ? body.city.trim() : undefined;
    const rawState = typeof body?.state === 'string' ? body.state.trim().toUpperCase() : undefined;
    const rawZip = typeof body?.zipcode === 'string' ? body.zipcode.trim() : undefined;
    const rawUrl = typeof body?.shelter_url === 'string' ? body.shelter_url.trim() : undefined;
    const rawType = typeof body?.shelter_type === 'string' ? body.shelter_type.trim().toLowerCase() : 'adoptapet';

    const allowedTypes = new Set(['adoptapet', 'pawboost', 'facebook', 'manual', 'other']);
    const shelter_type = allowedTypes.has(rawType) ? rawType : 'adoptapet';

    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail);
    if (!rawShelterName || !rawEmail || !rawPassword) {
      return NextResponse.json(
        { error: 'Shelter name, email, and password required' },
        { status: 400 }
      );
    }
    if (!emailOk) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
    }
    if (rawPassword.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    const phone = typeof rawPhone === 'string' ? rawPhone.replace(/\D/g, '') : undefined;
    const zipcode = typeof rawZip === 'string' ? rawZip.replace(/\D/g, '').slice(0, 10) : undefined;
    const state = rawState && /^[A-Z]{2}$/.test(rawState) ? rawState : undefined;
    const shelter_url = rawUrl ? rawUrl : undefined;

    if (shelter_url) {
      try {
        new URL(shelter_url);
      } catch {
        return NextResponse.json({ error: 'Invalid shelter_url' }, { status: 400 });
      }
    }

    // Check if email already exists
    const { data: existing, error: existingError } = await supabase
      .from('shelters')
      .select('id')
      .eq('email', rawEmail)
      .maybeSingle();

    if (existingError) {
      console.error('[SHELTER REGISTER] Error checking existing email:', existingError);
      return NextResponse.json({ error: 'Failed to validate email' }, { status: 500 });
    }

    if (existing) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 400 });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(rawPassword, 10);

    // Create shelter
    const { data: newShelter, error: createError } = await supabase
      .from('shelters')
      .insert({
        shelter_name: rawShelterName,
        email: rawEmail,
        password_hash: passwordHash,
        phone,
        address: rawAddress,
        city: rawCity,
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
        {
          error: 'Failed to create shelter',
          ...(process.env.NODE_ENV !== 'production' ? { details: createError.message } : {}),
        },
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


