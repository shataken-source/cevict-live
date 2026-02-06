import { createSupabaseClient } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

// Check website uptime
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { websiteId, url } = body;

    if (!websiteId || !url) {
      return NextResponse.json(
        { error: 'Website ID and URL are required' },
        { status: 400 }
      );
    }

    const startTime = Date.now();
    let status: 'up' | 'down' | 'slow' = 'up';
    let responseTime: number | null = null;
    let statusCode: number | null = null;
    let errorMessage: string | null = null;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(url, {
        method: 'HEAD',
        signal: controller.signal,
        headers: {
          'User-Agent': 'WebsiteMonitor/1.0',
        },
      });

      clearTimeout(timeoutId);
      responseTime = Date.now() - startTime;
      statusCode = response.status;

      if (!response.ok) {
        status = 'down';
        errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      } else if (responseTime > 5000) {
        status = 'slow';
      }
    } catch (error: any) {
      responseTime = Date.now() - startTime;
      status = 'down';
      errorMessage = error.message || 'Connection failed';

      if (error.name === 'AbortError') {
        errorMessage = 'Request timeout (10s)';
      }
    }

    // Save check result
    const supabase = createSupabaseClient();
    const { error: saveError } = await supabase
      .from('uptime_checks')
      .insert({
        website_id: websiteId,
        status,
        response_time: responseTime,
        status_code: statusCode,
        error_message: errorMessage,
      });

    if (saveError) {
      console.error('Error saving uptime check:', saveError);
    }

    // Check if we need to send alert
    if (status === 'down') {
      await checkAndSendAlert(supabase, websiteId, 'uptime', 'critical', `Website ${url} is DOWN`);
    }

    return NextResponse.json({
      status,
      responseTime,
      statusCode,
      errorMessage,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error checking website:', error);
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
  // Only send alerts for critical issues
  if (severity !== 'critical') return;

  // Check if alert already sent recently (within last 5 minutes)
  const { data: recentAlerts } = await supabase
    .from('alerts')
    .select('id')
    .eq('website_id', websiteId)
    .eq('alert_type', alertType)
    .eq('severity', severity)
    .eq('resolved', false)
    .gte('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString())
    .limit(1);

  if (recentAlerts && recentAlerts.length > 0) {
    return; // Already alerted recently
  }

  // Create alert
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

  // Get alert config
  const { data: config } = await supabase
    .from('alert_config')
    .select('sms_phone, critical_only')
    .limit(1)
    .single();

  if (config && config.sms_phone && (!config.critical_only || severity === 'critical')) {
    // Send SMS (absolute URL for server-side call)
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

      // Update alert
      await supabase
        .from('alerts')
        .update({ sms_sent: true })
        .eq('id', alert.id);
    } catch (error) {
      console.error('Error sending SMS:', error);
    }
  }
}

