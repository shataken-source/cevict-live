import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = supabaseUrl && supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

export async function POST(request: Request) {
  try {
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database not configured. Please check your Supabase environment variables.' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { email, name, pet_type, breed, location_city, location_state, size, age_range, gender } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Insert alert
    const { data: alert, error } = await supabase
      .from('pet_alerts')
      .insert({
        email: email.toLowerCase().trim(),
        name: name || null,
        pet_type: pet_type || null,
        breed: breed || null,
        location_city: location_city || null,
        location_state: location_state || null,
        size: size || null,
        age_range: age_range || null,
        gender: gender || null,
        is_active: true
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating alert:', error);
      // Check if table doesn't exist
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        return NextResponse.json(
          { 
            error: 'Database table not set up yet. Please run the migration to create the pet_alerts table.',
            message: error.message,
            code: error.code
          },
          { status: 500 }
        );
      }
      return NextResponse.json(
        { error: 'Failed to create alert', message: error.message, code: error.code },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      alert: alert
    });

  } catch (error: any) {
    console.error('Error in alerts API:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database not configured. Please check your Supabase environment variables.' },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Get all alerts for this email
    const { data: alerts, error } = await supabase
      .from('pet_alerts')
      .select('*')
      .eq('email', email.toLowerCase().trim())
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching alerts:', error);
      return NextResponse.json(
        { error: 'Failed to fetch alerts', message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      alerts: alerts || []
    });

  } catch (error: any) {
    console.error('Error in alerts API:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}













