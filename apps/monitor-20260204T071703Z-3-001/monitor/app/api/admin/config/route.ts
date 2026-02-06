import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseClient } from '@/lib/supabase';

// GET - Get alert configuration
export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseClient();
    const { data, error } = await supabase
      .from('alert_config')
      .select('*')
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error fetching config:', error);
      return NextResponse.json({ error: 'Failed to fetch config' }, { status: 500 });
    }

    // Return default if no config exists
    return NextResponse.json({
      config: data || {
        sms_phone: '',
        email: '',
        critical_only: true,
      },
    });
  } catch (error: any) {
    console.error('Error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

// POST/PUT - Update alert configuration
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sms_phone, email, critical_only } = body;

    const supabase = createSupabaseClient();

    // Check if config exists (handle case where no rows exist)
    const { data: existing, error: checkError } = await supabase
      .from('alert_config')
      .select('id')
      .limit(1)
      .maybeSingle(); // Use maybeSingle() instead of single() to handle no rows

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking existing config:', checkError);
      throw new Error(`Database error: ${checkError.message}`);
    }

    let result;
    if (existing && existing.id) {
      // Update existing
      const updateData: any = {};
      if (sms_phone !== undefined) updateData.sms_phone = sms_phone;
      if (email !== undefined) updateData.email = email;
      if (critical_only !== undefined) updateData.critical_only = critical_only;

      const { data, error } = await supabase
        .from('alert_config')
        .update(updateData)
        .eq('id', existing.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating config:', error);
        throw new Error(`Update failed: ${error.message} (code: ${error.code})`);
      }
      result = data;
    } else {
      // Create new
      const { data, error } = await supabase
        .from('alert_config')
        .insert({
          sms_phone: sms_phone || '',
          email: email || '',
          critical_only: critical_only !== undefined ? critical_only : true,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating config:', error);
        // Check if table exists
        if (error.code === '42P01' || error.message.includes('does not exist')) {
          throw new Error('Database table "alert_config" does not exist. Please run the migration: apps/monitor/supabase/migrations/20250126_website_monitor.sql');
        }
        throw new Error(`Insert failed: ${error.message} (code: ${error.code})`);
      }
      result = data;
    }

    return NextResponse.json({ config: result, success: true });
  } catch (error: any) {
    console.error('Error updating config:', error);
    return NextResponse.json({ 
      error: error.message || 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}

