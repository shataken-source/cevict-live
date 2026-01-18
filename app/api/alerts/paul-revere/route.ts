/**
 * SmokersRights Paul Revere Alert System API
 * Geo-targeted alerts for tobacco/vape regulations
 * 
 * The "Paul Revere" Algorithm:
 * If a new tax or ban is proposed in a specific ZIP code,
 * email registered users in that area immediately.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdminClient } from '@/lib/supabase';
import EmailService from '@/lib/emailService';
import SMSService from '@/lib/sms';

interface PaulRevereAlert {
  id: string;
  type: 'immediate' | 'urgent' | 'watch';
  scope: 'national' | 'state' | 'local';
  state?: string;
  zipCode?: string;
  headline: string;
  summary: string;
  source: string;
  actionRequired?: string;
  expiresAt?: string;
  sourceUrl?: string;
}

interface UserAlert {
  userId: string;
  email: string;
  phone?: string;
  alertId: string;
  channel: 'email' | 'sms' | 'push';
  status: 'pending' | 'sent' | 'failed';
}

/**
 * POST /api/alerts/paul-revere
 * Trigger a Paul Revere alert (manual)
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { alert } = body as { alert: PaulRevereAlert };

    if (!alert || !alert.headline) {
      return NextResponse.json(
        { error: 'Alert data required' },
        { status: 400 }
      );
    }

    console.log('🔔 Paul Revere Alert Triggered:', alert.headline);

    const supabase = getSupabaseAdminClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 });
    }

    // Determine target users based on scope
    const targetUsers = await getTargetUsers(supabase, alert);

    console.log(`📬 Targeting ${targetUsers.length} users for ${alert.scope} alert`);

    // Log the alert
    const { data: savedAlert, error: alertError } = await supabase
      .from('paul_revere_alerts')
      .insert({
        headline: alert.headline,
        summary: alert.summary,
        type: alert.type,
        scope: alert.scope,
        state: alert.state,
        zip_code: alert.zipCode,
        source: alert.source,
        target_count: targetUsers.length,
        source_url: alert.sourceUrl || null,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (alertError) {
      console.error('Failed to save alert:', alertError);
    }

    // Send trade signal to Alpha Hunter webhook
    if (alert.type === 'immediate' || (alert.type === 'urgent' && alert.scope === 'state')) {
      try {
        const alphaWebhook = process.env.ALPHA_HUNTER_WEBHOOK_URL;
        if (alphaWebhook) {
          const ticker = alert.headline?.toLowerCase().includes('vape') ? 'BTI' : 'MO';
          const signal = {
            ticker,
            action: 'SHORT',
            reason: `Legislative Alert: ${alert.headline}`,
            confidence: 85,
            state: alert.state,
            timestamp: new Date().toISOString(),
          };
          await fetch(alphaWebhook, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(signal),
          });
          console.log('📊 Trade Signal Synced to Alpha Hunter Bot');
        }
      } catch (e) {
        console.error('Failed to sync signal to trading bot:', e);
      }
    }

    // Dispatch notifications immediately (server-side)
    const dispatch = await dispatchToUsers(targetUsers, alert);

    return NextResponse.json({
      success: true,
      alertId: savedAlert?.id,
      targetUsers: targetUsers.length,
      sent: dispatch.sent,
      failed: dispatch.failed,
      scope: alert.scope,
      type: alert.type,
      message: `Paul Revere alert triggered for ${targetUsers.length} users`
    });

  } catch (error: any) {
    console.error('Paul Revere API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process alert' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/alerts/paul-revere
 * - If called by Vercel Cron: run the Paul Revere check (scrape + notify + persist)
 * - Otherwise: get recent alerts + stats
 */
