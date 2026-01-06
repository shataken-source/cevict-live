/**
 * SmokersRights Paul Revere Alert System API
 * Geo-targeted alerts for tobacco/vape regulations
 * 
 * The "Paul Revere" Algorithm:
 * If a new tax or ban is proposed in a specific ZIP code,
 * email registered users in that area immediately.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

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
 * Trigger a Paul Revere alert
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

    // Determine target users based on scope
    let targetUsers: any[] = [];

    if (alert.scope === 'national') {
      // Get all users with alerts enabled
      const { data: users, error } = await supabase
        .from('users')
        .select('id, email, phone, preferences')
        .eq('alerts_enabled', true)
        .limit(1000);

      if (!error && users) {
        targetUsers = users;
      }
    } else if (alert.scope === 'state' && alert.state) {
      // Get users in specific state
      const { data: users, error } = await supabase
        .from('users')
        .select('id, email, phone, preferences')
        .eq('alerts_enabled', true)
        .eq('state', alert.state)
        .limit(500);

      if (!error && users) {
        targetUsers = users;
      }
    } else if (alert.scope === 'local' && alert.zipCode) {
      // Get users in specific ZIP code range
      const zipPrefix = alert.zipCode.substring(0, 3);
      const { data: users, error } = await supabase
        .from('users')
        .select('id, email, phone, preferences')
        .eq('alerts_enabled', true)
        .like('zip_code', `${zipPrefix}%`)
        .limit(200);

      if (!error && users) {
        targetUsers = users;
      }
    }

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
        action_required: alert.actionRequired,
        expires_at: alert.expiresAt,
        target_count: targetUsers.length,
        created_at: new Date().toISOString()
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

    // Queue alerts for each user
    const userAlerts: UserAlert[] = [];
    
    for (const user of targetUsers) {
      // Check user preferences for preferred channel
      const preferredChannel = user.preferences?.alertChannel || 'email';
      
      userAlerts.push({
        userId: user.id,
        email: user.email,
        phone: user.phone,
        alertId: savedAlert?.id || 'unknown',
        channel: preferredChannel,
        status: 'pending'
      });
    }

    // Queue for sending (in production, would use a queue service)
    if (userAlerts.length > 0) {
      // Batch insert pending alerts
      const { error: queueError } = await supabase
        .from('alert_queue')
        .insert(userAlerts.map(ua => ({
          user_id: ua.userId,
          alert_id: ua.alertId,
          channel: ua.channel,
          status: 'pending',
          created_at: new Date().toISOString()
        })));

      if (queueError) {
        console.error('Failed to queue alerts:', queueError);
      }

      // Trigger immediate email sending for urgent/immediate alerts
      if (alert.type === 'immediate' || alert.type === 'urgent') {
        // In production, this would trigger an email service
        console.log(`🚨 URGENT: Sending ${userAlerts.length} ${alert.type} alerts`);
        
        // Send emails in batches
        const emailBatch = userAlerts.filter(ua => ua.channel === 'email');
        const smsBatch = userAlerts.filter(ua => ua.channel === 'sms');

        // Log summary
        console.log(`📧 Email batch: ${emailBatch.length} recipients`);
        console.log(`📱 SMS batch: ${smsBatch.length} recipients`);
      }

      // Push to Alpha Hunter webhook if configured
      if (process.env.ALPHA_HUNTER_WEBHOOK_URL) {
        try {
          await fetch(process.env.ALPHA_HUNTER_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ticker: 'MO',
              signal: 'SHORT',
              reason: `Legislative Alert: ${alert.headline}`,
              confidence: 85,
              scope: alert.scope,
              state: alert.state,
              type: alert.type,
              created_at: new Date().toISOString(),
            }),
          });
          console.log('🔗 Sent Alpha Hunter webhook for Paul Revere alert');
        } catch (err: any) {
          console.error('Alpha Hunter webhook failed:', err?.message);
        }
      }
    }

    return NextResponse.json({
      success: true,
      alertId: savedAlert?.id,
      targetUsers: targetUsers.length,
      queued: userAlerts.length,
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
 * Get recent alerts and stats
 */
export async function GET(req: NextRequest) {
  try {
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

