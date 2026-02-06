import { createSupabaseClient } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

// GET - Get bot statuses for a website
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const websiteId = searchParams.get('websiteId');

    if (!websiteId) {
      return NextResponse.json({ error: 'Website ID is required' }, { status: 400 });
    }

    const supabase = createSupabaseClient();
    const { data, error } = await supabase
      .from('bot_status')
      .select('*')
      .eq('website_id', websiteId)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching bot status:', error);
      return NextResponse.json({ error: 'Failed to fetch bot status' }, { status: 500 });
    }

    return NextResponse.json({ bots: data || [] });
  } catch (error: any) {
    console.error('Error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

// POST - Update bot status
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { websiteId, botName, status, errorMessage, metadata } = body;

    if (!websiteId || !botName || !status) {
      return NextResponse.json(
        { error: 'Website ID, bot name, and status are required' },
        { status: 400 }
      );
    }

    if (!['running', 'waiting', 'broken'].includes(status)) {
      return NextResponse.json(
        { error: 'Status must be: running, waiting, or broken' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseClient();

    // Check if bot status exists
    const { data: existing } = await supabase
      .from('bot_status')
      .select('id')
      .eq('website_id', websiteId)
      .eq('bot_name', botName)
      .single();

    let result;
    if (existing) {
      // Update existing
      const { data, error } = await supabase
        .from('bot_status')
        .update({
          status,
          error_message: errorMessage || null,
          metadata: metadata || null,
          last_check: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw error;
      result = data;
    } else {
      // Create new
      const { data, error } = await supabase
        .from('bot_status')
        .insert({
          website_id: websiteId,
          bot_name: botName,
          status,
          error_message: errorMessage || null,
          metadata: metadata || null,
        })
        .select()
        .single();

      if (error) throw error;
      result = data;
    }

    // Send alert if bot is broken
    if (status === 'broken') {
      await checkAndSendAlert(
        supabase,
        websiteId,
        'bot',
        'critical',
        `Bot "${botName}" is BROKEN: ${errorMessage || 'Unknown error'}`
      );
    }

    return NextResponse.json({ bot: result });
  } catch (error: any) {
    console.error('Error updating bot status:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

async function checkAndSendAlert(
  supabase: any,
  websiteId: string,
  alertType: string,
  severity: string,
  message: string
) {
  if (severity !== 'critical') return;

  const { data: recentAlerts } = await supabase
    .from('alerts')
    .select('id')
    .eq('website_id', websiteId)
    .eq('alert_type', alertType)
    .eq('severity', severity)
    .eq('resolved', false)
    .gte('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString())
    .limit(1);

  if (recentAlerts && recentAlerts.length > 0) return;

  const { data: alert } = await supabase
    .from('alerts')
    .insert({
      website_id: websiteId,
      alert_type: alertType,
      severity,
      message,
    })
    .select()
    .single();

  const { data: config } = await supabase
    .from('alert_config')
    .select('sms_phone, critical_only')
    .limit(1)
    .single();

  if (config && config.sms_phone && (!config.critical_only || severity === 'critical')) {
    const base = process.env.NEXT_PUBLIC_BASE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3010');
    try {
      await fetch(`${base}/api/alerts/sms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: config.sms_phone,
          message: `🚨 CRITICAL: ${message}`,
        }),
      });

      await supabase
        .from('alerts')
        .update({ sms_sent: true })
        .eq('id', alert.id);
    } catch (error) {
      console.error('Error sending SMS:', error);
    }
  }
}

