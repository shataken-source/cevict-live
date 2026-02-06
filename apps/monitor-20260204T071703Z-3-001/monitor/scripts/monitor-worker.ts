/**
 * Background worker to check website uptime and update bot status
 * Run this as a cron job or background service
 */

import { createSupabaseClient } from '../lib/supabase';

async function checkAllWebsites() {
  const supabase = createSupabaseClient();
  if (!supabase) {
    console.error('❌ Supabase not configured');
    return;
  }

  // Get all enabled websites
  const { data: websites, error } = await supabase
    .from('monitored_websites')
    .select('*')
    .eq('enabled', true);

  if (error) {
    console.error('❌ Error fetching websites:', error);
    return;
  }

  if (!websites || websites.length === 0) {
    console.log('ℹ️ No websites to monitor');
    return;
  }

  console.log(`🔍 Checking ${websites.length} website(s)...`);

  for (const website of websites) {
    try {
      // Check uptime
      const startTime = Date.now();
      let status: 'up' | 'down' | 'slow' = 'up';
      let responseTime: number | null = null;
      let statusCode: number | null = null;
      let errorMessage: string | null = null;

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(website.url, {
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
          website_id: website.id,
          status,
          response_time: responseTime,
          status_code: statusCode,
          error_message: errorMessage,
        });

      if (saveError) {
        console.error(`❌ Error saving check for ${website.name}:`, saveError);
      } else {
        console.log(`✅ ${website.name}: ${status.toUpperCase()} (${responseTime}ms)`);
      }

      // Check if we need to send alert
      if (status === 'down') {
        await checkAndSendAlert(supabase, website.id, 'uptime', 'critical', `Website ${website.url} is DOWN`);
      }

      // Wait a bit between checks to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error: any) {
      console.error(`❌ Error checking ${website.name}:`, error);
    }
  }

  console.log('✅ Monitoring cycle complete');
}

async function checkAndSendAlert(
  supabase: any,
  websiteId: string,
  alertType: string,
  severity: string,
  message: string
) {
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
    // Send SMS via API
    try {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3010';
      await fetch(`${baseUrl}/api/alerts/sms`, {
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

      console.log(`📱 SMS alert sent to ${config.sms_phone}`);
    } catch (error) {
      console.error('❌ Error sending SMS:', error);
    }
  }
}

export { checkAllWebsites };

// Run when this file is the entry point (works with tsx/esm and node)
const isEntry = typeof process !== 'undefined' && process.argv[1]?.includes('monitor-worker');
if (isEntry) {
  checkAllWebsites()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('❌ Fatal error:', error);
      process.exit(1);
    });
}