export async function GET(req: NextRequest) {
  try {
    const isCron = req.headers.get('x-vercel-cron') === '1';
    const supabase = getSupabaseAdminClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 });
    }

    if (isCron) {
      const { scrapeRegulations } = require('@/scripts/regulation-scraper.js');
      const scraped = await scrapeRegulations();
      const regs = Array.isArray(scraped?.regulations) ? scraped.regulations : [];

      let alertsCreated = 0;
      let notificationsSent = 0;
      let notificationsFailed = 0;

      for (const reg of regs) {
        const regAlerts = Array.isArray(reg?.paulRevereAlerts) ? reg.paulRevereAlerts : [];
        for (const a of regAlerts) {
          const alert: PaulRevereAlert = {
            id: String(reg.id || ''),
            type: a.urgency === 'immediate' ? 'immediate' : a.urgency === 'urgent' ? 'urgent' : 'watch',
            scope: a.scope,
            state: a.state,
            zipCode: a.zipCode,
            headline: String(reg.headline || ''),
            summary: String(reg.summary || ''),
            source: String(reg.source || ''),
            sourceUrl: String(reg.url || ''),
          };

          // Deduplicate: same headline + scope/state/zip within 24h
          const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
          const { data: existing } = await supabase
            .from('paul_revere_alerts')
            .select('id')
            .eq('headline', alert.headline)
            .eq('scope', alert.scope)
            .eq('state', alert.state || null)
            .eq('zip_code', alert.zipCode || null)
            .gte('created_at', since)
            .maybeSingle();
          if (existing?.id) continue;

          const users = await getTargetUsers(supabase, alert);
          await supabase.from('paul_revere_alerts').insert({
            type: alert.type,
            scope: alert.scope,
            state: alert.state,
            zip_code: alert.zipCode,
            headline: alert.headline,
            summary: alert.summary,
            source: alert.source,
            source_url: alert.sourceUrl || null,
            matched_keywords: reg?.analysis?.matchedKeywords || [],
            target_count: users.length,
            created_at: new Date().toISOString(),
          } as any);
          alertsCreated++;

          const dispatch = await dispatchToUsers(users, alert);
          notificationsSent += dispatch.sent;
          notificationsFailed += dispatch.failed;
        }
      }

      return NextResponse.json({
        success: true,
        mode: 'cron',
        scraped: regs.length,
        alertsCreated,
        notificationsSent,
        notificationsFailed,
        timestamp: new Date().toISOString(),
      });
    }

    const { searchParams } = new URL(req.url);
    const scope = searchParams.get('scope');
    const state = searchParams.get('state');
    const limit = parseInt(searchParams.get('limit') || '20');

    let query = supabase
      .from('paul_revere_alerts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (scope) {
      query = query.eq('scope', scope);
    }

    if (state) {
      query = query.eq('state', state);
    }

    const { data: alerts, error } = await query;

    if (error) {
      throw error;
    }

    // Get stats
    const { data: stats } = await supabase
      .from('paul_revere_alerts')
      .select('scope, type')
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    const alertStats = {
      total: stats?.length || 0,
      byScope: {
        national: stats?.filter(s => s.scope === 'national').length || 0,
        state: stats?.filter(s => s.scope === 'state').length || 0,
        local: stats?.filter(s => s.scope === 'local').length || 0
      },
      byType: {
        immediate: stats?.filter(s => s.type === 'immediate').length || 0,
        urgent: stats?.filter(s => s.type === 'urgent').length || 0,
        watch: stats?.filter(s => s.type === 'watch').length || 0
      }
    };

    return NextResponse.json({
      success: true,
      alerts: alerts || [],
      stats: alertStats,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Paul Revere GET error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch alerts' },
      { status: 500 }
    );
  }
}

async function getTargetUsers(supabase: any, alert: PaulRevereAlert): Promise<any[]> {
  let query = supabase
    .from('unified_users')
    .select('id,email,phone,email_notifications,sms_notifications,notifications_enabled,state_code,zip_code')
    .eq('notifications_enabled', true);

  if (alert.scope === 'state' && alert.state) {
    query = query.eq('state_code', alert.state);
  }

  if (alert.scope === 'local' && alert.zipCode) {
    const prefix = String(alert.zipCode).slice(0, 3);
    query = query.like('zip_code', `${prefix}%`);
  }

  const { data, error } = await query.limit(1000);
  if (error) return [];
  return data || [];
}

async function dispatchToUsers(users: any[], alert: PaulRevereAlert): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;

  const emailService = EmailService.getInstance();
  const smsService = SMSService.getInstance();

  const subject = `🚨 ${alert.type.toUpperCase()} ${alert.scope.toUpperCase()} ALERT: ${alert.headline}`;
  const bodyText = `${alert.headline}\n\n${alert.summary || ''}\n\nSource: ${alert.source}\n${alert.sourceUrl || ''}`;

  for (const user of users) {
    try {
      const wantsEmail = !!user.email_notifications && !!user.email;
      const wantsSms = !!user.sms_notifications && !!user.phone;

      if (wantsEmail) {
        await emailService.sendEmail({
          to: user.email,
          subject,
          text: bodyText,
          html: `<h2>${alert.headline}</h2><p>${alert.summary || ''}</p><p><strong>Source:</strong> ${alert.source}</p>${alert.sourceUrl ? `<p><a href="${alert.sourceUrl}">${alert.sourceUrl}</a></p>` : ''}`,
        });
        sent++;
      }

      if (wantsSms) {
        await smsService.sendSMS({
          to: user.phone,
          body: `SmokersRights ${alert.type.toUpperCase()}: ${alert.headline}`.slice(0, 155),
          priority: alert.type === 'immediate' ? 'high' : 'normal',
        });
        sent++;
      }
    } catch {
      failed++;
    }
  }

  return { sent, failed };
}

