import { createSupabaseServiceClient } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

// Check website uptime (auth required; must own website)
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
    }

    const body = await request.json();
    const { websiteId, url } = body;

    if (!websiteId || !url) {
      return NextResponse.json(
        { error: 'Website ID and URL are required' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseServiceClient();
    const { data: site } = await supabase
      .from('monitored_websites')
      .select('id, owner_id')
      .eq('id', websiteId)
      .eq('owner_id', userId)
      .single();
    if (!site) {
      return NextResponse.json({ error: 'Website not found or access denied' }, { status: 404 });
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

    // Check if we need to send alert (use owner's alert config)
    if (status === 'down') {
      await checkAndSendAlert(supabase, websiteId, site.owner_id ?? undefined, 'uptime', 'critical', `Website ${url} is DOWN`);
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
  ownerId: string | undefined,
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

  // Get alert config for this site's owner (or legacy global row where user_id IS NULL)
  const configQuery = ownerId
    ? supabase.from('alert_config').select('sms_phone, email, critical_only').eq('user_id', ownerId).maybeSingle()
    : supabase.from('alert_config').select('sms_phone, email, critical_only').is('user_id', null).limit(1).maybeSingle();
  const { data: config } = await configQuery;

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

