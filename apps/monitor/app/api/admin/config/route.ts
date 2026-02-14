import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServiceClient } from '@/lib/supabase';
import { auth } from '@clerk/nextjs/server';

// GET - Get alert configuration for current user (auth required)
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
    }

    let supabase;
    try {
      supabase = createSupabaseServiceClient();
    } catch (e: any) {
      return NextResponse.json({
        config: { sms_phone: '', email: '', critical_only: true },
      });
    }
    const { data, error } = await supabase
      .from('alert_config')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching config:', error);
      return NextResponse.json({ error: 'Failed to fetch config' }, { status: 500 });
    }

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

// POST/PUT - Update alert configuration for current user (auth required)
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
    }

    const body = await request.json();
    const { sms_phone, email, critical_only } = body;

    let supabase;
    try {
      supabase = createSupabaseServiceClient();
    } catch (e: any) {
      return NextResponse.json({
        error: 'Supabase not configured. Add NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to .env.local.',
      }, { status: 503 });
    }

    const { data: existing } = await supabase
      .from('alert_config')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    const updateData: Record<string, unknown> = {
      sms_phone: sms_phone !== undefined ? String(sms_phone) : undefined,
      email: email !== undefined ? String(email) : undefined,
      critical_only: critical_only !== undefined ? Boolean(critical_only) : undefined,
    };
    const clean: Record<string, unknown> = {};
    if (updateData.sms_phone !== undefined) clean.sms_phone = updateData.sms_phone;
    if (updateData.email !== undefined) clean.email = updateData.email;
    if (updateData.critical_only !== undefined) clean.critical_only = updateData.critical_only;

    let result;
    if (existing?.id && Object.keys(clean).length > 0) {
      const { data, error } = await supabase
        .from('alert_config')
        .update(clean)
        .eq('id', existing.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating config:', error);
        if (String(error.message).toLowerCase().includes('invalid api key')) {
          throw new Error('Invalid Supabase key. In apps/monitor/.env.local set SUPABASE_SERVICE_ROLE_KEY to the Service Role key from Supabase Dashboard → Project Settings → API (not the anon key).');
        }
        throw new Error(`Update failed: ${error.message}`);
      }
      result = data;
    } else if (existing?.id) {
      result = existing;
    } else {
      const { data, error } = await supabase
        .from('alert_config')
        .insert({
          user_id: userId,
          sms_phone: (sms_phone !== undefined ? String(sms_phone) : '') || '',
          email: (email !== undefined ? String(email) : '') || '',
          critical_only: critical_only !== undefined ? Boolean(critical_only) : true,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating config:', error);
        if (error.code === '42P01' || String(error.message).includes('does not exist')) {
          throw new Error('Table alert_config missing or missing user_id column. Run migration 20260209000000_monitor_rls_and_alert_per_user.sql');
        }
        if (String(error.message).toLowerCase().includes('invalid api key')) {
          throw new Error('Invalid Supabase key. In apps/monitor/.env.local set SUPABASE_SERVICE_ROLE_KEY to the Service Role key from Supabase Dashboard → Project Settings → API (not the anon key).');
        }
        throw new Error(`Insert failed: ${error.message}`);
      }
      result = data;
    }

    return NextResponse.json({ config: result, success: true });
  } catch (error: any) {
    console.error('Error updating config:', error);
    let message = error.message || 'Internal server error';
    if (message.includes('fetch failed') || (error.cause && String(error.cause).includes('fetch'))) {
      message = 'Cannot reach Supabase. Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in apps/monitor/.env.local and that the alert_config migration has been run.';
    }
    return NextResponse.json({ 
      error: message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    }, { status: 500 });
  }
}

